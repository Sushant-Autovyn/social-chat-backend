import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthService, OAuthProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET');
    const apiBase = config.get<string>('API_BASE_URL') ?? '';
    super({
      clientID: clientID ?? 'missing',
      clientSecret: clientSecret ?? 'missing',
      callbackURL: `${apiBase}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new UnauthorizedException('Google account has no email'), false);
    }
    const oauthUser: OAuthProfile = {
      provider: 'google',
      providerId: profile.id,
      email,
      fullName: profile.displayName || email.split('@')[0],
      avatar: profile.photos?.[0]?.value ?? null,
    };
    try {
      const user = await this.authService.validateOAuthUser(oauthUser);
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
