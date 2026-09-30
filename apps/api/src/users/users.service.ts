import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { appConfig, type AppConfig } from '../config/app-config.js';
import { Role } from '../common/roles.js';
import { User, UserDocument } from './user.schema.js';

export interface LoginProfile {
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  /**
   * Create or update the user on every login. The role is recomputed from
   * ADMIN_EMAILS each time, so editing the env var takes effect on next login.
   */
  async upsertOnLogin(profile: LoginProfile): Promise<UserDocument> {
    const email = profile.email.toLowerCase();
    const role = this.config.adminEmails.includes(email) ? Role.ADMIN : Role.USER;
    const update: Partial<User> = { name: profile.name, role };
    if (profile.avatarUrl) update.avatarUrl = profile.avatarUrl;
    if (profile.googleId) update.googleId = profile.googleId;

    return this.userModel
      .findOneAndUpdate({ email }, { $set: update, $setOnInsert: { email } }, { upsert: true, returnDocument: 'after' })
      .orFail();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
