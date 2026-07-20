import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: '../../packages/db/src/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
