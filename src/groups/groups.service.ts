import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GroupEntity } from './entities/group.entity';
import { GroupMemberEntity } from './entities/group-member.entity';
import { GroupMessageEntity } from './entities/group-message.entity';
import { GroupRole } from './enums/group-role.enum';
import { UsersService } from '../users/users.service';
import { PaginatedResult, PaginationDto } from '../chats/dto/pagination.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,
    @InjectRepository(GroupMemberEntity)
    private readonly memberRepo: Repository<GroupMemberEntity>,
    @InjectRepository(GroupMessageEntity)
    private readonly messageRepo: Repository<GroupMessageEntity>,
    private readonly usersService: UsersService,
  ) {}

  async createGroup(
    ownerId: number,
    name: string,
    memberIds: number[],
    description?: string,
    avatar?: string,
  ): Promise<GroupEntity> {
    const uniqueIds = Array.from(new Set(memberIds.filter((id) => id !== ownerId)));

    // Validate every member exists.
    if (uniqueIds.length > 0) {
      const found = await this.usersService.findByIds(uniqueIds);
      if (found.length !== uniqueIds.length) {
        throw new BadRequestException('One or more members do not exist');
      }
    }

    const group = this.groupRepo.create({
      name,
      description: description ?? null,
      avatar: avatar ?? null,
      ownerId,
      members: [
        { userId: ownerId, role: GroupRole.ADMIN },
        ...uniqueIds.map((userId) => ({ userId, role: GroupRole.MEMBER })),
      ] as GroupMemberEntity[],
    });

    return this.groupRepo.save(group);
  }

  async listGroupsForUser(userId: number): Promise<GroupEntity[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: { group: true },
    });
    return memberships.map((m) => m.group);
  }

  async getGroup(groupId: number, userId: number): Promise<GroupEntity> {
    await this.requireMembership(groupId, userId);
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: { members: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async addMembers(
    groupId: number,
    actorId: number,
    userIds: number[],
  ): Promise<GroupMemberEntity[]> {
    await this.requireAdmin(groupId, actorId);

    const existing = await this.memberRepo.find({
      where: { groupId, userId: In(userIds) },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toAdd = userIds.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) return [];

    const newMembers = toAdd.map((userId) =>
      this.memberRepo.create({
        groupId,
        userId,
        role: GroupRole.MEMBER,
      }),
    );
    return this.memberRepo.save(newMembers);
  }

  async removeMember(
    groupId: number,
    actorId: number,
    targetUserId: number,
  ): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    if (targetUserId === group.ownerId) {
      throw new BadRequestException('Cannot remove the group owner');
    }

    // Allow admins to remove others, or members to remove themselves.
    if (actorId !== targetUserId) {
      await this.requireAdmin(groupId, actorId);
    } else {
      await this.requireMembership(groupId, actorId);
    }

    const result = await this.memberRepo.delete({
      groupId,
      userId: targetUserId,
    });
    if (!result.affected) {
      throw new NotFoundException('Member not found in this group');
    }
  }

  async promoteToAdmin(
    groupId: number,
    actorId: number,
    targetUserId: number,
  ): Promise<GroupMemberEntity> {
    await this.requireAdmin(groupId, actorId);
    const member = await this.memberRepo.findOne({
      where: { groupId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');
    member.role = GroupRole.ADMIN;
    return this.memberRepo.save(member);
  }

  async sendMessage(
    groupId: number,
    senderId: number,
    content: string,
  ): Promise<GroupMessageEntity> {
    await this.requireMembership(groupId, senderId);
    const message = this.messageRepo.create({ groupId, senderId, content });
    const saved = await this.messageRepo.save(message);
    await this.groupRepo.update(groupId, { updatedAt: new Date() });
    return saved;
  }

  async getMessages(
    groupId: number,
    userId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<GroupMessageEntity>> {
    await this.requireMembership(groupId, userId);
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [items, total] = await this.messageRepo.findAndCount({
      where: { groupId },
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

  private async requireMembership(
    groupId: number,
    userId: number,
  ): Promise<GroupMemberEntity> {
    const member = await this.memberRepo.findOne({
      where: { groupId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return member;
  }

  private async requireAdmin(
    groupId: number,
    userId: number,
  ): Promise<GroupMemberEntity> {
    const member = await this.requireMembership(groupId, userId);
    if (member.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Admin permission required');
    }
    return member;
  }
}
