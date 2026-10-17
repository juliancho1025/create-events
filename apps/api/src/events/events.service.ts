import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type QueryFilter } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { metricKey } from '../metrics/metric-key.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { RegistrationsService, type EventRegistrationStats } from '../registrations/registrations.service.js';
import { StorageService, type StoredObject } from '../storage/storage.service.js';
import { CreateEventDto, EventDto, UpdateEventDto } from './dto/event.dto.js';
import { Event, EventDocument, type EventMetric } from './event.schema.js';

export type EventScope = 'upcoming' | 'past' | 'all';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    private readonly registrations: RegistrationsService,
    private readonly metrics: MetricsService,
    private readonly storage: StorageService,
  ) {}

  async list(scope: EventScope, userId: string): Promise<EventDto[]> {
    const now = new Date();
    const filter: QueryFilter<Event> =
      scope === 'upcoming' ? { startsAt: { $gte: now } } : scope === 'past' ? { startsAt: { $lt: now } } : {};
    const events = await this.eventModel
      .find(filter)
      .sort({ startsAt: scope === 'past' ? -1 : 1 })
      .limit(200);
    const stats = await this.registrations.statsFor(events.map((e) => e._id), userId);
    return events.map((e) => this.toDto(e, stats.get(e.id)!));
  }

  async get(id: string, userId: string): Promise<EventDto> {
    const event = await this.findOrThrow(id);
    const stats = await this.registrations.statsFor([event._id], userId);
    return this.toDto(event, stats.get(event.id)!);
  }

  async create(dto: CreateEventDto, image: Express.Multer.File, adminId: string): Promise<EventDto> {
    const _id = new Types.ObjectId();
    const imageKey = await this.uploadImage(_id, image);
    const event = await this.eventModel.create({
      ...dto,
      metrics: toMetrics(dto.metrics ?? []),
      _id,
      imageKey,
      imageContentType: image.mimetype,
      createdBy: new Types.ObjectId(adminId),
    });
    return this.get(event.id, adminId);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    image: Express.Multer.File | undefined,
    adminId: string,
  ): Promise<EventDto> {
    const event = await this.findOrThrow(id);
    const { metrics, ...fields } = dto;
    const update: Partial<Event> = { ...fields };
    if (metrics) update.metrics = toMetrics(metrics);
    if (image) {
      update.imageKey = await this.uploadImage(event._id, image);
      update.imageContentType = image.mimetype;
    }

    // Guard in the query itself so a concurrent sign-up can't push confirmedCount above the new capacity.
    const filter: QueryFilter<Event> = { _id: event._id };
    if (dto.capacity !== undefined) filter.confirmedCount = { $lte: dto.capacity };
    const res = await this.eventModel.updateOne(filter, { $set: update });
    if (res.matchedCount === 0) {
      if (update.imageKey) await this.deleteImageQuietly(update.imageKey);
      throw new BadRequestException(
        `Capacity cannot be lower than the ${event.confirmedCount} confirmed attendees`,
      );
    }

    if (update.imageKey) await this.deleteImageQuietly(event.imageKey);
    if (update.metrics) {
      // A metric taken off the event takes its marks with it, so reports never count a hidden metric.
      const kept = new Set(update.metrics.map((m) => m.key));
      const removed = event.metrics.map((m) => m.key).filter((key) => !kept.has(key));
      if (removed.length) await this.metrics.deleteForEvent(event._id, removed);
    }
    if (dto.capacity !== undefined && dto.capacity > event.capacity) {
      await this.registrations.fillOpenSeats(event._id);
    }
    return this.get(id, adminId);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOrThrow(id);
    await this.registrations.deleteForEvent(event._id);
    await this.metrics.deleteForEvent(event._id);
    await event.deleteOne();
    await this.deleteImageQuietly(event.imageKey);
  }

  async image(id: string): Promise<StoredObject> {
    const event = await this.findOrThrow(id);
    return this.storage.get(event.imageKey);
  }

  private async findOrThrow(id: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(id);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async uploadImage(eventId: Types.ObjectId, image: Express.Multer.File): Promise<string> {
    const key = `events/${eventId.toHexString()}/${randomUUID()}${extname(image.originalname).toLowerCase()}`;
    await this.storage.put(key, image.buffer, image.mimetype);
    return key;
  }

  private async deleteImageQuietly(key: string) {
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn(`Could not delete image ${key}: ${(err as Error).message}`);
    }
  }

  private toDto(event: EventDocument, stats: EventRegistrationStats): EventDto {
    // The image key changes whenever the image is replaced, so it doubles as a cache-buster.
    const version = event.imageKey.split('/').pop()!;
    return {
      id: event.id,
      name: event.name,
      address: event.address,
      description: event.description,
      imageUrl: `/api/events/${event.id}/image?v=${encodeURIComponent(version)}`,
      startsAt: event.startsAt.toISOString(),
      capacity: event.capacity,
      confirmedCount: event.confirmedCount,
      metrics: event.metrics.map(({ key, label }) => ({ key, label })),
      ...stats,
    };
  }
}

/** Names -> metrics, dropping blanks and duplicates ("No-show" and "no show" are one metric). */
function toMetrics(labels: string[]): EventMetric[] {
  const byKey = new Map<string, EventMetric>();
  for (const raw of labels) {
    const label = raw.trim();
    const key = metricKey(label);
    if (key && !byKey.has(key)) byKey.set(key, { key, label });
  }
  return [...byKey.values()];
}
