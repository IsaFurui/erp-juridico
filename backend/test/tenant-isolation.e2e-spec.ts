import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';

/**
 * O teste que impede a classe de bug da Fase 0 de voltar:
 *
 * - um usuário logado na empresa A não lê nem escreve nada da empresa B;
 * - o administrador da plataforma administra todas, mas não tem empresa —
 *   e por isso é barrado nas rotas de dado de escritório.
 *
 * Precisa do Postgres de pé e do DATABASE_URL apontando para um banco de
 * teste já migrado:
 *
 *   docker compose up -d postgres
 *   npx prisma migrate deploy
 *   npm run test:e2e
 *
 * Os registros são criados direto pelo Prisma (as rotas de cadastro são
 * guardadas) com um sufixo único, e removidos no final.
 */
describe('Fronteira do tenant (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';
    const ROOT_LOGIN = `root.${suffix}`;

    const ids = {
        companyA: 0,
        companyB: 0,
        adminA: 0,
        adminB: 0,
        clientA: 0,
        clientB: 0,
        root: 0,
    };

    /** Tudo que o teste criou, para a limpeza no final. */
    const createdCompanies: number[] = [];

    let tokenA = '';
    let tokenB = '';
    let tokenRoot = '';

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
                login: `admin.${label.toLowerCase()}.${suffix}`,
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

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        // Mesmo pipe do main.ts — sem ele o DTO não barra campo desconhecido.
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

        const a = await createCompanyWithAdmin('A', '11');
        const b = await createCompanyWithAdmin('B', '22');

        ids.companyA = a.company.id;
        ids.companyB = b.company.id;
        ids.adminA = a.admin.id;
        ids.adminB = b.admin.id;
        ids.clientA = a.client.id;
        ids.clientB = b.client.id;

        const root = await prisma.platformAdmin.create({
            data: {
                name: 'Root de teste',
                login: ROOT_LOGIN,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
            },
        });
        ids.root = root.id;

        tokenA = await login(ids.companyA, a.admin.login);
        tokenB = await login(ids.companyB, b.admin.login);

        const rootRes = await request(server)
            .post('/auth/platform/login')
            .send({ login: ROOT_LOGIN, password: PASSWORD })
            .expect(200);
        tokenRoot = (rootRes.body as { access_token: string }).access_token;
    });

    afterAll(async () => {
        await prisma.client.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.user.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.company.deleteMany({
            where: { id: { in: createdCompanies } },
        });
        await prisma.platformAdmin.deleteMany({ where: { id: ids.root } });
        await app.close();
    });

    describe('clientes', () => {
        it('a listagem traz só a carteira da própria empresa', async () => {
            const res = await request(server)
                .get('/clients')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const body = res.body as { items: { id: number }[] };
            const visiveis = body.items.map((c) => c.id);

            expect(visiveis).toContain(ids.clientA);
            expect(visiveis).not.toContain(ids.clientB);
        });

        it('o token da empresa B também não enxerga a carteira de A', async () => {
            const res = await request(server)
                .get('/clients')
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(200);

            const body = res.body as { items: { id: number }[] };
            expect(body.items.map((c) => c.id)).not.toContain(ids.clientA);
        });

        it('cliente de outra empresa não é encontrado pelo id', () =>
            request(server)
                .get(`/clients/${ids.clientB}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(404));

        it('não dá para inativar cliente de outra empresa', () =>
            request(server)
                .patch(`/clients/${ids.clientB}/deactivate`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(404));

        // A plataforma não tem empresa: aqui ela não teria o que listar.
        it('a sessão da plataforma é barrada no dado de escritório', () =>
            request(server)
                .get('/clients')
                .set('Authorization', `Bearer ${tokenRoot}`)
                .expect(403));

        it('sem token não lista cliente nenhum', () =>
            request(server).get('/clients').expect(401));

        it('devolve o envelope paginado', async () => {
            const res = await request(server)
                .get('/clients?page=1&pageSize=1')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const body = res.body as {
                items: unknown[];
                total: number;
                page: number;
                pageSize: number;
                pages: number;
            };
            expect(body.page).toBe(1);
            expect(body.pageSize).toBe(1);
            expect(body.items.length).toBeLessThanOrEqual(1);
            expect(body.total).toBeGreaterThanOrEqual(1);
        });

        it('a busca não escapa da empresa', async () => {
            const res = await request(server)
                .get('/clients?search=Cliente')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const body = res.body as { items: { id: number }[] };
            expect(body.items.map((c) => c.id)).not.toContain(ids.clientB);
        });

        it('recusa pageSize acima do teto', () =>
            request(server)
                .get('/clients?pageSize=500')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(400));

        it('OPERACIONAL não lista inativos', async () => {
            const operacional = await prisma.user.create({
                data: {
                    name: 'Operacional A',
                    login: `op.a.${suffix}`,
                    passwordHash: await bcrypt.hash(PASSWORD, 4),
                    role: UserRole.OPERACIONAL,
                    companyId: ids.companyA,
                },
            });
            const token = await login(ids.companyA, operacional.login);

            await request(server)
                .get('/clients?includeInactive=true')
                .set('Authorization', `Bearer ${token}`)
                .expect(403);
        });
    });

    describe('usuários', () => {
        it('a listagem traz só os usuários da própria empresa', async () => {
            const res = await request(server)
                .get('/users')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const body = res.body as { id: number; companyId: number }[];

            expect(body.map((u) => u.id)).toContain(ids.adminA);
            expect(body.map((u) => u.id)).not.toContain(ids.adminB);
            expect(body.every((u) => u.companyId === ids.companyA)).toBe(true);
        });

        it('ADMIN não lê usuários de outra empresa pela query', () =>
            request(server)
                .get(`/users?companyId=${ids.companyB}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(403));

        it('não dá para editar usuário de outra empresa', () =>
            request(server)
                .patch(`/users/${ids.adminB}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Invadido' })
                .expect(404));

        it('não dá para criar usuário em outra empresa', () =>
            request(server)
                .post('/auth/register')
                .set('Authorization', `Bearer ${tokenA}`)
                .send({
                    name: 'Intruso',
                    login: `intruso.${suffix}`,
                    password: PASSWORD,
                    companyId: ids.companyB,
                })
                .expect(403));
    });

    describe('empresas', () => {
        it('exige autenticação', () =>
            request(server).get('/company').expect(401));

        it('não deixa cadastrar empresa sem token', () =>
            request(server)
                .post('/company')
                .send({ name: 'Pirata', cnpj: `99${suffix}` })
                .expect(401));

        it('ADMIN de escritório não lista as empresas do SaaS', () =>
            request(server)
                .get('/company')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(403));

        it('ADMIN não renomeia a empresa de outro escritório', () =>
            request(server)
                .patch(`/company/${ids.companyB}`)
                .set('Authorization', `Bearer ${tokenA}`)
                .send({ name: 'Tomado' })
                .expect(403));

        it('ADMIN não inativa nem a própria empresa', () =>
            request(server)
                .patch(`/company/${ids.companyA}/deactivate`)
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(403));
    });

    describe('administrador da plataforma', () => {
        it('lista as empresas do SaaS', async () => {
            const res = await request(server)
                .get('/company')
                .set('Authorization', `Bearer ${tokenRoot}`)
                .expect(200);

            const listadas = (res.body as { id: number }[]).map((c) => c.id);
            expect(listadas).toEqual(
                expect.arrayContaining([ids.companyA, ids.companyB]),
            );
        });

        it('lê os usuários de qualquer empresa informando companyId', async () => {
            const res = await request(server)
                .get(`/users?companyId=${ids.companyB}`)
                .set('Authorization', `Bearer ${tokenRoot}`)
                .expect(200);

            expect((res.body as { id: number }[]).map((u) => u.id)).toContain(
                ids.adminB,
            );
        });

        it('sem companyId não tem empresa padrão — 400', () =>
            request(server)
                .get('/users')
                .set('Authorization', `Bearer ${tokenRoot}`)
                .expect(400));

        it('cria o primeiro ADMIN de um escritório', async () => {
            const res = await request(server)
                .post('/auth/register')
                .set('Authorization', `Bearer ${tokenRoot}`)
                .send({
                    name: 'Admin novo',
                    login: `admin.novo.${suffix}`,
                    password: PASSWORD,
                    role: 'ADMIN',
                    companyId: ids.companyB,
                })
                .expect(201);

            expect((res.body as { companyId: number }).companyId).toBe(
                ids.companyB,
            );
        });

        it('não entra pelo login de escritório', () =>
            request(server)
                .post('/auth/login')
                .send({
                    companyId: ids.companyA,
                    login: ROOT_LOGIN,
                    password: PASSWORD,
                })
                .expect(401));

        it('não troca senha pela rota de usuário de escritório', () =>
            request(server)
                .patch('/users/me/password')
                .set('Authorization', `Bearer ${tokenRoot}`)
                .send({ currentPassword: PASSWORD, newPassword: 'outrasenha' })
                .expect(403));
    });

    describe('empresa inativa', () => {
        // Antes o botão "inativar empresa" só marcava uma flag: todo mundo
        // do escritório continuava entrando.
        it('bloqueia o login dos usuários depois de inativada', async () => {
            const company = await prisma.company.create({
                data: {
                    name: `Escritório C ${suffix}`,
                    cnpj: `33${suffix}`,
                    active: false,
                },
            });
            createdCompanies.push(company.id);

            const user = await prisma.user.create({
                data: {
                    name: 'Admin C',
                    login: `admin.c.${suffix}`,
                    passwordHash: await bcrypt.hash(PASSWORD, 4),
                    role: UserRole.ADMIN,
                    companyId: company.id,
                },
            });

            await request(server)
                .post('/auth/login')
                .send({
                    companyId: company.id,
                    login: user.login,
                    password: PASSWORD,
                })
                .expect(401);
        });
    });
});
