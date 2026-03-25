import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('./src/db/index');
  console.log("Dropping tables...");
  await db.execute(sql`DROP TABLE IF EXISTS "ledger" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "payments" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "bills" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "deliveries" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "contracts" CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS "parties" CASCADE`);
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
