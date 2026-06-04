import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  AddMembersDto,
  CreateGroupDto,
  SendGroupMessageDto,
} from './dto/group.dto';
import { PaginationDto } from '../chats/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(
      user.id,
      dto.name,
      dto.memberIds,
      dto.description,
      dto.avatar,
    );
  }

  @Get()
  listGroups(@CurrentUser() user: AuthUser) {
    return this.groupsService.listGroupsForUser(user.id);
  }

  @Get(':id')
  getGroup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.getGroup(id, user.id);
  }

  @Post(':id/members')
  addMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMembersDto,
  ) {
    return this.groupsService.addMembers(id, user.id, dto.userIds);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.groupsService.removeMember(id, user.id, userId);
  }

  @Patch(':id/members/:userId/promote')
  promoteAdmin(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.groupsService.promoteToAdmin(id, user.id, userId);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendGroupMessageDto,
  ) {
    return this.groupsService.sendMessage(id, user.id, dto.content);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.groupsService.getMessages(id, user.id, pagination);
  }
}
