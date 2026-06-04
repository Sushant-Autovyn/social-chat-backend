import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  createChat(@CurrentUser() user: AuthUser, @Body() dto: CreateChatDto) {
    return this.chatsService.createOrGetChat(user.id, dto.participantId);
  }

  @Get()
  listChats(@CurrentUser() user: AuthUser) {
    return this.chatsService.listChatsForUser(user.id);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) chatId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(chatId, user.id, dto.content);
  }

  @Get(':id/messages')
  getHistory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) chatId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatsService.getChatHistory(chatId, user.id, pagination);
  }
}
