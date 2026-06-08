import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('../src/db/index');
  console.log("Altering payment_term_type enum...");
  try {
    await db.execute(sql`ALTER TYPE "payment_term_type" ADD VALUE IF NOT EXISTS 'PAYMENT'`);
    console.log("Enum altered successfully.");
  } catch (err) {
    console.error("Error altering enum:", err);
  }
  process.exit(0);
}

main().catch(console.error);
