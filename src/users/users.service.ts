import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity/user.entity';
import { ChatEntity } from '../chats/entities/chat.entity';

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string | null;
  avatar?: string | null;
  provider?: string | null;
  providerId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const user = this.usersRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password ?? null,
      avatar: dto.avatar ?? null,
      provider: dto.provider ?? null,
      providerId: dto.providerId ?? null,
    });
    return this.usersRepository.save(user);
  }

  async linkProvider(
    user: UserEntity,
    provider: string,
    providerId: string,
    avatar?: string | null,
  ): Promise<UserEntity> {
    user.provider = provider;
    user.providerId = providerId;
    if (avatar && !user.avatar) user.avatar = avatar;
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findByIds(ids: number[]): Promise<UserEntity[]> {
    if (ids.length === 0) return [];
    return this.usersRepository.find({ where: { id: In(ids) } });
  }

  async updateProfile(
    id: number,
    patch: { fullName?: string; avatar?: string | null },
  ): Promise<UserEntity> {
    const user = await this.findById(id);
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.avatar !== undefined) user.avatar = patch.avatar;
    return this.usersRepository.save(user);
  }

  async deleteAccount(id: number): Promise<void> {
    await this.findById(id);
    await this.dataSource.transaction(async (manager) => {
      // 1:1 chats reference users via raw userAId/userBId columns (no FK), so
      // remove them explicitly. Their messages cascade via the chat FK.
      await manager
        .createQueryBuilder()
        .delete()
        .from(ChatEntity)
        .where('userAId = :id OR userBId = :id', { id })
        .execute();
      // All other tables that reference the user have onDelete: 'CASCADE',
      // including the chat_participants join table.
      await manager.delete(UserEntity, id);
    });
  }
}
