import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
    const userFindMany = jest.fn();
    const createMany = jest.fn();
    const updateMany = jest.fn();
    const findMany = jest.fn();
    const count = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        user: { findMany: userFindMany },
        notification: { createMany, updateMany, findMany, count },
        $transaction,
    } as unknown as PrismaService;

    const service = new NotificationsService(prisma);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('notifyCompany', () => {
        it('cria uma notificação por destinatário, excluindo o autor', async () => {
            userFindMany.mockResolvedValue([{ id: 2 }, { id: 3 }]);

            await service.notifyCompany({
                companyId: 7,
                actorId: 1,
                type: 'PROCESS_CREATED',
                message: 'Novo processo: X',
                processId: 99,
            });

            // O autor sai pela consulta de destinatários.
            expect(userFindMany.mock.calls[0][0].where).toEqual({
                companyId: 7,
                id: { not: 1 },
            });
            const data = createMany.mock.calls[0][0].data;
            expect(data).toHaveLength(2);
            expect(data.map((d: { userId: number }) => d.userId)).toEqual([2, 3]);
            expect(data[0]).toMatchObject({
                companyId: 7,
                type: 'PROCESS_CREATED',
                processId: 99,
            });
        });

        it('não cria nada quando o autor é o único do escritório', async () => {
            userFindMany.mockResolvedValue([]);

            await service.notifyCompany({
                companyId: 7,
                actorId: 1,
                type: 'STATUS_CHANGED',
                message: 'x → y',
            });

            expect(createMany).not.toHaveBeenCalled();
        });
    });

    describe('markRead', () => {
        it('escopa pelo usuário dono (ninguém marca a do outro)', async () => {
            await service.markRead(5, 2);

            expect(updateMany).toHaveBeenCalledWith({
                where: { id: 5, userId: 2 },
                data: { read: true },
            });
        });
    });

    describe('listForUser', () => {
        it('devolve itens + contador de não-lidas', async () => {
            $transaction.mockResolvedValue([[{ id: 1 }], 3]);

            const result = await service.listForUser(2);

            expect(result).toEqual({ items: [{ id: 1 }], unreadCount: 3 });
        });
    });
});
