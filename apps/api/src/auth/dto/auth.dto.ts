import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserDto } from '../../users/user.dto.js';

export class DevLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Ada Admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: UserDto }) user: UserDto;
}
