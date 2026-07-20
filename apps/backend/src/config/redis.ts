import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (error: Error) => {
  logger.error({ err: error }, '[Redis] Connection error');
});

redis.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
