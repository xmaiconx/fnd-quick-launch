import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { IConfigurationService, IAsyncContextService, IMetricsService, ILoggerService } from '@fnd/contracts';
import { StartupLoggerService } from '../shared/services/startup-logger.service';
import { RequestIdMiddleware } from './middlewares/request-id.middleware';

export async function api() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for multiple frontends
  const corsOrigins = process.env.API_CORS_ORIGINS;
  const originPatterns = corsOrigins
    ? corsOrigins.split(',').map(o => o.trim())
    : [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.MANAGER_URL || 'http://localhost:3002',
      ].filter(Boolean);

  // Convert wildcard patterns to regex (e.g., https://*.example.com)
  const originMatchers = originPatterns.map(pattern => {
    if (pattern === '*') return '*';
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`);
    }
    return pattern;
  });

  const hasWildcard = originPatterns.includes('*');

  app.enableCors({
    origin: hasWildcard
      ? '*'
      : (origin, callback) => {
          if (!origin) return callback(null, true); // Allow non-browser requests
          const isAllowed = originMatchers.some(matcher =>
            matcher instanceof RegExp ? matcher.test(origin) : matcher === origin
          );
          callback(null, isAllowed);
        },
    credentials: !hasWildcard,
  });

  // Register RequestIdMiddleware globally
  const asyncContextService = app.get<IAsyncContextService>('IAsyncContextService');
  const metricsService = app.get<IMetricsService>('IMetricsService');
  const requestIdMiddleware = new RequestIdMiddleware(asyncContextService, metricsService);
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const configService = app.get<IConfigurationService>('IConfigurationService');
  const port = configService.getApiPort();

  const logger = app.get<ILoggerService>('ILoggerService');

  await app.listen(port, '0.0.0.0');
  logger.info(`FND Template API running on http://0.0.0.0:${port}/api/v1`, {
    module: 'APIMain',
    port,
  });

  // Log startup information including super-admin status
  const startupLogger = app.get(StartupLoggerService);
  startupLogger.logStartupInfo();
}
