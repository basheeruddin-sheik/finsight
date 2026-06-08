import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
    Logger.error(
      'Missing AUTH0_DOMAIN and/or AUTH0_AUDIENCE. Set them in server/.env — ' +
      'the API cannot authenticate requests without them. See AUTH_SETUP.md.',
      'Bootstrap',
    );
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  // Allow any origin in development — covers localhost, 127.0.0.1, LAN IP, etc.
  // Auth is enforced by bearer tokens, not by origin.
  app.enableCors({ origin: true, credentials: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
