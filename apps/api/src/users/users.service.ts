import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type PipelineStage } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { imageExtension } from '../common/images.js';
import { appConfig, type AppConfig } from '../config/app-config.js';
import { StorageService, type StoredObject } from '../storage/storage.service.js';
import { Role } from '../common/roles.js';
import type { UpdateProfileDto } from './user.dto.js';
import { User, UserDocument } from './user.schema.js';

export interface LoginProfile {
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
    private readonly storage: StorageService,
  ) {}

  /**
   * Create or update the user on every login. The role is recomputed from
   * ADMIN_EMAILS each time, so editing the env var takes effect on next login.
   * The login name only seeds a new account: after that the name is the user's
   * own (set in their profile), so it is never overwritten by Google's.
   */
  async upsertOnLogin(profile: LoginProfile): Promise<UserDocument> {
    const email = profile.email.toLowerCase();
    const role = this.config.adminEmails.includes(email) ? Role.ADMIN : Role.USER;
    const update: Partial<User> = { role };
    if (profile.avatarUrl) update.avatarUrl = profile.avatarUrl;
    if (profile.googleId) update.googleId = profile.googleId;

    return this.userModel
      .findOneAndUpdate({ email }, { $set: update, $setOnInsert: { email, name: profile.name } }, { upsert: true, returnDocument: 'after' })
      .orFail();
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const { phone, allergies, ...required } = dto;
    const cleared = [...(phone ? [] : ['phone']), ...(allergies ? [] : ['allergies'])];
    const pipeline: PipelineStage[] = [
      {
        // $literal: in a pipeline a user string like "$email" would otherwise read another field.
        $set: {
          ...Object.fromEntries(Object.entries({ ...required, phone, allergies })
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, { $literal: value }])),
          // First save only; later edits keep the original date.
          profileCompletedAt: { $ifNull: ['$profileCompletedAt', '$$NOW'] },
        },
      },
    ];
    if (cleared.length) pipeline.push({ $unset: cleared });
    try {
      const user = await this.userModel.findByIdAndUpdate(id, pipeline, {
        returnDocument: 'after',
        updatePipeline: true,
      });
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new ConflictException('That username is taken');
      throw err;
    }
  }

  /** Stores the photo under a fresh key (a new cache-busting URL), then drops the old one. */
  async setAvatar(id: string, image: Express.Multer.File): Promise<UserDocument> {
    const key = `users/${id}/${randomUUID()}${imageExtension(image)}`;
    await this.storage.put(key, image.buffer, image.mimetype);
    const previous = await this.userModel.findByIdAndUpdate(id, {
      $set: { avatarKey: key, avatarContentType: image.mimetype },
    });
    if (!previous) {
      await this.deleteObjectQuietly(key);
      throw new NotFoundException('User not found');
    }
    if (previous.avatarKey) await this.deleteObjectQuietly(previous.avatarKey);
    return this.findById(id);
  }

  /** Back to the Google picture, or initials. */
  async removeAvatar(id: string): Promise<UserDocument> {
    const previous = await this.userModel.findByIdAndUpdate(id, { $unset: { avatarKey: 1, avatarContentType: 1 } });
    if (!previous) throw new NotFoundException('User not found');
    if (previous.avatarKey) await this.deleteObjectQuietly(previous.avatarKey);
    return this.findById(id);
  }

  async avatar(id: string): Promise<StoredObject> {
    const user = await this.findById(id);
    if (!user.avatarKey) throw new NotFoundException('No profile photo');
    return this.storage.get(user.avatarKey);
  }

  private async deleteObjectQuietly(key: string) {
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn(`Could not delete image ${key}: ${(err as Error).message}`);
    }
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
