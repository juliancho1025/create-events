import { FileTypeValidator, MaxFileSizeValidator } from '@nestjs/common';
import { extname } from 'node:path';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;

/** For ParseFilePipe on every image upload (event covers, profile photos). */
export const imageValidators = [
  new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES, message: 'Image must be 5 MB or smaller' }),
  // Checks the file's magic bytes, not just the client-supplied Content-Type.
  new FileTypeValidator({ fileType: IMAGE_TYPES }),
];

export const imageExtension = (file: Express.Multer.File) => extname(file.originalname).toLowerCase();
