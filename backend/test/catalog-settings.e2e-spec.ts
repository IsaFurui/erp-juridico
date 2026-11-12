import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';

/**
 * Perfil (PATCH /users/me) e a trava dos catálogos: a escrita é só da
 * plataforma (root); o ADMIN de escritório lê, mas não escreve.
 * Precisa do Postgres de pé e migrado.
 */
describe('Configurações e catálogos (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';
    const createdCompanies: number[] = [];
    const createdTypes: number[] = [];
    let rootLogin = '';

    let tokenAdmin = '';
    let tokenRoot = '';

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
            data: { name: `Cat ${suffix}`, cnpj: `99${suffix}` },
        });
        createdCompanies.push(company.id);

        const adminLogin = `cat.admin.${suffix}`;
        await prisma.user.create({
            data: {
                name: 'Admin Cat',
                login: adminLogin,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
                role: UserRole.ADMIN,
                companyId: company.id,
            },
        });

        rootLogin = `cat.root.${suffix}`;
        await prisma.platformAdmin.create({
            data: {
                name: 'Root Cat',
                login: rootLogin,
                passwordHash: await bcrypt.hash(PASSWORD, 4),
            },
        });

        tokenAdmin = (
            await request(server)
                .post('/auth/login')
                .send({
                    companyId: company.id,
                    login: adminLogin,
                    password: PASSWORD,
                })
                .expect(200)
        ).body.access_token;

        tokenRoot = (
            await request(server)
                .post('/auth/platform/login')
                .send({ login: rootLogin, password: PASSWORD })
                .expect(200)
        ).body.access_token;
    });

    afterAll(async () => {
        await prisma.processSubtype.deleteMany({
            where: { processTypeId: { in: createdTypes } },
        });
        await prisma.processType.deleteMany({
            where: { id: { in: createdTypes } },
        });
        await prisma.user.deleteMany({
            where: { companyId: { in: createdCompanies } },
        });
        await prisma.company.deleteMany({
            where: { id: { in: createdCompanies } },
        });
        await prisma.platformAdmin.deleteMany({ where: { login: rootLogin } });
        await app.close();
    });

    it('o usuário edita o próprio nome em PATCH /users/me', async () => {
        await request(server)
            .patch('/users/me')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ name: 'Admin Renomeado' })
            .expect(200);

        const me = await request(server)
            .get('/users/me')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);
        expect(me.body.name).toBe('Admin Renomeado');
    });

    it('ADMIN de escritório lê o catálogo, mas não escreve', async () => {
        await request(server)
            .get('/process-type')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);

        await request(server)
            .post('/process-type')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ name: `Proibido ${suffix}` })
            .expect(403);
    });

    it('a plataforma cria tipo e faz o CRUD de subtipo', async () => {
        const type = await request(server)
            .post('/process-type')
            .set('Authorization', `Bearer ${tokenRoot}`)
            .send({ name: `Tipo Root ${suffix}` })
            .expect(201);
        const typeId = type.body.id as number;
        createdTypes.push(typeId);

        const sub = await request(server)
            .post(`/process-type/${typeId}/subtypes`)
            .set('Authorization', `Bearer ${tokenRoot}`)
            .send({ name: 'Rito ordinário' })
            .expect(201);
        const subId = sub.body.id as number;

        await request(server)
            .patch(`/process-type/${typeId}/subtypes/${subId}`)
            .set('Authorization', `Bearer ${tokenRoot}`)
            .send({ name: 'Rito sumário' })
            .expect(200);

        const list = await request(server)
            .get(`/process-type/${typeId}/subtypes`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);
        expect(
            list.body.some((s: { name: string }) => s.name === 'Rito sumário'),
        ).toBe(true);

        await request(server)
            .delete(`/process-type/${typeId}/subtypes/${subId}`)
            .set('Authorization', `Bearer ${tokenRoot}`)
            .expect(204);
    });

    it('a plataforma define e alterna o defaultConfidential do tipo', async () => {
        const created = await request(server)
            .post('/process-type')
            .set('Authorization', `Bearer ${tokenRoot}`)
            .send({ name: `Sigiloso ${suffix}`, defaultConfidential: true })
            .expect(201);
        const typeId = created.body.id as number;
        createdTypes.push(typeId);
        expect(created.body.defaultConfidential).toBe(true);

        await request(server)
            .patch(`/process-type/${typeId}`)
            .set('Authorization', `Bearer ${tokenRoot}`)
            .send({ defaultConfidential: false })
            .expect(200);

        const list = await request(server)
            .get('/process-type')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200);
        const row = (
            list.body as { id: number; defaultConfidential: boolean }[]
        ).find((t) => t.id === typeId);
        expect(row?.defaultConfidential).toBe(false);
    });
});
