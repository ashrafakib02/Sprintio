import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ACCESS_EXPIRY_MS: z.coerce.number().default(900000),
  JWT_REFRESH_EXPIRY_MS: z.coerce.number().default(604800000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
export { envSchema };
export type Env = z.infer<typeof envSchema>;
