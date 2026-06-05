import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity/user.entity';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  accessToken: string;
  user: Omit<UserEntity, 'password'>;
}

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  fullName: string;
  avatar: string | null;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const hashed = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.usersService.createUser({
      fullName: dto.fullName,
      email: dto.email,
      password: hashed,
      avatar: dto.avatar ?? null,
    });

    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResponse(user);
  }

  async validateOAuthUser(profile: OAuthProfile): Promise<UserEntity> {
    const existing = await this.usersService.findByEmail(profile.email);
    if (existing) {
      if (!existing.provider) {
        return this.usersService.linkProvider(
          existing,
          profile.provider,
          profile.providerId,
          profile.avatar,
        );
      }
      return existing;
    }
    return this.usersService.createUser({
      fullName: profile.fullName,
      email: profile.email,
      password: null,
      avatar: profile.avatar,
      provider: profile.provider,
      providerId: profile.providerId,
    });
  }

  issueToken(user: UserEntity): string {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  private buildResponse(user: UserEntity): AuthResponse {
    const accessToken = this.issueToken(user);
    const { password: _password, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }
}
