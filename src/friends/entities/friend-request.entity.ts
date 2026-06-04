import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity/user.entity';
import { FriendRequestStatus } from '../enums/friend-request-status.enum';

@Entity('friend_requests')
@Unique('UQ_friend_request_pair', ['senderId', 'receiverId'])
export class FriendRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  senderId: number;

  @Index()
  @Column()
  receiverId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'receiverId' })
  receiver: UserEntity;

  @Column({
    type: 'enum',
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  status: FriendRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
