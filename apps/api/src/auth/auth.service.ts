import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserDocument } from '../users/user.schema.js';
import { UserDto } from '../users/user.dto.js';
import type { AuthResponseDto } from './dto/auth.dto.js';
import type { JwtPayload } from './jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  issueToken(user: UserDocument): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: UserDto.from(user) };
  }
}
