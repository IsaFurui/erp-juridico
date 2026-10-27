import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../auth/enums/user-role.enum';
import {
    JwtPayload,
    TokenScope,
} from '../auth/interfaces/jwt-payload.interface';

const admin = (companyId: number): JwtPayload => ({
    scope: TokenScope.TENANT,
    sub: 1,
    login: 'admin',
    role: UserRole.ADMIN,
    companyId,
    companyName: 'Escritório',
});

const platform: JwtPayload = {
    scope: TokenScope.PLATFORM,
    sub: 1,
    login: 'root',
};

describe('UsersService — escopo de tenant', () => {
    const findUnique = jest.fn();
    const findMany = jest.fn();
    const update = jest.fn();
    const prisma = {
        user: { findUnique, findMany, update },
    } as unknown as PrismaService;

    const service = new UsersService(prisma);

    beforeEach(() => {
        findUnique.mockReset();
        findMany.mockReset().mockResolvedValue([]);
        update.mockReset().mockResolvedValue({ id: 99 });
    });

    describe('listByCompany', () => {
        it('usa a empresa do token do ADMIN', async () => {
            await service.listByCompany(admin(7));

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { companyId: 7 } }),
            );
        });

        it('recusa ADMIN pedindo outra empresa', () => {
            expect(() => service.listByCompany(admin(7), 8)).toThrow(
                ForbiddenException,
            );
            expect(findMany).not.toHaveBeenCalled();
        });

        it('aceita o ADMIN repetindo a própria empresa', async () => {
            await service.listByCompany(admin(7), 7);

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { companyId: 7 } }),
            );
        });

        // A plataforma não tem empresa própria: sem companyId não há default
        // razoável, e devolver tudo seria justamente o furo da Fase 0.
        it('exige companyId da plataforma', () => {
            expect(() => service.listByCompany(platform)).toThrow(
                BadRequestException,
            );
            expect(findMany).not.toHaveBeenCalled();
        });

        it('deixa a plataforma escolher qualquer empresa', async () => {
            await service.listByCompany(platform, 42);

            expect(findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { companyId: 42 } }),
            );
        });
    });

    describe('update', () => {
        it('edita usuário da própria empresa', async () => {
            findUnique.mockResolvedValue({ id: 99, companyId: 1 });

            await service.update(99, { name: 'Novo nome' }, admin(1));

            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 99 } }),
            );
        });

        it('não enxerga usuário de outra empresa', async () => {
            findUnique.mockResolvedValue({ id: 99, companyId: 2 });

            await expect(
                service.update(99, { name: 'Invadido' }, admin(1)),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(update).not.toHaveBeenCalled();
        });

        it('a plataforma atravessa o tenant', async () => {
            findUnique.mockResolvedValue({ id: 99, companyId: 2 });

            await service.update(99, { role: UserRole.ADMIN }, platform);

            expect(update).toHaveBeenCalled();
        });

        it('404 quando o usuário não existe', async () => {
            findUnique.mockResolvedValue(null);

            await expect(
                service.update(99, { name: 'Fantasma' }, platform),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('updateProfile', () => {
        it('grava nome e avatar no id dado (o do token)', async () => {
            await service.updateProfile(5, {
                name: 'Isabelle',
                avatarUrl: 'data:image/jpeg;base64,abc',
            });

            expect(update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 5 },
                    data: {
                        name: 'Isabelle',
                        avatarUrl: 'data:image/jpeg;base64,abc',
                    },
                }),
            );
        });

        it('avatar vazio remove a foto (null)', async () => {
            await service.updateProfile(5, { avatarUrl: '' });

            expect(update.mock.calls[0][0].data).toEqual({ avatarUrl: null });
        });
    });
});
