import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseEnumPipe,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Public, Roles } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { Role, type AuthUser } from '../common/roles.js';
import { CreateEventDto, EventDto, UpdateEventDto } from './dto/event.dto.js';
import { EventsService, type EventScope } from './events.service.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;

const imageValidators = [
  new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES, message: 'Image must be 5 MB or smaller' }),
  // Checks the file's magic bytes, not just the client-supplied Content-Type.
  new FileTypeValidator({ fileType: IMAGE_TYPES }),
];

/** OpenAPI shape of the multipart body (fields + binary image). */
const multipartSchema = (imageRequired: boolean) => ({
  schema: {
    type: 'object',
    required: imageRequired ? ['name', 'address', 'description', 'startsAt', 'capacity', 'image'] : [],
    properties: {
      name: { type: 'string' },
      address: { type: 'string' },
      description: { type: 'string' },
      startsAt: { type: 'string', format: 'date-time' },
      capacity: { type: 'integer', minimum: 1 },
      image: { type: 'string', format: 'binary' },
    },
  },
});

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiQuery({ name: 'scope', enum: ['upcoming', 'past', 'all'], required: false })
  @ApiOkResponse({ type: [EventDto] })
  list(
    @CurrentUser() user: AuthUser,
    @Query('scope', new ParseEnumPipe(['upcoming', 'past', 'all'], { optional: true }))
    scope: EventScope = 'upcoming',
  ): Promise<EventDto[]> {
    return this.events.list(scope, user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: EventDto })
  get(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: AuthUser): Promise<EventDto> {
    return this.events.get(id, user.id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  @ApiOperation({ summary: 'Create an event (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartSchema(true))
  @ApiCreatedResponse({ type: EventDto })
  create(
    @Body() dto: CreateEventDto,
    @UploadedFile(new ParseFilePipe({ validators: imageValidators })) image: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ): Promise<EventDto> {
    return this.events.create(dto, image, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  @ApiOperation({ summary: 'Update an event; image is optional (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(multipartSchema(false))
  @ApiOkResponse({ type: EventDto })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEventDto,
    @UploadedFile(new ParseFilePipe({ validators: imageValidators, fileIsRequired: false }))
    image: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<EventDto> {
    return this.events.update(id, dto, image, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an event and its registrations (admin)' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.events.remove(id);
  }

  /** Public so it works in <img src>, which can't send an Authorization header. */
  @Get(':id/image')
  @Public()
  @ApiProduces('image/*')
  async image(
    @Param('id', ParseObjectIdPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.events.image(id);
    // URLs are versioned (?v=), so the browser can cache forever.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return new StreamableFile(file.body, { type: file.contentType, length: file.contentLength });
  }
}
