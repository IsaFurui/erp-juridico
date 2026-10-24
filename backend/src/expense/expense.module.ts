import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ExpenseController],
    providers: [ExpenseService],
    exports: [ExpenseService],
})
export class ExpenseModule {}
