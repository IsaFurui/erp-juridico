import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatajudProvider } from './datajud.provider';
import { DatajudSyncService } from './datajud-sync.service';
import { TRIBUNAL_PROVIDER } from './tribunal-provider';

/**
 * Integração com o DataJud (API pública do CNJ). O `TribunalProvider` é
 * exposto pelo token — quem consome depende da interface, não da
 * implementação. O `DatajudSyncService` roda o job agendado (cron próprio, via
 * pacote `cron`) e atende o sync sob demanda. `ConfigService` já é global.
 */
@Module({
    imports: [PrismaModule, NotificationsModule],
    providers: [
        { provide: TRIBUNAL_PROVIDER, useClass: DatajudProvider },
        DatajudSyncService,
    ],
    exports: [TRIBUNAL_PROVIDER, DatajudSyncService],
})
export class DatajudModule {}
