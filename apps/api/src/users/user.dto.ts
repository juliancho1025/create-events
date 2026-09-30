import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../common/roles.js';
import type { UserDocument } from './user.schema.js';

export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiProperty({ enum: Role }) role: Role;

  static from(user: UserDocument): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
