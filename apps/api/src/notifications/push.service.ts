import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PushSender } from './push.sender.js';
import { PushSubscription } from './push-subscription.schema.js';
import type { SubscribePushDto } from './notifications.dto.js';

/** What the service worker (apps/web/public/sw.js) receives. */
export interface PushPayload {
  title: string;
  body: string;
  /** App path to open on click, e.g. `/events/123`. */
  url: string;
  /** Same tag replaces an older notification instead of stacking. */
  tag?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectModel(PushSubscription.name) private readonly subscriptionModel: Model<PushSubscription>,
    private readonly sender: PushSender,
  ) {}

  get publicKey(): string | null {
    return this.sender.publicKey;
  }

  async subscribe(userId: string, dto: SubscribePushDto): Promise<void> {
    await this.subscriptionModel.updateOne(
      { endpoint: dto.endpoint },
      { $set: { user: new Types.ObjectId(userId), keys: { p256dh: dto.keys.p256dh, auth: dto.keys.auth } } },
      { upsert: true },
    );
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subscriptionModel.deleteOne({ user: userId, endpoint });
  }

  /**
   * Sends to every device of the given users and returns how many accepted it.
   * Never throws: one dead device must not stop the rest. Subscriptions the
   * push service reports as gone (404/410) are deleted.
   */
  async sendToUsers(userIds: (string | Types.ObjectId)[], payload: PushPayload): Promise<number> {
    if (!this.publicKey || userIds.length === 0) return 0;
    const subscriptions = await this.subscriptionModel.find({ user: { $in: userIds } });
    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subscriptions.map((s) => this.sender.send({ endpoint: s.endpoint, keys: s.keys }, body)),
    );

    const gone: Types.ObjectId[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') return;
      const status = (result.reason as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(subscriptions[i]._id);
      else this.logger.warn(`Push to ${subscriptions[i].endpoint} failed: ${String(result.reason)}`);
    });
    if (gone.length) await this.subscriptionModel.deleteMany({ _id: { $in: gone } });
    return results.filter((r) => r.status === 'fulfilled').length;
  }
}
