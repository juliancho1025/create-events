import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { appConfig, type AppConfig } from '../config/app-config.js';
import type { AuthUser, Role } from '../common/roles.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/** Validates `Authorization: Bearer <jwt>`, like a Spring Security JWT filter. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(appConfig.KEY) config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
