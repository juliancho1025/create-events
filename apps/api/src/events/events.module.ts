import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetricMark, MetricMarkSchema } from '../metrics/metric-mark.schema.js';
import { MetricsController } from '../metrics/metrics.controller.js';
import { MetricsService } from '../metrics/metrics.service.js';
import { Registration, RegistrationSchema } from '../registrations/registration.schema.js';
import { RegistrationsController } from '../registrations/registrations.controller.js';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { User, UserSchema } from '../users/user.schema.js';
import { Event, EventSchema } from './event.schema.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

/** Events, registrations and metrics share one module: their consistency rules are intertwined. */
@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: MetricMark.name, schema: MetricMarkSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [EventsController, RegistrationsController, MetricsController],
  providers: [EventsService, RegistrationsService, MetricsService],
})
export class EventsModule {}
