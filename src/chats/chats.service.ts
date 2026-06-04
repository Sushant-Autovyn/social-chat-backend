import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './entities/chat.entity';
import { MessageEntity } from './entities/message.entity';
import { UsersService } from '../users/users.service';
import { PaginatedResult, PaginationDto } from './dto/pagination.dto';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepo: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    private readonly usersService: UsersService,
  ) {}

  async createOrGetChat(
    currentUserId: number,
    otherUserId: number,
  ): Promise<ChatEntity> {
    if (currentUserId === otherUserId) {
      throw new BadRequestException('Cannot start a chat with yourself');
    }

    await this.usersService.findById(otherUserId);

    const [userAId, userBId] = this.normalizePair(currentUserId, otherUserId);

    const existing = await this.chatRepo.findOne({ where: { userAId, userBId } });
    if (existing) return existing;

    const userA = await this.usersService.findById(userAId);
    const userB = await this.usersService.findById(userBId);

    const chat = this.chatRepo.create({
      userAId,
      userBId,
      participants: [userA, userB],
    });
    return this.chatRepo.save(chat);
  }

  async listChatsForUser(userId: number): Promise<ChatEntity[]> {
    return this.chatRepo.find({
      where: [{ userAId: userId }, { userBId: userId }],
      order: { updatedAt: 'DESC' },
    });
  }

  async sendMessage(
    chatId: number,
    senderId: number,
    content: string,
  ): Promise<MessageEntity> {
    const chat = await this.getChatForUser(chatId, senderId);

    const message = this.messageRepo.create({
      chatId: chat.id,
      senderId,
      content,
    });
    const saved = await this.messageRepo.save(message);

    // Bump chat updatedAt so listings are sorted by latest activity.
    await this.chatRepo.update(chat.id, { updatedAt: new Date() });

    return saved;
  }

  async getChatHistory(
    chatId: number,
    userId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<MessageEntity>> {
    await this.getChatForUser(chatId, userId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [items, total] = await this.messageRepo.findAndCount({
      where: { chatId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  private async getChatForUser(
    chatId: number,
    userId: number,
  ): Promise<ChatEntity> {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.userAId !== userId && chat.userBId !== userId) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
    return chat;
  }

  private normalizePair(a: number, b: number): [number, number] {
    return a < b ? [a, b] : [b, a];
  }
}
