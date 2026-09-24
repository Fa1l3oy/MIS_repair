import 'reflect-metadata';
import './config/load-env';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GLOBAL_PREFIX_OPTIONS } from './app.setup';
import { APP_CONFIG, type AppConfig } from './config/configuration';
import { logEvent } from './logging/log-event';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // เรียกผ่าน reverse proxy / Next.js rewrites
  app.setGlobalPrefix('api', GLOBAL_PREFIX_OPTIONS);
  app.enableShutdownHooks();

  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);

  logEvent('subsystem.started', {
    subsystem: config.subsystemId,
    port: config.port,
    coreHubUrl: config.coreHub.url,
    jwksUrl: config.coreHub.jwksUrl,
    issuer: config.coreHub.issuer,
    audience: config.coreHub.audience,
  });
}

void bootstrap();
