import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { appConfig, type AppConfig } from './config/app-config.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);
  setupApp(app, config.webUrl);

  const openApi = new DocumentBuilder()
    .setTitle('Events API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, openApi));

  app.enableShutdownHooks();
  await app.listen(config.port);
  console.log(`API on http://localhost:${config.port}/api  (docs: /api/docs)`);
}
await bootstrap();
