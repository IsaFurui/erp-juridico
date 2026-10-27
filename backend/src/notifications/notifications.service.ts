import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'PROCESS_CREATED' | 'STATUS_CHANGED';

interface NotifyInput {
    companyId: number;
    /** Quem fez a ação — não recebe a própria notificação. */
    actorId: number;
    type: NotificationType;
    message: string;
    processId?: number;
}

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Uma notificação por usuário do escritório, exceto o autor da ação. */
    async notifyCompany(input: NotifyInput) {
        const recipients = await this.prisma.user.findMany({
            where: { companyId: input.companyId, id: { not: input.actorId } },
            select: { id: true },
        });
        if (recipients.length === 0) return;

        await this.prisma.notification.createMany({
            data: recipients.map((r) => ({
                userId: r.id,
                companyId: input.companyId,
                type: input.type,
                message: input.message,
                processId: input.processId ?? null,
            })),
        });
    }

    async listForUser(userId: number) {
        const [items, unreadCount] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            this.prisma.notification.count({ where: { userId, read: false } }),
        ]);
        return { items, unreadCount };
    }

    /** `userId` no where garante que ninguém marca notificação alheia. */
    async markRead(id: number, userId: number) {
        await this.prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
    }

    async markAllRead(userId: number) {
        await this.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }
}
