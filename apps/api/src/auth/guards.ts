import {
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotImplementedException,
  type CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators.js';
import type { AuthUser, Role } from '../common/roles.js';
import { appConfig, type AppConfig } from '../config/app-config.js';

/** Registered globally: every route requires a valid JWT unless marked @Public(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
}

/** Registered globally: enforces @Roles(...) when present. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(@Inject(appConfig.KEY) private readonly config: AppConfig) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.google.clientId) {
      throw new NotImplementedException('Google login is not configured (set GOOGLE_CLIENT_ID)');
    }
    return super.canActivate(context);
  }
}
