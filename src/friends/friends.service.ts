import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { FriendRequestEntity } from './entities/friend-request.entity';
import { FriendRequestStatus } from './enums/friend-request-status.enum';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRequestEntity)
    private readonly friendRequestRepo: Repository<FriendRequestEntity>,
    private readonly usersService: UsersService,
  ) {}

  async sendRequest(
    senderId: number,
    receiverId: number,
  ): Promise<FriendRequestEntity> {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a request to yourself');
    }

    await this.usersService.findById(receiverId);

    const existing = await this.friendRequestRepo
      .createQueryBuilder('fr')
      .where(
        new Brackets((qb) =>
          qb
            .where('fr.senderId = :a AND fr.receiverId = :b', {
              a: senderId,
              b: receiverId,
            })
            .orWhere('fr.senderId = :b AND fr.receiverId = :a', {
              a: senderId,
              b: receiverId,
            }),
        ),
      )
      .getOne();

    if (existing) {
      if (existing.status === FriendRequestStatus.ACCEPTED) {
        throw new ConflictException('You are already friends');
      }
      if (existing.status === FriendRequestStatus.PENDING) {
        throw new ConflictException('A pending request already exists');
      }
    }

    const request = this.friendRequestRepo.create({
      senderId,
      receiverId,
      status: FriendRequestStatus.PENDING,
    });
    return this.friendRequestRepo.save(request);
  }

  async acceptRequest(
    requestId: number,
    userId: number,
  ): Promise<FriendRequestEntity> {
    const request = await this.getReceivedRequest(requestId, userId);
    request.status = FriendRequestStatus.ACCEPTED;
    return this.friendRequestRepo.save(request);
  }

  async rejectRequest(
    requestId: number,
    userId: number,
  ): Promise<FriendRequestEntity> {
    const request = await this.getReceivedRequest(requestId, userId);
    request.status = FriendRequestStatus.REJECTED;
    return this.friendRequestRepo.save(request);
  }

  async listFriends(userId: number): Promise<UserEntity[]> {
    const accepted = await this.friendRequestRepo.find({
      where: [
        { senderId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED },
      ],
    });

    return accepted.map((req) =>
      req.senderId === userId ? req.receiver : req.sender,
    );
  }

  async listPendingRequests(userId: number): Promise<FriendRequestEntity[]> {
    return this.friendRequestRepo.find({
      where: { receiverId: userId, status: FriendRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  private async getReceivedRequest(
    requestId: number,
    userId: number,
  ): Promise<FriendRequestEntity> {
    const request = await this.friendRequestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    if (request.receiverId !== userId) {
      throw new BadRequestException(
        'Only the receiver can respond to this request',
      );
    }
    if (request.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('Request has already been handled');
    }
    return request;
  }
}
