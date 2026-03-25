import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { sql } = await import('drizzle-orm');
  const { db } = await import('./src/db/index');
  console.log("Applying manual USING casts to preserve data during text -> timestamp change...");
  
  const textToTimestamp = [
    { table: 'contracts', column: 'sauda_date', cast: 'timestamp without time zone' },
    { table: 'deliveries', column: 'dispatch_date', cast: 'timestamp without time zone' },
    { table: 'bills', column: 'bill_date', cast: 'timestamp without time zone' },
    { table: 'payments', column: 'payment_date', cast: 'timestamp without time zone' },
    { table: 'ledger', column: 'transaction_date', cast: 'timestamp without time zone' }
  ];

  const textToInteger = [
    { table: 'ledger', column: 'account_id', cast: 'integer' }
  ];

  const tables = [...textToTimestamp, ...textToInteger];

  for (const { table, column, cast } of tables) {
    try {
      console.log(`Casting ${table}.${column} to ${cast}...`);
      // For integers, safely extract numbers or default if it has text like 'Acme'
      if (cast === 'integer') {
         await db.execute(sql.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${cast} USING NULLIF(regexp_replace("${column}", '\\D', '', 'g'), '')::${cast}`))
      } else {
         await db.execute(sql.raw(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${cast} USING "${column}"::${cast}`));
      }
    } catch (err: any) {
      if (err.code === '42703') {
        console.log(`Column ${column} in ${table} does not exist or already altered.`);
      } else {
         console.log(`Skipped ${table}.${column}: ${err.message}`);
      }
    }
  }

  console.log("Date casting complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
