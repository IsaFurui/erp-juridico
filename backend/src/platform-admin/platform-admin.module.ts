import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformAdminService } from './platform-admin.service';

@Module({
    imports: [PrismaModule],
    providers: [PlatformAdminService],
    exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
