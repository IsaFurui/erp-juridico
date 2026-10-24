import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProcessStatusModule } from './process-status/process-status.module';
import { ProcessTypeModule } from './process-type/process-type.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { ProcessModule } from './process/process.module';
import { ExpenseModule } from './expense/expense.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        CompanyModule,
        AuthModule,
        UsersModule,
        ClientsModule,
        ProcessStatusModule,
        ProcessTypeModule,
        PlatformAdminModule,
        ProcessModule,
        ExpenseModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
