/**
 * M3 marketplace migration — additive & idempotent.
 *
 * Creates the marketplace enums + tables (members, listings, watchlist) and
 * adds commodities.volatility_tier. Written by hand (not drizzle-kit push) so
 * it can ONLY add to the schema and never alter/drop existing ERP tables.
 *
 * Run:  npx tsx scratch/m3_marketplace.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres');

async function main() {
  // 1. Enums (CREATE TYPE has no IF NOT EXISTS — guard with a DO block).
  const enums: Array<[string, string[]]> = [
    ['volatility_tier', ['LOW', 'MEDIUM', 'HIGH']],
    ['member_role', ['BUYER', 'SELLER', 'BOTH']],
    ['listing_type', ['OPEN', 'TENDER']],
    ['listing_direction', ['SELL', 'BUY']],
    ['listing_status', ['ACTIVE', 'SOLD', 'CLOSED']],
  ];
  for (const [name, values] of enums) {
    const labels = values.map((v) => `'${v}'`).join(', ');
    await sql.unsafe(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
        CREATE TYPE ${name} AS ENUM (${labels});
      END IF;
    END $$;`);
    console.log(`enum ok: ${name}`);
  }

  // 2. Additive column on the existing commodities table.
  await sql.unsafe(
    `ALTER TABLE commodities ADD COLUMN IF NOT EXISTS volatility_tier volatility_tier DEFAULT 'MEDIUM';`,
  );
  console.log('column ok: commodities.volatility_tier');

  // 3. members
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS members (
    id serial PRIMARY KEY,
    name text NOT NULL,
    phone text NOT NULL UNIQUE,
    email text,
    password_hash text NOT NULL,
    role member_role NOT NULL DEFAULT 'BOTH',
    party_id integer REFERENCES parties(id),
    is_verified boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    last_login timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_members_party_id ON members(party_id);`);
  console.log('table ok: members');

  // 4. listings
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS listings (
    id serial PRIMARY KEY,
    member_id integer REFERENCES members(id) ON DELETE CASCADE,
    listing_type listing_type NOT NULL DEFAULT 'OPEN',
    direction listing_direction NOT NULL DEFAULT 'SELL',
    commodity_id integer NOT NULL REFERENCES commodities(id),
    packaging_id integer REFERENCES commodity_packaging(id),
    title text NOT NULL,
    quality_notes text,
    qty_quintals numeric(15,3),
    price_per_quintal numeric(15,2),
    city_id integer REFERENCES cities(id),
    status listing_status NOT NULL DEFAULT 'ACTIVE',
    close_date timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_listings_member_id ON listings(member_id);`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_listings_commodity_id ON listings(commodity_id);`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);`);
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);`);
  console.log('table ok: listings');

  // 5. watchlist
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS watchlist (
    id serial PRIMARY KEY,
    member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    listing_id integer NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now()
  );`);
  await sql.unsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS unq_watchlist_member_listing ON watchlist(member_id, listing_id);`,
  );
  await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_watchlist_member_id ON watchlist(member_id);`);
  console.log('table ok: watchlist');

  console.log('\nM3 marketplace migration complete.');
  await sql.end();
}

main().catch((e) => {
  console.error('migration failed:', e);
  process.exit(1);
});
