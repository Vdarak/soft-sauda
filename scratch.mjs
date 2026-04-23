import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function main() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log('Extension created');
  process.exit();
}
main().catch(console.error);
