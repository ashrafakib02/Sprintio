import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './config/database.js';
import { closeRedis } from './config/redis.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 Server running');
});

// ── Graceful shutdown ────────────────────────────────────────

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Starting graceful shutdown');

  server.close(async () => {
    logger.info('HTTP server closed');

    await closeDatabase();
    logger.info('Database connection closed');

    await closeRedis();
    logger.info('Redis connection closed');

    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});
