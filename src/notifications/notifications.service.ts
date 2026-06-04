import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { ChatsGateway } from '../chats/chats.gateway';

export interface CreateNotificationInput {
  recipientId: number;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
    @Inject(forwardRef(() => ChatsGateway))
    private readonly gateway: ChatsGateway,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    const entity = this.repo.create({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
      read: false,
    });
    const saved = await this.repo.save(entity);
    this.gateway.emitToUser(input.recipientId, 'notification:new', saved);
    return saved;
  }

  async listForUser(
    userId: number,
    onlyUnread = false,
  ): Promise<NotificationEntity[]> {
    return this.repo.find({
      where: onlyUnread
        ? { recipientId: userId, read: false }
        : { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async countUnread(userId: number): Promise<number> {
    return this.repo.count({ where: { recipientId: userId, read: false } });
  }

  async markRead(userId: number, ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ read: true })
      .whereInIds(ids)
      .andWhere('recipientId = :userId', { userId })
      .execute();
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo.update(
      { recipientId: userId, read: false },
      { read: true },
    );
  }
}
