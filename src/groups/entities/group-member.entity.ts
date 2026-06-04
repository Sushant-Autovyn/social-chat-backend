import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity/user.entity';
import { GroupEntity } from './group.entity';
import { GroupRole } from '../enums/group-role.enum';

@Entity('group_members')
@Unique('UQ_group_member', ['groupId', 'userId'])
export class GroupMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  groupId: number;

  @Index()
  @Column()
  userId: number;

  @ManyToOne(() => GroupEntity, (group) => group.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: GroupEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: GroupRole,
    default: GroupRole.MEMBER,
  })
  role: GroupRole;

  @CreateDateColumn()
  joinedAt: Date;
}
