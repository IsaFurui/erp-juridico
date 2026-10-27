import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcessService } from './process.service';
import { ProcessController } from './process.controller';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [ProcessController],
    providers: [ProcessService],
    exports: [ProcessService],
})
export class ProcessModule {}
