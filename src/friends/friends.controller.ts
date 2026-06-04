import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('requests')
  sendRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto.receiverId);
  }

  @Patch('requests/:id/accept')
  acceptRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.friendsService.acceptRequest(id, user.id);
  }

  @Patch('requests/:id/reject')
  rejectRequest(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.friendsService.rejectRequest(id, user.id);
  }

  @Get('requests/pending')
  listPending(@CurrentUser() user: AuthUser) {
    return this.friendsService.listPendingRequests(user.id);
  }

  @Get()
  listFriends(@CurrentUser() user: AuthUser) {
    return this.friendsService.listFriends(user.id);
  }
}
