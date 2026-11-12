import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from './../generated/prisma/enums';

/**
 * Notificações ponta a ponta: criar/mudar status de processo gera notificação
 * para os outros usuários do escritório (não para o autor), com estado de lido
 * por pessoa. Precisa do Postgres de pé e migrado.
 */
describe('Notificações (e2e)', () => {
    let app: INestApplication<App>;
    let prisma: PrismaService;
    let server: App;

    const suffix = Date.now().toString().slice(-9);
    const PASSWORD = 'senha123';
    const createdCompanies: number[] = [];
    const createdProcesses: number[] = [];

    let tokenActor = '';
    let tokenRecipient = '';
    let statusFinal = 0;

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
            data: { name: `Notif ${suffix}`, cnpj: `11${suffix}` },
        });
        createdCompanies.push(company.id);

        async function user(role: UserRole, tag: string) {
            const login = `notif.${tag}.${suffix}`;
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

        const actorLogin = await user(UserRole.ADMIN, 'actor');
        const recipientLogin = await user(UserRole.OPERACIONAL, 'recip');
        tokenActor = await login(company.id, actorLogin);
        tokenRecipient = await login(company.id, recipientLogin);

        const client = await prisma.client.create({
            data: {
                name: 'Cliente Notif',
                cpfCnpj: `11${suffix}`,
                companyId: company.id,
            },
        });
        const statusNonFinal = await prisma.processStatus.findFirst({
            where: { isFinal: false },
        });
        const final = await prisma.processStatus.findFirst({
            where: { isFinal: true },
        });
        statusFinal = final!.id;
        const type = await prisma.processType.findFirst();

        // O actor cria e depois encerra: dois eventos → duas notificações para o recip.
        const proc = await request(server)
            .post('/processes')
            .set('Authorization', `Bearer ${tokenActor}`)
            .send({
                name: 'Processo Notif',
                code: `NOTIF-${suffix}`,
                clientId: client.id,
                typeId: type!.id,
                statusId: statusNonFinal!.id,
            })
            .expect(201);
        const processId = (proc.body as { id: number }).id;
        createdProcesses.push(processId);

        await request(server)
            .patch(`/processes/${processId}/status`)
            .set('Authorization', `Bearer ${tokenActor}`)
            .send({ statusId: statusFinal })
            .expect(200);
    });

    afterAll(async () => {
        await prisma.notification.deleteMany({
            where: { companyId: { in: createdCompanies } },
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

    it('o autor da ação NÃO recebe notificação', async () => {
        const res = await request(server)
            .get('/notifications')
            .set('Authorization', `Bearer ${tokenActor}`)
            .expect(200);
        expect((res.body as { unreadCount: number }).unreadCount).toBe(0);
    });

    it('o outro usuário recebe as duas notificações (criado + status)', async () => {
        const res = await request(server)
            .get('/notifications')
            .set('Authorization', `Bearer ${tokenRecipient}`)
            .expect(200);

        const body = res.body as {
            unreadCount: number;
            items: { id: number; type: string }[];
        };
        expect(body.unreadCount).toBe(2);
        const types = body.items.map((i) => i.type).sort();
        expect(types).toEqual(['PROCESS_CREATED', 'STATUS_CHANGED']);
    });

    it('marcar uma como lida reduz o contador', async () => {
        const first = (
            await request(server)
                .get('/notifications')
                .set('Authorization', `Bearer ${tokenRecipient}`)
                .expect(200)
        ).body.items[0].id as number;

        await request(server)
            .patch(`/notifications/${first}/read`)
            .set('Authorization', `Bearer ${tokenRecipient}`)
            .expect(204);

        const after = await request(server)
            .get('/notifications')
            .set('Authorization', `Bearer ${tokenRecipient}`)
            .expect(200);
        expect((after.body as { unreadCount: number }).unreadCount).toBe(1);
    });

    it('marcar todas como lidas zera o contador', async () => {
        await request(server)
            .patch('/notifications/read-all')
            .set('Authorization', `Bearer ${tokenRecipient}`)
            .expect(204);

        const res = await request(server)
            .get('/notifications')
            .set('Authorization', `Bearer ${tokenRecipient}`)
            .expect(200);
        expect((res.body as { unreadCount: number }).unreadCount).toBe(0);
    });
});
