import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { onlyDigits } from './datajud-alias';
import {
    TRIBUNAL_PROVIDER,
    type TribunalLookup,
    type TribunalMovement,
    type TribunalProvider,
} from './tribunal-provider';
import type { Prisma } from '../../generated/prisma/client';

type SyncOutcome = 'SYNCED' | 'NOT_FOUND' | 'ERROR';

// Backoff crescente para processos não encontrados na base pública (recentes,
// ou em sigilo não marcado). Em horas, com teto de 7 dias.
const NOT_FOUND_BACKOFF_HOURS = [1, 6, 24, 72, 168];

const HOUR_MS = 3_600_000;

/** Campos que o sync precisa de um processo — serve o job e o sob-demanda. */
export interface SyncCandidate {
    id: number;
    code: string;
    companyId: number;
    name: string;
    datajudSyncStatus: string;
    datajudNotFoundStreak: number;
}

@Injectable()
export class DatajudSyncService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatajudSyncService.name);
    private job: CronJob | null = null;

    // Concorrência baixa: a API é lenta (~40s por consulta).
    private readonly maxConcurrency = 2;
    private permits = this.maxConcurrency;
    private readonly waiting: Array<() => void> = [];

    // Dedupe: o mesmo processo não é consultado duas vezes ao mesmo tempo
    // (ex.: clique manual enquanto o job já o pegou).
    private readonly inFlight = new Set<number>();
    // Trabalho de fundo em voo — para o shutdown/teste conseguir aguardar.
    private readonly pending = new Set<Promise<void>>();
    private cycleRunning = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly config: ConfigService,
        @Inject(TRIBUNAL_PROVIDER)
        private readonly provider: TribunalProvider,
    ) {}

    onModuleInit() {
        if (this.disabled()) {
            this.logger.log('Sync DataJud desligado (teste ou flag).');
            return;
        }
        const expr =
            this.config.get<string>('DATAJUD_SYNC_CRON') ?? '*/30 * * * *';
        // cron direto (CJS), sem @nestjs/schedule: o lifecycle do job é nosso.
        this.job = CronJob.from({
            cronTime: expr,
            onTick: () => void this.runCycle(),
            start: true,
        });
        this.logger.log(`Sync DataJud agendado: "${expr}".`);
    }

    onModuleDestroy() {
        void this.job?.stop();
    }

    private disabled(): boolean {
        return (
            process.env.NODE_ENV === 'test' ||
            this.config.get<string>('DATAJUD_SYNC_ENABLED') === 'false'
        );
    }

    /** Dispara a sincronização de um processo em segundo plano (não aguarda). */
    enqueue(process: SyncCandidate): void {
        const task = this.syncProcess(process);
        this.pending.add(task);
        void task.finally(() => this.pending.delete(task));
    }

    /** Aguarda o trabalho de fundo em voo (shutdown/teste). */
    async drain(): Promise<void> {
        await Promise.all([...this.pending]);
    }

    /** Um ciclo do job: pega um lote de processos vencidos e sincroniza. */
    async runCycle(): Promise<void> {
        if (this.cycleRunning) {
            this.logger.warn('Ciclo anterior ainda rodando; pulando este.');
            return;
        }
        this.cycleRunning = true;
        try {
            const candidates = await this.selectDue(
                this.num('DATAJUD_SYNC_BATCH', 20),
            );
            if (candidates.length === 0) return;
            this.logger.log(`Sincronizando ${candidates.length} processo(s).`);
            await Promise.all(candidates.map((c) => this.syncProcess(c)));
        } finally {
            this.cycleRunning = false;
        }
    }

    private selectDue(limit: number): Promise<SyncCandidate[]> {
        return this.prisma.process.findMany({
            where: {
                confidentiality: 'PUBLIC',
                datajudAlias: { not: null },
                OR: [
                    { datajudNextSyncAt: null },
                    { datajudNextSyncAt: { lte: new Date() } },
                ],
            },
            select: {
                id: true,
                code: true,
                companyId: true,
                name: true,
                datajudSyncStatus: true,
                datajudNotFoundStreak: true,
            },
            orderBy: { datajudNextSyncAt: { sort: 'asc', nulls: 'first' } },
            take: limit,
        });
    }

    /** Sincroniza um processo; nunca rejeita (erro vira status ERROR/log). */
    async syncProcess(process: SyncCandidate): Promise<void> {
        if (this.inFlight.has(process.id)) return; // já em andamento
        this.inFlight.add(process.id);
        try {
            await this.acquire();
            try {
                await this.doSync(process);
            } finally {
                this.release();
            }
        } catch (err) {
            this.logger.error(
                `Falha inesperada no sync do processo ${process.id}: ${msg(err)}`,
            );
        } finally {
            this.inFlight.delete(process.id);
        }
    }

    private async doSync(process: SyncCandidate): Promise<void> {
        const firstSync = process.datajudSyncStatus === 'NEVER_SYNCED';
        const started = Date.now();

        let lookup: TribunalLookup;
        try {
            lookup = await this.provider.fetchMovements(process.code);
        } catch (err) {
            // Rede/HTTP (incl. 401/403 já logado no provider): refaz no próximo
            // ciclo, sem backoff agressivo.
            this.logger.warn(
                `Erro consultando o DataJud p/ processo ${process.id}: ${msg(err)}`,
            );
            await this.prisma.process.update({
                where: { id: process.id },
                data: {
                    datajudSyncStatus: 'ERROR',
                    datajudNextSyncAt: new Date(),
                },
            });
            await this.writeLog(process, {
                outcome: 'ERROR',
                error: msg(err),
                durationMs: Date.now() - started,
            });
            return;
        }

        if (lookup.movements === null) {
            await this.markNotFound(process);
            await this.writeLog(process, {
                outcome: 'NOT_FOUND',
                httpStatus: lookup.httpStatus,
                method: lookup.method,
                durationMs: lookup.durationMs,
                response: lookup.rawResponse,
            });
            return;
        }

        const newCount = await this.saveMovements(process.id, lookup.movements);
        await this.markSynced(process.id);
        await this.writeLog(process, {
            outcome: 'SYNCED',
            httpStatus: lookup.httpStatus,
            method: lookup.method,
            durationMs: lookup.durationMs,
            movementCount: newCount,
            response: lookup.rawResponse,
        });

        // A primeira sincronização importa o histórico sem avisar; depois, só
        // movimento novo gera notificação para o escritório.
        if (!firstSync && newCount > 0) {
            await this.notifications.notifyCompany({
                companyId: process.companyId,
                actorId: 0, // evento do sistema: notifica todo o escritório
                type: 'PROCESS_MOVEMENT',
                message: `${process.name}: ${newCount} novo(s) andamento(s)`,
                processId: process.id,
            });
        }
    }

    /** Grava o log de auditoria da consulta. Nunca derruba o sync. */
    private async writeLog(
        process: SyncCandidate,
        fields: {
            outcome: SyncOutcome;
            httpStatus?: number;
            method?: string;
            durationMs?: number;
            movementCount?: number;
            response?: unknown;
            error?: string;
        },
    ): Promise<void> {
        try {
            await this.prisma.datajudSyncLog.create({
                data: {
                    processId: process.id,
                    outcome: fields.outcome,
                    httpStatus: fields.httpStatus ?? null,
                    method: fields.method ?? null,
                    durationMs: fields.durationMs ?? null,
                    movementCount: fields.movementCount ?? null,
                    request: { numeroProcesso: onlyDigits(process.code) },
                    response:
                        fields.response == null
                            ? undefined
                            : (fields.response as Prisma.InputJsonValue),
                    error: fields.error ?? null,
                },
            });
        } catch (err) {
            this.logger.warn(
                `Falha ao gravar log de sync do processo ${process.id}: ${msg(err)}`,
            );
        }
    }

    /** createMany + skipDuplicates: o nº inserido é exatamente o de novos. */
    private async saveMovements(
        processId: number,
        movements: TribunalMovement[],
    ): Promise<number> {
        if (movements.length === 0) return 0;
        const result = await this.prisma.processMovement.createMany({
            data: movements.map((m) => ({
                processId,
                code: m.code,
                name: m.name,
                occurredAt: m.occurredAt,
                complements:
                    m.complements == null
                        ? undefined
                        : (m.complements as Prisma.InputJsonValue),
            })),
            skipDuplicates: true,
        });
        return result.count;
    }

    private async markSynced(processId: number): Promise<void> {
        const next = new Date(
            Date.now() + this.num('DATAJUD_RESYNC_HOURS', 24) * HOUR_MS,
        );
        await this.prisma.process.update({
            where: { id: processId },
            data: {
                datajudSyncStatus: 'SYNCED',
                datajudSyncedAt: new Date(),
                datajudNextSyncAt: next,
                datajudNotFoundStreak: 0,
            },
        });
    }

    private async markNotFound(process: SyncCandidate): Promise<void> {
        const streak = Math.min(
            process.datajudNotFoundStreak + 1,
            NOT_FOUND_BACKOFF_HOURS.length,
        );
        const next = new Date(
            Date.now() + NOT_FOUND_BACKOFF_HOURS[streak - 1] * HOUR_MS,
        );
        await this.prisma.process.update({
            where: { id: process.id },
            data: {
                datajudSyncStatus: 'NOT_FOUND',
                datajudNextSyncAt: next,
                datajudNotFoundStreak: streak,
            },
        });
    }

    private num(key: string, fallback: number): number {
        const raw = this.config.get<string>(key);
        const parsed = raw != null ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    // ---- semáforo: no máximo `maxConcurrency` consultas simultâneas ----
    private async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        await new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    private release(): void {
        const next = this.waiting.shift();
        if (next)
            next(); // passa a vaga direto ao próximo (sem incrementar)
        else this.permits++;
    }
}

function msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}
