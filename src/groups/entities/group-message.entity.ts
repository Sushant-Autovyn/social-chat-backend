import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity/user.entity';
import { GroupEntity } from './group.entity';

@Entity('group_messages')
export class GroupMessageEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  groupId: number;

  @ManyToOne(() => GroupEntity, (group) => group.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: GroupEntity;

  @Index()
  @Column()
  senderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
