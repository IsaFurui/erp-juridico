import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';
import { TRIBUNAL_PROVIDER } from './../src/datajud/tribunal-provider';
import { DatajudSyncService } from './../src/datajud/datajud-sync.service';

/**
 * Processos ponta a ponta: isolamento por empresa, histórico de status e a
 * regra do Total (derivado enquanto não encerra, manual ao encerrar).
 *
 * Precisa do Postgres de pé e migrado (ver tenant-isolation.e2e-spec.ts).
 * Usa o catálogo de status/tipos do seed.
 */
describe('Processos (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;
    let datajudSync: DatajudSyncService;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';

    const createdCompanies: number[] = [];
    const createdProcesses: number[] = [];

    let tokenA = '';
    let clientA = 0;
    let clientB = 0;
    let typeId = 0;
    let statusNonFinal = 0;
    let statusFinal = 0;
    let processA = 0;
    let processB = 0;

    async function createCompanyWithAdmin(label: string, seq: string) {
        const company = await prisma.company.create({
            data: {
                name: `Escritório ${label} ${suffix}`,
                cnpj: `${seq}${suffix}`,
            },
        });
        createdCompanies.push(company.id);

        const admin = await prisma.user.create({
            data: {
                name: `Admin ${label}`,
                login: `proc.admin.${label.toLowerCase()}.${suffix}`,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                role: UserRole.ADMIN,
                companyId: company.id,
            },
        });

        const client = await prisma.client.create({
            data: {
                name: `Cliente ${label}`,
                cpfCnpj: `${seq}${suffix}`,
                companyId: company.id,
            },
        });

        return { company, admin, client };
    }

    async function login(companyId: number, userLogin: string) {
        const res = await request(server)
            .post('/auth/login')
            .send({ companyId, login: userLogin, password: PASSWORD })
            .expect(200);
        return (res.body as { access_token: string }).access_token;
    }

    async function createProcess(token: string, clientId: number, n: string) {
        const res = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: `Processo ${n}`,
                code: `CNJ-${n}-${suffix}`,
                clientId,
                typeId,
                statusId: statusNonFinal,
                fixedAmount: 3000,
                expectedAmount: 25000,
            })
            .expect(201);
        const id = (res.body as { id: number }).id;
        createdProcesses.push(id);
        return id;
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            // Sem rede real no teste: o provider devolve "não encontrado".
            .overrideProvider(TRIBUNAL_PROVIDER)
            .useValue({
                fetchMovements: () =>
                    Promise.resolve({
                        movements: null,
                        metadata: null,
                        method: 'NONE',
                        httpStatus: 0,
                        rawResponse: null,
                        durationMs: 0,
                    }),
            })
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();

        prisma = app.get(PrismaService);
        server = app.getHttpServer();
        datajudSync = app.get(DatajudSyncService);

        const a = await createCompanyWithAdmin('PA', '44');
        const b = await createCompanyWithAdmin('PB', '55');
        clientA = a.client.id;
        clientB = b.client.id;

        tokenA = await login(a.company.id, a.admin.login);
        const tokenB = await login(b.company.id, b.admin.login);

        // Catálogo vindo do seed.
        const statuses = (
            await request(server)
                .get('/process-status')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200)
        ).body as { id: number; isFinal: boolean }[];
        statusNonFinal = statuses.find((s) => !s.isFinal)!.id;
        statusFinal = statuses.find((s) => s.isFinal)!.id;

        const types = (
            await request(server)
                .get('/process-type')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200)
        ).body as { id: number }[];
        typeId = types[0].id;

        processA = await createProcess(tokenA, clientA, 'A');
        processB = await createProcess(tokenB, clientB, 'B');
    });

    afterAll(async () => {
        // Espera o sync disparado em segundo plano terminar antes de apagar.
        await datajudSync.drain();
        await prisma.datajudSyncLog.deleteMany({
            where: { processId: { in: createdProcesses } },
        });
        await prisma.processMovement.deleteMany({
            where: { processId: { in: createdProcesses } },
        });
        await prisma.processStatusHistory.deleteMany({
            where: { processId: { in: createdProcesses } },
        });
        await prisma.process.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.client.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.user.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.company.deleteMany({
            where: { id: { in: createdCompanies } },
        });
        await app.close();
    });

    it('a lista traz só os processos da própria empresa', async () => {
        const res = await request(server)
            .get('/processes')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        const ids = (res.body as { items: { id: number }[] }).items.map(
            (p) => p.id,
        );
        expect(ids).toContain(processA);
        expect(ids).not.toContain(processB);
    });

    it('processo de outra empresa não é encontrado pelo id', () =>
        request(server)
            .get(`/processes/${processB}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(404));

    it('na criação o Total é derivado e o histórico ganha a primeira linha', async () => {
        const res = await request(server)
            .get(`/processes/${processA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        const body = res.body as {
            totalAmount: string;
            statusHistory: { note: string | null }[];
        };
        expect(Number(body.totalAmount)).toBe(28000);
        expect(body.statusHistory.length).toBeGreaterThanOrEqual(1);
        expect(
            body.statusHistory.some((h) => h.note === 'Processo criado'),
        ).toBe(true);
    });

    it('ao encerrar, aceita o Total final e registra o histórico', async () => {
        await request(server)
            .patch(`/processes/${processA}/status`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ statusId: statusFinal, totalAmount: 22500 })
            .expect(200);

        const res = await request(server)
            .get(`/processes/${processA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        const body = res.body as {
            totalAmount: string;
            status: { isFinal: boolean };
            statusHistory: unknown[];
        };
        expect(body.status.isFinal).toBe(true);
        expect(Number(body.totalAmount)).toBe(22500);
        expect(body.statusHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('ao reabrir num status não-final, o Total volta a ser derivado', async () => {
        await request(server)
            .patch(`/processes/${processA}/status`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ statusId: statusNonFinal })
            .expect(200);

        const res = await request(server)
            .get(`/processes/${processA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);

        const body = res.body as { totalAmount: string };
        expect(Number(body.totalAmount)).toBe(28000);
    });

    it('nasce PUBLIC quando o tipo do seed não é sigiloso e a API não envia', async () => {
        const res = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Processo público',
                code: `CNJ-PUB-${suffix}`,
                clientId: clientA,
                typeId,
                statusId: statusNonFinal,
            })
            .expect(201);
        createdProcesses.push((res.body as { id: number }).id);
        expect((res.body as { confidentiality: string }).confidentiality).toBe(
            'PUBLIC',
        );
    });

    it('aceita confidentiality explícito na criação', async () => {
        const res = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Processo sigiloso',
                code: `CNJ-SIG-${suffix}`,
                clientId: clientA,
                typeId,
                statusId: statusNonFinal,
                confidentiality: 'CONFIDENTIAL',
            })
            .expect(201);
        createdProcesses.push((res.body as { id: number }).id);
        expect((res.body as { confidentiality: string }).confidentiality).toBe(
            'CONFIDENTIAL',
        );
    });

    it('o advogado marca/desmarca o sigilo pela edição', async () => {
        await request(server)
            .patch(`/processes/${processA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ confidentiality: 'CONFIDENTIAL' })
            .expect(200);

        const res = await request(server)
            .get(`/processes/${processA}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);
        expect((res.body as { confidentiality: string }).confidentiality).toBe(
            'CONFIDENTIAL',
        );
    });

    it('dispara a sincronização sob demanda (202) em processo público', async () => {
        const id = await createProcess(tokenA, clientA, 'SYNC');
        await request(server)
            .post(`/processes/${id}/sync`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(202);
    });

    it('recusa sincronizar processo sigiloso (409)', async () => {
        const res = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Sigiloso p/ sync',
                code: `CNJ-SIGSYNC-${suffix}`,
                clientId: clientA,
                typeId,
                statusId: statusNonFinal,
                confidentiality: 'CONFIDENTIAL',
            })
            .expect(201);
        const id = (res.body as { id: number }).id;
        createdProcesses.push(id);

        await request(server)
            .post(`/processes/${id}/sync`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(409);
    });

    it('não sincroniza processo de outra empresa (404)', () =>
        request(server)
            .post(`/processes/${processB}/sync`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(404));
});
