import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';

/**
 * Dashboard ponta a ponta: isolamento por empresa e o bloco financeiro
 * restrito (null para OPERACIONAL). Precisa do Postgres de pé e migrado.
 */
describe('Dashboard (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';
    const createdCompanies: number[] = [];
    const createdProcesses: number[] = [];

    let tokenAdmin = '';
    let tokenOperacional = '';

    async function login(companyId: number, userLogin: string) {
        const res = await request(server)
            .post('/auth/login')
            .send({ companyId, login: userLogin, password: PASSWORD })
            .expect(200);
        return (res.body as { access_token: string }).access_token;
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

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

        const company = await prisma.company.create({
            data: { name: `Dash ${suffix}`, cnpj: `88${suffix}` },
        });
        createdCompanies.push(company.id);

        async function user(role: UserRole, tag: string) {
            const login = `dash.${tag}.${suffix}`;
            await prisma.user.create({
                data: {
                    name: `User ${tag}`,
                    login,
                    passwordHash: await bcrypt.hash(PASSWORD, 4),
                    role,
                    companyId: company.id,
                },
            });
            return login;
        }

        const adminLogin = await user(UserRole.ADMIN, 'admin');
        const opLogin = await user(UserRole.OPERACIONAL, 'op');
        tokenAdmin = await login(company.id, adminLogin);
        tokenOperacional = await login(company.id, opLogin);

        const client = await prisma.client.create({
            data: { name: 'Cliente Dash', cpfCnpj: `88${suffix}`, companyId: company.id },
        });
        const status = await prisma.processStatus.findFirst({
            where: { isFinal: false },
        });
        const type = await prisma.processType.findFirst();

        // Um processo em aberto e uma despesa do mês, para os números não serem zero.
        const proc = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
                name: 'Processo Dash',
                code: `DASH-${suffix}`,
                clientId: client.id,
                typeId: type!.id,
                statusId: status!.id,
                fixedAmount: 1000,
                expectedAmount: 4000,
            })
            .expect(201);
        createdProcesses.push((proc.body as { id: number }).id);

        await request(server)
            .post('/expenses')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ name: 'Aluguel Dash', amount: 2500, category: 'ALUGUEL' })
            .expect(201);
    });

    afterAll(async () => {
        await prisma.processStatusHistory.deleteMany({
            where: { processId: { in: createdProcesses } },
        });
        await prisma.process.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.expense.deleteMany({
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

    it('ADMIN recebe os indicadores da própria empresa, com financeiro', async () => {
        const res = await request(server)
            .get('/dashboard')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);

        const body = res.body as {
            openProcesses: number;
            closedThisMonth: number;
            earnedThisMonth: string;
            amountInProgress: string;
            processesByStatus: { count: number }[];
            finance: { expensesThisMonth: string } | null;
        };
        expect(body.openProcesses).toBe(1);
        expect(Number(body.amountInProgress)).toBe(5000);
        // O processo segue em aberto: nada encerrado, nada ganho no mês.
        expect(body.closedThisMonth).toBe(0);
        expect(Number(body.earnedThisMonth)).toBe(0);
        expect(body.processesByStatus.length).toBeGreaterThanOrEqual(1);
        expect(body.finance).not.toBeNull();
        expect(Number(body.finance?.expensesThisMonth)).toBe(2500);
    });

    it('OPERACIONAL vê os indicadores, mas o financeiro vem null', async () => {
        const res = await request(server)
            .get('/dashboard')
            .set('Authorization', `Bearer ${tokenOperacional}`)
            .expect(200);

        const body = res.body as {
            openProcesses: number;
            finance: unknown;
        };
        expect(body.openProcesses).toBe(1);
        expect(body.finance).toBeNull();
    });
});
