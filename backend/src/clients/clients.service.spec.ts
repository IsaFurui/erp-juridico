import { ForbiddenException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../auth/enums/user-role.enum';
import {
    TenantJwtPayload,
    TokenScope,
} from '../auth/interfaces/jwt-payload.interface';

const actor = (role: UserRole, companyId = 7): TenantJwtPayload => ({
    scope: TokenScope.TENANT,
    sub: 1,
    login: 'usuario',
    role,
    companyId,
    companyName: 'Escritório',
});

// Regressão do furo mais caro da Fase 0: listAll devolvia a carteira de
// clientes de todos os escritórios porque o where só filtrava `active`.
describe('ClientsService — escopo de tenant', () => {
    const findMany = jest.fn();
    const count = jest.fn();
    const findUnique = jest.fn();
    const $transaction = jest.fn();

    const prisma = {
        client: { findMany, count, findUnique },
        $transaction,
    } as unknown as PrismaService;

    const service = new ClientsService(prisma);

    /** O que foi passado para o findMany dentro do $transaction. */
    function findManyArgs() {
        return findMany.mock.calls[0][0] as {
            where: Record<string, unknown>;
            skip: number;
            take: number;
            orderBy: unknown;
        };
    }

    beforeEach(() => {
        findMany.mockReset().mockReturnValue('findMany');
        count.mockReset().mockReturnValue('count');
        findUnique.mockReset();
        // O service chama os dois dentro de um $transaction; aqui só
        // devolvemos o par [itens, total].
        $transaction.mockReset().mockResolvedValue([[], 0]);
    });

    describe('listAll', () => {
        it('filtra pela empresa do token', async () => {
            await service.listAll(actor(UserRole.OPERACIONAL), {});

            expect(findManyArgs().where).toEqual({
                companyId: 7,
                active: true,
            });
        });

        it('mantém a empresa no where com includeInactive', async () => {
            await service.listAll(actor(UserRole.ADMIN), {
                includeInactive: true,
            });

            expect(findManyArgs().where).toEqual({ companyId: 7 });
        });

        it('só ADMIN lista inativos', async () => {
            await expect(
                service.listAll(actor(UserRole.OPERACIONAL), {
                    includeInactive: true,
                }),
            ).rejects.toBeInstanceOf(ForbiddenException);
            expect($transaction).not.toHaveBeenCalled();
        });

        it('aplica os defaults de paginação', async () => {
            await service.listAll(actor(UserRole.ADMIN), {});

            expect(findManyArgs().skip).toBe(0);
            expect(findManyArgs().take).toBe(20);
        });

        it('calcula o skip a partir da página', async () => {
            await service.listAll(actor(UserRole.ADMIN), {
                page: 3,
                pageSize: 15,
            });

            expect(findManyArgs().skip).toBe(30);
            expect(findManyArgs().take).toBe(15);
        });

        it('devolve o envelope com o total de páginas', async () => {
            $transaction.mockResolvedValue([[{ id: 1 }], 42]);

            const result = await service.listAll(actor(UserRole.ADMIN), {
                pageSize: 20,
            });

            expect(result).toEqual({
                items: [{ id: 1 }],
                total: 42,
                page: 1,
                pageSize: 20,
                pages: 3,
            });
        });

        it('lista vazia ainda tem uma página', async () => {
            $transaction.mockResolvedValue([[], 0]);

            const result = await service.listAll(actor(UserRole.ADMIN), {});

            expect(result.pages).toBe(1);
        });

        it('busca por nome e por documento, sem perder o tenant', async () => {
            await service.listAll(actor(UserRole.ADMIN), {
                search: '12.345',
            });

            const where = findManyArgs().where;
            expect(where.companyId).toBe(7);
            expect(where.OR).toEqual([
                { name: { contains: '12.345', mode: 'insensitive' } },
                // o documento é gravado só com dígitos
                { cpfCnpj: { contains: '12345' } },
            ]);
        });

        it('busca só por nome quando o termo não tem dígito', async () => {
            await service.listAll(actor(UserRole.ADMIN), { search: 'maria' });

            expect(findManyArgs().where.OR).toEqual([
                { name: { contains: 'maria', mode: 'insensitive' } },
            ]);
        });

        it('termo em branco não vira filtro', async () => {
            await service.listAll(actor(UserRole.ADMIN), { search: '   ' });

            expect(findManyArgs().where.OR).toBeUndefined();
        });
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
