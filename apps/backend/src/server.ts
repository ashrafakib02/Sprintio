import app from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './config/database.js';
import { closeRedis } from './config/redis.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
});

// ── Graceful shutdown ────────────────────────────────────────

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed');

    await closeDatabase();
    console.log('Database connection closed');

    await closeRedis();
    console.log('Redis connection closed');

    process.exit(0);
  });

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});
