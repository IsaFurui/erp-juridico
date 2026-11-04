import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DatajudSyncService, type SyncCandidate } from './datajud-sync.service';
import type { TribunalMovement, TribunalProvider } from './tribunal-provider';

function setup() {
    const processUpdate = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
        process: { update: processUpdate, findMany: jest.fn() },
        processMovement: { createMany },
    } as unknown as PrismaService;

    const notifyCompany = jest.fn().mockResolvedValue(undefined);
    const notifications = {
        notifyCompany,
    } as unknown as NotificationsService;

    const config = { get: () => undefined } as unknown as ConfigService;

    const fetchMovements = jest.fn();
    const provider = { fetchMovements } as unknown as TribunalProvider;

    const service = new DatajudSyncService(
        prisma,
        notifications,
        config,
        provider,
    );
    return {
        service,
        processUpdate,
        createMany,
        notifyCompany,
        fetchMovements,
    };
}

function candidate(over: Partial<SyncCandidate> = {}): SyncCandidate {
    return {
        id: 1,
        code: '1016649-39.2025.8.26.0554',
        companyId: 7,
        name: 'Processo X',
        datajudSyncStatus: 'SYNCED',
        datajudNotFoundStreak: 0,
        ...over,
    };
}

const MOV: TribunalMovement = {
    code: 26,
    name: 'Distribuição',
    occurredAt: new Date('2024-01-01T00:00:00Z'),
    complements: null,
};

describe('DatajudSyncService', () => {
    it('importa movimentos, marca SYNCED e notifica quando há novo (não-primeira)', async () => {
        const {
            service,
            processUpdate,
            createMany,
            notifyCompany,
            fetchMovements,
        } = setup();
        fetchMovements.mockResolvedValue([MOV]);
        createMany.mockResolvedValue({ count: 1 });

        await service.syncProcess(candidate({ datajudSyncStatus: 'SYNCED' }));

        expect(createMany).toHaveBeenCalledTimes(1);
        expect(processUpdate.mock.calls[0][0].data.datajudSyncStatus).toBe(
            'SYNCED',
        );
        expect(notifyCompany).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'PROCESS_MOVEMENT',
                companyId: 7,
                actorId: 0,
                processId: 1,
            }),
        );
    });

    it('na primeira sincronização importa sem notificar', async () => {
        const { service, notifyCompany, createMany, fetchMovements } = setup();
        fetchMovements.mockResolvedValue([MOV]);
        createMany.mockResolvedValue({ count: 5 });

        await service.syncProcess(
            candidate({ datajudSyncStatus: 'NEVER_SYNCED' }),
        );

        expect(createMany).toHaveBeenCalledTimes(1);
        expect(notifyCompany).not.toHaveBeenCalled();
    });

    it('sem movimento novo (tudo duplicado) não notifica', async () => {
        const { service, notifyCompany, createMany, fetchMovements } = setup();
        fetchMovements.mockResolvedValue([MOV]);
        createMany.mockResolvedValue({ count: 0 });

        await service.syncProcess(candidate({ datajudSyncStatus: 'SYNCED' }));

        expect(notifyCompany).not.toHaveBeenCalled();
    });

    it('não encontrado marca NOT_FOUND e incrementa o backoff', async () => {
        const { service, processUpdate, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(null);

        await service.syncProcess(candidate({ datajudNotFoundStreak: 0 }));

        const data = processUpdate.mock.calls[0][0].data;
        expect(data.datajudSyncStatus).toBe('NOT_FOUND');
        expect(data.datajudNotFoundStreak).toBe(1);
        expect(data.datajudNextSyncAt).toBeInstanceOf(Date);
    });

    it('o backoff tem teto (não passa do tamanho da tabela de intervalos)', async () => {
        const { service, processUpdate, fetchMovements } = setup();
        fetchMovements.mockResolvedValue(null);

        // 5 intervalos (1h,6h,24h,72h,168h): streak 5 permanece 5.
        await service.syncProcess(candidate({ datajudNotFoundStreak: 5 }));

        expect(processUpdate.mock.calls[0][0].data.datajudNotFoundStreak).toBe(
            5,
        );
    });

    it('erro de rede/HTTP marca ERROR', async () => {
        const { service, processUpdate, fetchMovements } = setup();
        fetchMovements.mockRejectedValue(new Error('boom'));

        await service.syncProcess(candidate());

        expect(processUpdate.mock.calls[0][0].data.datajudSyncStatus).toBe(
            'ERROR',
        );
    });

    it('não consulta o mesmo processo duas vezes ao mesmo tempo', async () => {
        const { service, fetchMovements } = setup();
        let resolve: (v: TribunalMovement[] | null) => void = () => {};
        fetchMovements.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            }),
        );

        const p1 = service.syncProcess(candidate());
        const p2 = service.syncProcess(candidate()); // mesmo id, em voo
        resolve(null);
        await Promise.all([p1, p2]);

        expect(fetchMovements).toHaveBeenCalledTimes(1);
    });
});
