import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessTypeService } from './process-type.service';
import { ProcessTypeController } from './process-type.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ProcessTypeController],
    providers: [ProcessTypeService],
    exports: [ProcessTypeService],
})
export class ProcessTypeModule {}
