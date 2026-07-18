import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // ── ES256 JWT Keys (base64-encoded PEM) ──────────────────────
  JWT_ACCESS_PRIVATE_KEY: z.string().min(100, 'Access private key is required (base64 PEM)'),
  JWT_ACCESS_PUBLIC_KEY: z.string().min(100, 'Access public key is required (base64 PEM)'),
  JWT_REFRESH_PRIVATE_KEY: z.string().min(100, 'Refresh private key is required (base64 PEM)'),
  JWT_REFRESH_PUBLIC_KEY: z.string().min(100, 'Refresh public key is required (base64 PEM)'),

  // ── Token Expiry ─────────────────────────────────────────────
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ACCESS_EXPIRY_MS: z.coerce.number().default(900000),
  JWT_REFRESH_EXPIRY_MS: z.coerce.number().default(604800000),

  // ── Cookies ──────────────────────────────────────────────────
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  DEVICE_COOKIE_NAME: z.string().default('device_id'),
  DEVICE_COOKIE_MAX_AGE: z.coerce.number().default(31536000), // 365 days in seconds

  // ── Security ─────────────────────────────────────────────────
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // ── Email / SMTP ─────────────────────────────────────────────
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('noreply@sprintio.dev'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:3001'),
  EMAIL_VERIFICATION_EXPIRY_MS: z.coerce.number().default(86400000), // 24 hours
  PASSWORD_RESET_EXPIRY_MS: z.coerce.number().default(3600000), // 1 hour
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
