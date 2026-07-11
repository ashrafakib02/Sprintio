import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (error) => {
  console.error('[Redis] Connection error:', error.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
