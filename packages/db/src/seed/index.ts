import { db as _db } from '../connection.js';

async function seed() {
  console.log('🌱 Seeding database...');
  // TODO: Implement seed data
  console.log('✅ Seed complete');
}

seed().catch(console.error);
