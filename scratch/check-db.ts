import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL || 'postgresql://postgres:DkWgFURfMUQelEieSGWUxLduDUpQdgEm@centerbeam.proxy.rlwy.net:29413/railway';
console.log('Connecting to database...');

// Try both with and without ssl require
async function run() {
  try {
    console.log('Attempting connection with SSL required...');
    const sqlSsl = postgres(url, { ssl: 'require', connect_timeout: 10 });
    const rows = await sqlSsl`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'`;
    console.log('Success! Tables in database (with SSL):', rows);
    await sqlSsl.end();
    return;
  } catch (err) {
    console.log('Connection with SSL require failed:', (err as any).message);
  }

  try {
    console.log('Attempting connection without SSL...');
    const sqlPlain = postgres(url, { connect_timeout: 10 });
    const rows = await sqlPlain`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'`;
    console.log('Success! Tables in database (without SSL):', rows);
    await sqlPlain.end();
    return;
  } catch (err) {
    console.log('Connection without SSL failed:', (err as any).message);
  }
}

run();
