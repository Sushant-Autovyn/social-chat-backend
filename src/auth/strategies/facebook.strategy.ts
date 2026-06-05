import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-facebook';
import { AuthService, OAuthProfile } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = config.get<string>('FACEBOOK_CLIENT_ID');
    const clientSecret = config.get<string>('FACEBOOK_CLIENT_SECRET');
    const apiBase = config.get<string>('API_BASE_URL') ?? '';
    super({
      clientID: clientID ?? 'missing',
      clientSecret: clientSecret ?? 'missing',
      callbackURL: `${apiBase}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(
        new UnauthorizedException(
          'Facebook account did not return an email. Please grant email permission.',
        ),
        false,
      );
    }
    const oauthUser: OAuthProfile = {
      provider: 'facebook',
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
