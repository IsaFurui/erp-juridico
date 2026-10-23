import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';

// Regressão do furo mais caro da Fase 0: listAll devolvia a carteira de
// clientes de todos os escritórios porque o where só filtrava `active`.
describe('ClientsService — escopo de tenant', () => {
    const findMany = jest.fn();
    const findUnique = jest.fn();
    const prisma = {
        client: { findMany, findUnique },
    } as unknown as PrismaService;

    const service = new ClientsService(prisma);

    beforeEach(() => {
        findMany.mockReset().mockResolvedValue([]);
        findUnique.mockReset();
    });

    it('filtra a listagem pela empresa recebida', async () => {
        await service.listAll(7);

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { companyId: 7, active: true },
            }),
        );
    });

    it('mantém a empresa no where mesmo com includeInactive', async () => {
        await service.listAll(7, true);

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { companyId: 7 } }),
        );
    });

    it('não encontra cliente de outra empresa pelo id', async () => {
        findUnique.mockResolvedValue(null);

        await expect(service.findById(1, 7)).rejects.toThrow(
            'Cliente não encontrado',
        );
        expect(findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 1, companyId: 7 } }),
        );
    });
});
