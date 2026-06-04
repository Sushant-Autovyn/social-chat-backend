import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEntity } from './entities/chat.entity';
import { MessageEntity } from './entities/message.entity';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { PresenceService } from './presence.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity]),
    UsersModule,
    AuthModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, PresenceService],
  exports: [ChatsService, ChatsGateway, PresenceService],
})
export class ChatsModule {}
