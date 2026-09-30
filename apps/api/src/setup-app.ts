import { ValidationPipe, type INestApplication } from '@nestjs/common';

/** Shared by main.ts and the e2e tests so both run with identical settings. */
export function setupApp(app: INestApplication, webUrl: string) {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: webUrl });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // ...and reject requests that send them
      transform: true, // run class-transformer (@Type) on DTOs
    }),
  );
}
