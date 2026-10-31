import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Public } from '../common/decorators.js';
import { imageValidators, MAX_IMAGE_BYTES } from '../common/images.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import type { AuthUser } from '../common/roles.js';
import { UpdateProfileDto, UserDto } from './user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  async me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return UserDto.from(await this.users.findById(user.id));
  }

  @Put('me')
  @ApiOperation({ summary: 'Save the current user profile (needed before signing up for events)' })
  @ApiOkResponse({ type: UserDto })
  @ApiConflictResponse({ description: 'Username taken' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<UserDto> {
    return UserDto.from(await this.users.updateProfile(user.id, dto));
  }

  @Put('me/avatar')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  @ApiOperation({ summary: 'Upload a profile photo (JPEG, PNG, WebP or GIF, max 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } } },
  })
  @ApiOkResponse({ type: UserDto })
  async setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile(new ParseFilePipe({ validators: imageValidators })) image: Express.Multer.File,
  ): Promise<UserDto> {
    return UserDto.from(await this.users.setAvatar(user.id, image));
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remove the uploaded photo (falls back to the Google picture)' })
  @ApiOkResponse({ type: UserDto })
  async removeAvatar(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return UserDto.from(await this.users.removeAvatar(user.id));
  }

  /** Public so it works in <img src>, which can't send an Authorization header. */
  @Get(':id/avatar')
  @Public()
  @ApiProduces('image/*')
  async avatar(
    @Param('id', ParseObjectIdPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.users.avatar(id);
    // URLs are versioned (?v=), so the browser can cache forever.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(file.body, { type: file.contentType, length: file.contentLength });
  }
}
