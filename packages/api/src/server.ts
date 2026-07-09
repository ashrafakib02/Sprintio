import { app } from './app.js';
import { logger } from './lib/logger.js';

const PORT = process.env.API_PORT || 3001;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Sprintio API running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
