import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema/index.js';
import { env } from './env.js';

const client = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle(client, { schema });
export const sql = client;

export async function closeDatabase(): Promise<void> {
  await client.end();
}
