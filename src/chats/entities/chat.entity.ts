import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity/user.entity';
import { MessageEntity } from './message.entity';

@Entity('chats')
@Index('IDX_chat_user_a_b', ['userAId', 'userBId'], { unique: true })
export class ChatEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Normalized pair (userAId < userBId) so we can enforce a unique 1:1 chat.
  @Column()
  userAId: number;

  @Column()
  userBId: number;

  @ManyToMany(() => UserEntity, { eager: true })
  @JoinTable({
    name: 'chat_participants',
    joinColumn: { name: 'chatId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  participants: UserEntity[];

  @OneToMany(() => MessageEntity, (message) => message.chat)
  messages: MessageEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
