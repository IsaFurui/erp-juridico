import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatajudModule } from '../datajud/datajud.module';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';

@Module({
    imports: [PrismaModule, NotificationsModule, DatajudModule],
    controllers: [ProcessController],
    providers: [ProcessService],
    exports: [ProcessService],
})
export class ProcessModule {}
