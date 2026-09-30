import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { appConfig, type AppConfig } from './config/app-config.js';
import { EventsModule } from './events/events.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    MongooseModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => ({ uri: config.mongoUri }),
    }),
    AuthModule,
    UsersModule,
    EventsModule,
  ],
})
export class AppModule {}
