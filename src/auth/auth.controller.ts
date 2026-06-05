import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    /* Passport redirects to Google */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthRedirect(req, res);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth(): void {
    /* Passport redirects to Facebook */
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthRedirect(req, res);
  }

  private handleOAuthRedirect(req: Request, res: Response): void {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
    const user = req.user as UserEntity | undefined;
    if (!user) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      return;
    }
    const token = this.authService.issueToken(user);
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  }
}
