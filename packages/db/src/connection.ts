import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const client = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });

export async function closeDatabase(): Promise<void> {
  await client.end();
}

/** Raw postgres-js client for advanced queries */
export { client };
