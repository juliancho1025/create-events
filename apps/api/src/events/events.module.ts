import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from '../registrations/registration.schema.js';
import { RegistrationsController } from '../registrations/registrations.controller.js';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { Event, EventSchema } from './event.schema.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

/** Events and registrations share one module: their consistency rules are intertwined. */
@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Registration.name, schema: RegistrationSchema },
    ]),
  ],
  controllers: [EventsController, RegistrationsController],
  providers: [EventsService, RegistrationsService],
})
export class EventsModule {}
