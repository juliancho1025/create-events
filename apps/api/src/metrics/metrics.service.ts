import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { Registration, RegistrationStatus } from '../registrations/registration.schema.js';
import { User } from '../users/user.schema.js';
import { MetricMark } from './metric-mark.schema.js';
import type { EventMetricDto, MetricCountDto, MetricsReportDto } from './metrics.dto.js';

type Counts = Record<string, MetricCountDto>;

@Injectable()
export class MetricsService {
  constructor(
    @InjectModel(MetricMark.name) private readonly markModel: Model<MetricMark>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(Registration.name) private readonly registrationModel: Model<Registration>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async mark(eventId: string, metric: string, userId: string, adminId: string): Promise<void> {
    await this.assertTracked(eventId, metric);
    const confirmed = await this.registrationModel.exists({
      event: eventId,
      user: userId,
      status: RegistrationStatus.CONFIRMED,
    });
    if (!confirmed) throw new BadRequestException('Only confirmed attendees can be marked');
    // Upsert: marking twice is a no-op, not an error.
    await this.markModel.updateOne(
      { event: eventId, user: userId, metric },
      { $setOnInsert: { markedBy: new Types.ObjectId(adminId) } },
      { upsert: true },
    );
  }

  async unmark(eventId: string, metric: string, userId: string): Promise<void> {
    await this.assertTracked(eventId, metric);
    await this.markModel.deleteOne({ event: eventId, user: userId, metric });
  }

  /** userId -> marked metric keys, for one event's attendee list. */
  async marksByUser(eventId: string): Promise<Map<string, string[]>> {
    const marks = await this.markModel.find({ event: eventId }, { user: 1, metric: 1 });
    const byUser = new Map<string, string[]>();
    for (const m of marks) {
      const id = m.user.toString();
      byUser.set(id, [...(byUser.get(id) ?? []), m.metric]);
    }
    return byUser;
  }

  async deleteForEvent(eventId: Types.ObjectId, metrics?: string[]): Promise<void> {
    await this.markModel.deleteMany({ event: eventId, ...(metrics && { metric: { $in: metrics } }) });
  }

  /**
   * Per-user and per-event counts over events that have started. A user's
   * "opportunities" for a metric are the tracked events they were confirmed for
   * (or were marked at, so a kicked/cancelled no-show still counts once).
   * Computed in memory: fine for thousands of registrations; move to an
   * aggregation pipeline if this grows.
   */
  async report(now = new Date()): Promise<MetricsReportDto> {
    const events = await this.eventModel
      .find({ startsAt: { $lte: now }, 'metrics.0': { $exists: true } }, { name: 1, startsAt: 1, metrics: 1 })
      .sort({ startsAt: 1 });
    const eventIds = events.map((e) => e._id);
    const [registrations, marks] = await Promise.all([
      this.registrationModel.find(
        { event: { $in: eventIds }, status: RegistrationStatus.CONFIRMED },
        { event: 1, user: 1 },
      ),
      this.markModel.find({ event: { $in: eventIds } }, { event: 1, user: 1, metric: 1 }),
    ]);

    // eventId -> attendee ids (confirmed, plus anyone marked there).
    const attendees = new Map<string, Set<string>>(eventIds.map((id) => [id.toString(), new Set()]));
    for (const r of registrations) attendees.get(r.event.toString())!.add(r.user.toString());
    for (const m of marks) attendees.get(m.event.toString())!.add(m.user.toString());

    const userStats = new Map<string, Counts>();
    const bump = (stats: Counts, key: string, field: keyof MetricCountDto) => {
      stats[key] ??= { count: 0, opportunities: 0 };
      stats[key][field]++;
    };

    // Latest label wins if an admin renamed the casing ("No show" -> "No-show").
    const metricLabels = new Map<string, string>();
    const eventRows = events.map((event) => {
      const stats: Counts = {};
      const people = attendees.get(event.id)!;
      for (const { key, label } of event.metrics) {
        metricLabels.set(key, label);
        stats[key] = { count: 0, opportunities: people.size };
        for (const userId of people) {
          if (!userStats.has(userId)) userStats.set(userId, {});
          bump(userStats.get(userId)!, key, 'opportunities');
        }
      }
      return { eventId: event.id, name: event.name, startsAt: event.startsAt.toISOString(), stats };
    });

    const rowById = new Map(eventRows.map((row) => [row.eventId, row]));
    for (const m of marks) {
      const row = rowById.get(m.event.toString())!;
      if (!row.stats[m.metric]) continue; // metric removed from the event since
      row.stats[m.metric].count++;
      bump(userStats.get(m.user.toString())!, m.metric, 'count');
    }

    const users = await this.userModel.find(
      { _id: { $in: [...userStats.keys()] } },
      { name: 1, email: 1, avatarUrl: 1 },
    );
    const metrics: EventMetricDto[] = [...metricLabels].map(([key, label]) => ({ key, label }));
    return {
      metrics,
      users: users.map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        stats: userStats.get(u.id)!,
      })),
      events: eventRows,
    };
  }

  private async assertTracked(eventId: string, metric: string) {
    const event = await this.eventModel.findById(eventId, { metrics: 1 });
    if (!event) throw new NotFoundException('Event not found');
    if (!event.metrics.some((m) => m.key === metric)) {
      throw new NotFoundException(`This event does not track "${metric}"`);
    }
  }
}
