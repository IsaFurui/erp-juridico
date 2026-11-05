import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DatajudSyncService, type SyncCandidate } from './datajud-sync.service';
import type {
    TribunalLookup,
    TribunalMovement,
    TribunalProvider,
} from './tribunal-provider';

function setup() {
    const processUpdate = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const logCreate = jest.fn().mockResolvedValue({});
    const prisma = {
        process: { update: processUpdate, findMany: jest.fn() },
        processMovement: { createMany },
        datajudSyncLog: { create: logCreate },
    } as unknown as PrismaService;

    const notifyCompany = jest.fn().mockResolvedValue(undefined);
    const notifications = {
        notifyCompany,
    } as unknown as NotificationsService;

    const config = { get: () => undefined } as unknown as ConfigService;

    const fetchMovements = jest.fn();
    const provider = { fetchMovements } as unknown as TribunalProvider;

    const service = new DatajudSyncService(
        prisma,
        notifications,
        config,
        provider,
    );
    return {
        service,
        processUpdate,
        createMany,
        logCreate,
        notifyCompany,
        fetchMovements,
    };
}

/** Lookup "encontrado" para o mock do provider. */
function found(movements: TribunalMovement[]): TribunalLookup {
    return {
        movements,
        metadata: {
            classe: 'Procedimento Comum',
            assuntos: ['Concessão'],
            orgaoJulgador: 'Vara X',
            grau: 'JE',
            tribunal: 'TRF1',
            sistema: 'PJe',
            ajuizadoEm: '2018-10-29T00:00:00.000Z',
        },
        method: 'POST',
        httpStatus: 200,
        rawResponse: { hits: { hits: [] } },
        durationMs: 10,
    };
}

const NOT_FOUND: TribunalLookup = {
    movements: null,
    metadata: null,
    method: 'POST',
    httpStatus: 200,
    rawResponse: { hits: { hits: [] } },
    durationMs: 10,
};

function candidate(over: Partial<SyncCandidate> = {}): SyncCandidate {
    return {
        id: 1,
        code: '1016649-39.2025.8.26.0554',
        companyId: 7,
        name: 'Processo X',
        datajudSyncStatus: 'SYNCED',
        datajudNotFoundStreak: 0,
        ...over,
    };
}

const MOV: TribunalMovement = {
    code: 26,
    name: 'Distribuição',
    court: 'Vara X',
    occurredAt: new Date('2024-01-01T00:00:00Z'),
    complements: null,
};

describe('DatajudSyncService', () => {
    it('importa movimentos, marca SYNCED e notifica quando há novo (não-primeira)', async () => {
        const {
            service,
            processUpdate,
            createMany,
            logCreate,
            notifyCompany,
            fetchMovements,
        } = setup();
        fetchMovements.mockResolvedValue(found([MOV]));
        createMany.mockResolvedValue({ count: 1 });

        await service.syncProcess(candidate({ datajudSyncStatus: 'SYNCED' }));

        expect(createMany).toHaveBeenCalledTimes(1);
        expect(processUpdate.mock.calls[0][0].data.datajudSyncStatus).toBe(
            'SYNCED',
        );
        expect(notifyCompany).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'PROCESS_MOVEMENT',
                companyId: 7,
                actorId: 0,
                processId: 1,
            }),
        );
        // Gravou o log de auditoria da consulta.
        expect(logCreate.mock.calls[0][0].data).toMatchObject({
            processId: 1,
            outcome: 'SYNCED',
            movementCount: 1,
            httpStatus: 200,
        });
    });

    it('na primeira sincronização importa sem notificar', async () => {
        const { service, notifyCompany, createMany, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(found([MOV]));
        createMany.mockResolvedValue({ count: 5 });

        await service.syncProcess(
            candidate({ datajudSyncStatus: 'NEVER_SYNCED' }),
        );

        expect(createMany).toHaveBeenCalledTimes(1);
        expect(notifyCompany).not.toHaveBeenCalled();
    });

    it('sem movimento novo (tudo duplicado) não notifica', async () => {
        const { service, notifyCompany, createMany, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(found([MOV]));
        createMany.mockResolvedValue({ count: 0 });

        await service.syncProcess(candidate({ datajudSyncStatus: 'SYNCED' }));

        expect(notifyCompany).not.toHaveBeenCalled();
    });

    it('não encontrado marca NOT_FOUND e incrementa o backoff', async () => {
        const { service, processUpdate, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(NOT_FOUND);

        await service.syncProcess(candidate({ datajudNotFoundStreak: 0 }));

        const data = processUpdate.mock.calls[0][0].data;
        expect(data.datajudSyncStatus).toBe('NOT_FOUND');
        expect(data.datajudNotFoundStreak).toBe(1);
        expect(data.datajudNextSyncAt).toBeInstanceOf(Date);
    });

    it('o backoff tem teto (não passa do tamanho da tabela de intervalos)', async () => {
        const { service, processUpdate, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(NOT_FOUND);

        // 5 intervalos (1h,6h,24h,72h,168h): streak 5 permanece 5.
        await service.syncProcess(candidate({ datajudNotFoundStreak: 5 }));

        expect(processUpdate.mock.calls[0][0].data.datajudNotFoundStreak).toBe(
            5,
        );
    });

    it('erro de rede/HTTP marca ERROR e loga o desfecho', async () => {
        const { service, processUpdate, logCreate, fetchMovements } = setup();
        fetchMovements.mockRejectedValue(new Error('boom'));

        await service.syncProcess(candidate());

        expect(processUpdate.mock.calls[0][0].data.datajudSyncStatus).toBe(
            'ERROR',
        );
        expect(logCreate.mock.calls[0][0].data).toMatchObject({
            outcome: 'ERROR',
            error: 'boom',
        });
    });

    it('não consulta o mesmo processo duas vezes ao mesmo tempo', async () => {
        const { service, fetchMovements } = setup();
        let resolve: (v: TribunalLookup) => void = () => {};
        fetchMovements.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            }),
        );

        const p1 = service.syncProcess(candidate());
        const p2 = service.syncProcess(candidate()); // mesmo id, em voo
        resolve(NOT_FOUND);
        await Promise.all([p1, p2]);

        expect(fetchMovements).toHaveBeenCalledTimes(1);
    });
});
