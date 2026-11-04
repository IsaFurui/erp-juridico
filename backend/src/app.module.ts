import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DatajudModule } from './datajud/datajud.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        // Rate-limit padrão (generoso); os logins têm um teto próprio e menor.
        // Desligado nos testes (Jest seta NODE_ENV=test).
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60000, limit: 120 }],
            skipIf: () => process.env.NODE_ENV === 'test',
        }),
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
        DashboardModule,
        NotificationsModule,
        DatajudModule,
    ],
    controllers: [AppController],
    providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
