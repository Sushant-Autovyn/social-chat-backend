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
import { UsersService } from './users.service';
import type { CreateUserDto } from './users.service';
import { UserEntity } from './entities/user.entity/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

interface UpdateProfileDto {
  fullName?: string;
  avatar?: string | null;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createUser(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.createUser(dto);
  }

  @Get()
  getAllUsers(): Promise<UserEntity[]> {
    return this.usersService.getAllUsers();
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    const { password: _p, ...safe } = updated as any;
    return safe;
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.findById(id);
  }

  @Get('by-email/:email')
  findByEmail(@Param('email') email: string): Promise<UserEntity | null> {
    return this.usersService.findByEmail(email);
  }
}
