import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Interactive API explorer at /docs. The route list needs no auth to view;
  // "Authorize" lets you paste an Auth0 bearer token to try protected routes.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Finsight API')
    .setDescription('Personal finance backend — every route requires a Bearer token unless marked @Public.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
