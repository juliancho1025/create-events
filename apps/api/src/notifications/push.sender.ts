import { Inject, Injectable } from '@nestjs/common';
import webpush from 'web-push';
import { appConfig, type AppConfig } from '../config/app-config.js';

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Thin wrapper over `web-push`, so tests can swap in a fake (like StorageService). */
@Injectable()
export class PushSender {
  readonly publicKey: string | null;
  private readonly vapid: AppConfig['vapid'];

  constructor(@Inject(appConfig.KEY) config: AppConfig) {
    this.vapid = config.vapid;
    this.publicKey = config.vapid.publicKey && config.vapid.privateKey ? config.vapid.publicKey : null;
  }

  /** Rejects with `{ statusCode }` from the push service; 404/410 mean the subscription is gone. */
  async send(target: PushTarget, payload: string): Promise<void> {
    if (!this.publicKey) return;
    await webpush.sendNotification(target, payload, {
      vapidDetails: { subject: this.vapid.subject, publicKey: this.vapid.publicKey, privateKey: this.vapid.privateKey },
      TTL: 60 * 60, // drop it if the device stays offline for an hour
    });
  }
}
