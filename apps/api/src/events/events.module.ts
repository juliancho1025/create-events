import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricMark, MetricMarkSchema } from '../metrics/metric-mark.schema.js';
import { MetricsController } from '../metrics/metrics.controller.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { NotificationsController } from '../notifications/notifications.controller.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PushController } from '../notifications/push.controller.js';
import { PushSubscription, PushSubscriptionSchema } from '../notifications/push-subscription.schema.js';
import { PushSender } from '../notifications/push.sender.js';
import { PushService } from '../notifications/push.service.js';
import {
  ScheduledNotification,
  ScheduledNotificationSchema,
} from '../notifications/scheduled-notification.schema.js';
import { Registration, RegistrationSchema } from '../registrations/registration.schema.js';
import { RegistrationsController } from '../registrations/registrations.controller.js';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { Review, ReviewSchema } from '../reviews/review.schema.js';
import { ReviewsController } from '../reviews/reviews.controller.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { User, UserSchema } from '../users/user.schema.js';
import { Event, EventSchema } from './event.schema.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

/** Events, registrations, metrics, reviews and notifications share one module: their consistency rules are intertwined. */
@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: MetricMark.name, schema: MetricMarkSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: ScheduledNotification.name, schema: ScheduledNotificationSchema },
      { name: PushSubscription.name, schema: PushSubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [EventsController, RegistrationsController, MetricsController, ReviewsController, NotificationsController, PushController],
  providers: [
    EventsService,
    RegistrationsService,
    MetricsService,
    ReviewsService,
    NotificationsService,
    PushService,
    PushSender,
  ],
})
export class EventsModule {}
