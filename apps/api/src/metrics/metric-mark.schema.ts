import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { User } from '../users/user.schema.js';

/**
 * "This user had <metric> at this event" (e.g. no-show). The document existing
 * is the `true` value; unsetting a metric deletes it. Marks outlive the
 * registration, so kicking a no-show doesn't erase their record.
 */
@Schema({ timestamps: true })
export class MetricMark {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Event.name, required: true })
  event: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  /** `EventMetric.key` of the event. */
  @Prop({ required: true })
  metric: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  markedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type MetricMarkDocument = HydratedDocument<MetricMark>;
export const MetricMarkSchema = SchemaFactory.createForClass(MetricMark);

MetricMarkSchema.index({ event: 1, user: 1, metric: 1 }, { unique: true });
MetricMarkSchema.index({ user: 1, metric: 1 });
