import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { appConfig, type AppConfig } from '../config/app-config.js';

export interface StoredObject {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

/** ~30s: enough for a cold SeaweedFS container, short enough to fail clearly when it's not running. */
const STARTUP_ATTEMPTS = 30;

/** Thin wrapper over any S3-compatible store (SeaweedFS locally, AWS S3 in production). */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(appConfig.KEY) config: AppConfig) {
    const { s3 } = config;
    this.bucket = s3.bucket;
    this.client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      forcePathStyle: s3.forcePathStyle,
      credentials: s3.accessKeyId
        ? { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey }
        : undefined,
    });
  }

  /**
   * Ensure the bucket exists. Retries while the store is unreachable, because
   * `pnpm infra:up && pnpm dev` starts the API before SeaweedFS finishes booting
   * (it accepts connections, then resets them, for several seconds).
   */
  async onModuleInit() {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        return;
      } catch (err) {
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404) {
          this.logger.log(`Creating bucket "${this.bucket}"`);
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          return;
        }
        // An HTTP answer (403...) won't fix itself; only retry when the store didn't answer.
        if (status !== undefined || attempt >= STARTUP_ATTEMPTS) throw err;
        if (attempt === 1) this.logger.warn(`Object storage not reachable yet (${(err as Error).message}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<StoredObject> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      body: res.Body as Readable,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
