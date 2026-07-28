import { db } from './database.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Type-safe bridge between the schema-aware `db` instance and repository functions
 * that accept the bare `PostgresJsDatabase` type.
 *
 * The repositories are defined with unparameterized `PostgresJsDatabase` (defaults to
 * `Record<string, never>` schema), while our `db` instance carries the full schema type.
 * At runtime they are the same object — this cast makes the types compatible.
 */
export const repoDb = db as unknown as PostgresJsDatabase;
