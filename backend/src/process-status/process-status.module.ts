import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessStatusService } from './process-status.service';
import { ProcessStatusController } from './process-status.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ProcessStatusController],
    providers: [ProcessStatusService],
    exports: [ProcessStatusService],
})
export class ProcessStatusModule {}
