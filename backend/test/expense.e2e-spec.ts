import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';

/**
 * Despesas ponta a ponta: isolamento por empresa e RBAC (só ADMIN e
 * FINANCEIRO; OPERACIONAL leva 403). Precisa do Postgres de pé e migrado.
 */
describe('Despesas (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';

    const createdCompanies: number[] = [];

    let tokenAdminA = '';
    let tokenFinanceiroA = '';
    let tokenOperacionalA = '';
    let tokenAdminB = '';
    let expenseA = 0;
    let expenseB = 0;

    async function createCompany(label: string, seq: string) {
        const company = await prisma.company.create({
            data: {
                name: `Escritório ${label} ${suffix}`,
                cnpj: `${seq}${suffix}`,
            },
        });
        createdCompanies.push(company.id);
        return company;
    }

    async function createUser(
        companyId: number,
        role: UserRole,
        tag: string,
    ) {
        const login = `exp.${tag}.${suffix}`;
        await prisma.user.create({
            data: {
                name: `User ${tag}`,
                login,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                role,
                companyId,
            },
        });
        return login;
    }

    async function login(companyId: number, userLogin: string) {
        const res = await request(server)
            .post('/auth/login')
            .send({ companyId, login: userLogin, password: PASSWORD })
            .expect(200);
        return (res.body as { access_token: string }).access_token;
    }

    async function createExpense(
        token: string,
        body: Record<string, unknown>,
    ) {
        const res = await request(server)
            .post('/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send(body)
            .expect(201);
        return (res.body as { id: number }).id;
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

        const a = await createCompany('EA', '66');
        const b = await createCompany('EB', '77');

        const adminA = await createUser(a.id, UserRole.ADMIN, 'adminA');
        const finA = await createUser(a.id, UserRole.FINANCEIRO, 'finA');
        const opA = await createUser(a.id, UserRole.OPERACIONAL, 'opA');
        const adminB = await createUser(b.id, UserRole.ADMIN, 'adminB');

        tokenAdminA = await login(a.id, adminA);
        tokenFinanceiroA = await login(a.id, finA);
        tokenOperacionalA = await login(a.id, opA);
        tokenAdminB = await login(b.id, adminB);

        expenseA = await createExpense(tokenAdminA, {
            name: `Aluguel ${suffix}`,
            amount: 3500,
            category: 'ALUGUEL',
            date: '2026-10-05',
        });
        expenseB = await createExpense(tokenAdminB, {
            name: `Contas ${suffix}`,
            amount: 800,
            category: 'CONTAS',
            date: '2026-10-06',
        });
    });

    afterAll(async () => {
        await prisma.expense.deleteMany({
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

    it('a lista traz só as despesas da própria empresa', async () => {
        const res = await request(server)
            .get('/expenses')
            .set('Authorization', `Bearer ${tokenAdminA}`)
            .expect(200);

        const ids = (res.body as { items: { id: number }[] }).items.map(
            (e) => e.id,
        );
        expect(ids).toContain(expenseA);
        expect(ids).not.toContain(expenseB);
    });

    it('despesa de outra empresa não é encontrada pelo id (404)', () =>
        request(server)
            .get(`/expenses/${expenseB}`)
            .set('Authorization', `Bearer ${tokenAdminA}`)
            .expect(404));

    it('FINANCEIRO também acessa o módulo', () =>
        request(server)
            .get('/expenses')
            .set('Authorization', `Bearer ${tokenFinanceiroA}`)
            .expect(200));

    it('OPERACIONAL leva 403 no financeiro', () =>
        request(server)
            .get('/expenses')
            .set('Authorization', `Bearer ${tokenOperacionalA}`)
            .expect(403));

    it('CRUD feliz: editar e excluir a própria despesa', async () => {
        await request(server)
            .patch(`/expenses/${expenseA}`)
            .set('Authorization', `Bearer ${tokenFinanceiroA}`)
            .send({ amount: 3600 })
            .expect(200);

        const temp = await createExpense(tokenAdminA, {
            name: `Temp ${suffix}`,
            amount: 10,
            category: 'OUTROS',
        });
        await request(server)
            .delete(`/expenses/${temp}`)
            .set('Authorization', `Bearer ${tokenAdminA}`)
            .expect(204);
        await request(server)
            .get(`/expenses/${temp}`)
            .set('Authorization', `Bearer ${tokenAdminA}`)
            .expect(404);
    });

    it('summary soma só as despesas da empresa', async () => {
        const res = await request(server)
            .get('/expenses/summary')
            .set('Authorization', `Bearer ${tokenAdminA}`)
            .expect(200);

        const body = res.body as {
            totalAmount: string;
            count: number;
            byCategory: { category: string; totalAmount: string }[];
        };
        // Só sobrou a despesa de aluguel (editada para 3600); a temp foi excluída.
        expect(Number(body.totalAmount)).toBe(3600);
        expect(body.count).toBe(1);
        expect(body.byCategory.some((c) => c.category === 'ALUGUEL')).toBe(true);
    });
});
