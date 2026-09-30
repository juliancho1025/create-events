import { Body, Controller, Get, Inject, NotFoundException, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators.js';
import { appConfig, type AppConfig } from '../config/app-config.js';
import type { UserDocument } from '../users/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto, DevLoginDto } from './dto/auth.dto.js';
import { GoogleAuthGuard } from './guards.js';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Which login methods are enabled' })
  providers() {
    return { google: !!this.config.google.clientId, dev: this.config.devLoginEnabled };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth (browser redirect)' })
  google() {
    // Passport redirects to Google; this body never runs.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback: redirects to the web app with a JWT' })
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const { accessToken } = this.auth.issueToken(req.user as UserDocument);
    // URL fragment (#) is never sent to servers or logged by proxies.
    res.redirect(`${this.config.webUrl}/auth/callback#token=${encodeURIComponent(accessToken)}`);
  }

  @Post('dev-login')
  @ApiOperation({ summary: 'DEV ONLY: log in as any email without Google' })
  @ApiOkResponse({ type: AuthResponseDto })
  async devLogin(@Body() dto: DevLoginDto): Promise<AuthResponseDto> {
    if (!this.config.devLoginEnabled) throw new NotFoundException();
    const user = await this.users.upsertOnLogin({ email: dto.email, name: dto.name });
    return this.auth.issueToken(user);
  }
}
