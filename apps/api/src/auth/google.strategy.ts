import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { appConfig, type AppConfig } from '../config/app-config.js';
import { UsersService } from '../users/users.service.js';
import type { UserDocument } from '../users/user.schema.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(appConfig.KEY) config: AppConfig,
    private readonly users: UsersService,
  ) {
    super({
      // passport-google-oauth20 refuses to construct without a client id; the
      // GoogleAuthGuard blocks requests with 501 when Google isn't configured.
      clientID: config.google.clientId || 'not-configured',
      clientSecret: config.google.clientSecret || 'not-configured',
      callbackURL: config.google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<UserDocument> {
    const email = profile.emails?.find((e) => e.verified)?.value ?? profile.emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('Google account has no email');
    return this.users.upsertOnLogin({
      email,
      name: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value,
      googleId: profile.id,
    });
  }
}
