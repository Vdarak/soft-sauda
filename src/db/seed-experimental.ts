/**
 * Seed Script — EXPERIMENTAL / ISOLATED DB (minimal)
 *
 * Builds the full schema (enums + all tables + indexes) and seeds ONLY the
 * minimum needed to log in and pick a context:
 *   - 4 Companies
 *   - 3 Fiscal Years per company (FY 2023-24 locked, 2024-25 locked, 2025-26 active)
 *   - 1 Admin user (admin / admin123) — SHA-256 salt:hash (matches verifyPassword)
 *   - user_company_access linking the admin to all companies
 *     (required because the Go API login JOINs user_company_access for everyone)
 *
 * No parties / contracts / deliveries / bills are seeded — clean slate.
 *
 * SAFETY: refuses to run unless DATABASE_URL points at a local host. This
 * prevents accidentally wiping the shared production (Railway) database.
 *
 * Run:
 *   DATABASE_URL=postgres://softsauda:softsauda_dev@localhost:5433/softsauda \
 *     npx tsx src/db/seed-experimental.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as crypto from 'crypto';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is required. Refusing to run.');
  process.exit(1);
}

// ── Safety guard: only allow local databases ──
const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(connectionString);
if (!isLocal) {
  console.error('❌ DATABASE_URL does not point at a local host.');
  console.error('   This experimental seeder will WIPE the target DB and only');
  console.error('   runs against localhost to protect production. Aborting.');
  process.exit(1);
}

const client = postgres(connectionString, { max: 3 });
const db = drizzle(client);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

const COMPANIES = [
  { name: 'GCC Pulses', shortCode: 'PULSES', description: 'Pulses division - Moong, Chana, Tur, Urad, Masoor' },
  { name: 'GCC Soywheat', shortCode: 'SOYWHEAT', description: 'Soybean, Wheat, and Bajra trading' },
  { name: 'GCC Oilcake', shortCode: 'OILCAKE', description: 'Edible oils and cottonseed oil cake' },
  { name: 'MAFI', shortCode: 'MAFI', description: 'MAFI commodity trading' },
];

const FY_RANGES = [
  { label: 'FY 2023-24', start: '2023-04-01T00:00:00.000Z', end: '2024-03-31T23:59:59.000Z', isLocked: true, isCurrent: false },
  { label: 'FY 2024-25', start: '2024-04-01T00:00:00.000Z', end: '2025-03-31T23:59:59.000Z', isLocked: true, isCurrent: false },
  { label: 'FY 2025-26', start: '2025-04-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z', isLocked: false, isCurrent: true },
];

async function seed() {
  console.log('🧹 Dropping existing objects...');
  await db.execute(sql`
    DROP TABLE IF EXISTS audit_log CASCADE;
    DROP TABLE IF EXISTS payment_allocations CASCADE;
    DROP TABLE IF EXISTS bill_lines CASCADE;
    DROP TABLE IF EXISTS delivery_charges CASCADE;
    DROP TABLE IF EXISTS delivery_lines CASCADE;
    DROP TABLE IF EXISTS contract_lines CASCADE;
    DROP TABLE IF EXISTS contract_parties CASCADE;
    DROP TABLE IF EXISTS ledger CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS bills CASCADE;
    DROP TABLE IF EXISTS deliveries CASCADE;
    DROP TABLE IF EXISTS contracts CASCADE;
    DROP TABLE IF EXISTS commodity_specifications CASCADE;
    DROP TABLE IF EXISTS commodity_packaging CASCADE;
    DROP TABLE IF EXISTS commodities CASCADE;
    DROP TABLE IF EXISTS commodity_groups CASCADE;
    DROP TABLE IF EXISTS party_contacts CASCADE;
    DROP TABLE IF EXISTS party_bank_details CASCADE;
    DROP TABLE IF EXISTS party_delivery_addresses CASCADE;
    DROP TABLE IF EXISTS party_tax_ids CASCADE;
    DROP TABLE IF EXISTS party_roles CASCADE;
    DROP TABLE IF EXISTS parties CASCADE;
    DROP TABLE IF EXISTS cities CASCADE;
    DROP TABLE IF EXISTS districts CASCADE;
    DROP TABLE IF EXISTS states CASCADE;
    DROP TABLE IF EXISTS user_company_access CASCADE;
    DROP TABLE IF EXISTS fiscal_years CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS companies CASCADE;
  `);
  await db.execute(sql`
    DROP TYPE IF EXISTS party_role CASCADE;
    DROP TYPE IF EXISTS tax_id_type CASCADE;
    DROP TYPE IF EXISTS contract_status CASCADE;
    DROP TYPE IF EXISTS delivery_status CASCADE;
    DROP TYPE IF EXISTS bill_basis CASCADE;
    DROP TYPE IF EXISTS payment_term_type CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS audit_action CASCADE;
  `);

  console.log('🔌 Ensuring pg_trgm extension...');
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  console.log('📦 Creating enums...');
  await db.execute(sql`CREATE TYPE party_role AS ENUM ('BUYER', 'SELLER', 'BUYER_BROKER', 'SELLER_BROKER')`);
  await db.execute(sql`CREATE TYPE tax_id_type AS ENUM ('GSTIN', 'VAT_TIN', 'CST_TIN', 'CST_NO', 'PAN')`);
  await db.execute(sql`CREATE TYPE contract_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')`);
  await db.execute(sql`CREATE TYPE delivery_status AS ENUM ('PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED')`);
  await db.execute(sql`CREATE TYPE bill_basis AS ENUM ('CONTRACT', 'DELIVERY', 'DIRECT', 'DALALI')`);
  await db.execute(sql`CREATE TYPE payment_term_type AS ENUM ('DISCOUNT', 'CREDIT', 'PAYMENT')`);
  await db.execute(sql`CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE')`);
  await db.execute(sql`CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE')`);

  console.log('📦 Creating tables...');

  await db.execute(sql`
    CREATE TABLE companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      short_code TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE fiscal_years (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT false,
      is_locked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_fy_company_label ON fiscal_years(company_id, label)`);
  await db.execute(sql`CREATE INDEX idx_fy_company_id ON fiscal_years(company_id)`);

  await db.execute(sql`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role user_role NOT NULL DEFAULT 'EMPLOYEE',
      permissions JSONB,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE user_company_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      granted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_user_company ON user_company_access(user_id, company_id)`);

  await db.execute(sql`
    CREATE TABLE audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      company_id INTEGER REFERENCES companies(id),
      action audit_action NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      changes JSONB,
      ip_address TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX idx_audit_log_user_id ON audit_log(user_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_log_company_id ON audit_log(company_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id)`);
  await db.execute(sql`CREATE INDEX idx_audit_log_created_at ON audit_log(created_at)`);

  await db.execute(sql`CREATE TABLE states (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
  await db.execute(sql`
    CREATE TABLE districts (
      id SERIAL PRIMARY KEY,
      state_id INTEGER NOT NULL REFERENCES states(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_district_state ON districts(state_id, name)`);
  await db.execute(sql`
    CREATE TABLE cities (
      id SERIAL PRIMARY KEY,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      pincode TEXT,
      std_code TEXT
    )
  `);
  await db.execute(sql`CREATE INDEX idx_cities_name_trgm ON cities USING gin (name gin_trgm_ops)`);

  await db.execute(sql`
    CREATE TABLE parties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      landmark TEXT,
      place TEXT,
      state_name TEXT,
      pin_code TEXT,
      city_id INTEGER,
      credit_limit NUMERIC(15,2),
      phone TEXT,
      phone_res TEXT,
      sms_mobile TEXT,
      mill TEXT,
      fax TEXT,
      email_ids TEXT,
      designation TEXT,
      is_shared BOOLEAN NOT NULL DEFAULT true,
      company_id INTEGER REFERENCES companies(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE INDEX idx_parties_name_trgm ON parties USING gin (name gin_trgm_ops)`);
  await db.execute(sql`CREATE INDEX idx_parties_company_id ON parties(company_id)`);

  await db.execute(sql`
    CREATE TABLE party_roles (
      id SERIAL PRIMARY KEY,
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      role party_role NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_party_role ON party_roles(party_id, role)`);
  await db.execute(sql`CREATE INDEX idx_party_roles_party_id ON party_roles(party_id)`);

  await db.execute(sql`
    CREATE TABLE party_tax_ids (
      id SERIAL PRIMARY KEY,
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      tax_type tax_id_type NOT NULL,
      tax_value TEXT NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX idx_party_tax_ids_party_id ON party_tax_ids(party_id)`);

  await db.execute(sql`
    CREATE TABLE party_delivery_addresses (
      id SERIAL PRIMARY KEY,
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      address_line TEXT NOT NULL,
      city TEXT,
      state TEXT,
      pincode TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE party_bank_details (
      id SERIAL PRIMARY KEY,
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      bank_name TEXT,
      account_no TEXT,
      ifsc_code TEXT,
      branch TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE party_contacts (
      id SERIAL PRIMARY KEY,
      party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      contact_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email_id TEXT,
      designation TEXT
    )
  `);

  await db.execute(sql`CREATE TABLE commodity_groups (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE)`);
  await db.execute(sql`
    CREATE TABLE commodities (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES commodity_groups(id),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      short_name TEXT,
      unit TEXT,
      hsn_code TEXT,
      is_shared BOOLEAN NOT NULL DEFAULT true,
      company_id INTEGER REFERENCES companies(id)
    )
  `);
  await db.execute(sql`CREATE INDEX idx_commodities_name_trgm ON commodities USING gin (name gin_trgm_ops)`);
  await db.execute(sql`CREATE INDEX idx_commodities_company_id ON commodities(company_id)`);

  await db.execute(sql`
    CREATE TABLE commodity_packaging (
      id SERIAL PRIMARY KEY,
      commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
      packing_weight NUMERIC(10,3) NOT NULL,
      packing_weight_2 NUMERIC(10,3),
      packing_type TEXT NOT NULL,
      seller_brokerage_rate NUMERIC(10,2),
      seller_brokerage_type TEXT,
      buyer_brokerage_rate NUMERIC(10,2),
      buyer_brokerage_type TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE commodity_specifications (
      id SERIAL PRIMARY KEY,
      commodity_id INTEGER NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
      specification TEXT NOT NULL,
      spec_value NUMERIC(10,2),
      min_max TEXT,
      remarks TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE contracts (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
      sauda_no INTEGER NOT NULL,
      sauda_book TEXT NOT NULL,
      sauda_prefix TEXT,
      sauda_date TIMESTAMP NOT NULL DEFAULT NOW(),
      status contract_status NOT NULL DEFAULT 'ACTIVE',
      delivery_term TEXT,
      payment_term_type payment_term_type DEFAULT 'DISCOUNT',
      payment_percent NUMERIC(5,2),
      payment_days INTEGER,
      delivery_deadline_date TIMESTAMP,
      approx_weight NUMERIC(15,3),
      quantity_tolerance NUMERIC(5,2),
      origin_station TEXT,
      destination_station TEXT,
      tax_form_required TEXT,
      po_number TEXT,
      po_date TIMESTAMP,
      terms_and_conditions TEXT,
      custom_remarks TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_sauda_book_no ON contracts(company_id, fiscal_year_id, sauda_book, sauda_no)`);
  await db.execute(sql`CREATE INDEX idx_contracts_company_id ON contracts(company_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_fiscal_year_id ON contracts(fiscal_year_id)`);
  await db.execute(sql`CREATE INDEX idx_contracts_company_fy ON contracts(company_id, fiscal_year_id)`);

  await db.execute(sql`
    CREATE TABLE contract_parties (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      party_id INTEGER NOT NULL REFERENCES parties(id),
      role party_role NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX idx_contract_parties_contract_id ON contract_parties(contract_id)`);
  await db.execute(sql`CREATE INDEX idx_contract_parties_party_id ON contract_parties(party_id)`);

  await db.execute(sql`
    CREATE TABLE contract_lines (
      id SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      commodity_id INTEGER NOT NULL REFERENCES commodities(id),
      packaging_id INTEGER REFERENCES commodity_packaging(id),
      brand TEXT,
      number_of_lorries INTEGER,
      quantity_bags NUMERIC(15,2),
      weight_quintals NUMERIC(15,3) NOT NULL,
      rate NUMERIC(15,2) NOT NULL,
      amount NUMERIC(15,2) NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX idx_contract_lines_contract_id ON contract_lines(contract_id)`);
  await db.execute(sql`CREATE INDEX idx_contract_lines_commodity_id ON contract_lines(commodity_id)`);

  await db.execute(sql`
    CREATE TABLE deliveries (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
      dispatch_date TIMESTAMP NOT NULL DEFAULT NOW(),
      truck_no TEXT,
      bill_no TEXT,
      carrier_bill_date TIMESTAMP,
      transporter_id INTEGER REFERENCES parties(id),
      advance_payment_collected NUMERIC(15,2),
      status delivery_status NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE INDEX idx_deliveries_company_id ON deliveries(company_id)`);
  await db.execute(sql`CREATE INDEX idx_deliveries_fiscal_year_id ON deliveries(fiscal_year_id)`);
  await db.execute(sql`CREATE INDEX idx_deliveries_company_fy ON deliveries(company_id, fiscal_year_id)`);

  await db.execute(sql`
    CREATE TABLE delivery_lines (
      id SERIAL PRIMARY KEY,
      delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
      contract_line_id INTEGER NOT NULL REFERENCES contract_lines(id),
      dispatched_bags NUMERIC(15,2),
      dispatched_weight NUMERIC(15,3) NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX idx_delivery_lines_delivery_id ON delivery_lines(delivery_id)`);
  await db.execute(sql`CREATE INDEX idx_delivery_lines_contract_line_id ON delivery_lines(contract_line_id)`);

  await db.execute(sql`
    CREATE TABLE delivery_charges (
      id SERIAL PRIMARY KEY,
      delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
      charge_type TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE bills (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
      bill_no TEXT NOT NULL,
      bill_date TIMESTAMP NOT NULL DEFAULT NOW(),
      party_id INTEGER NOT NULL REFERENCES parties(id),
      basis bill_basis NOT NULL,
      total_amount NUMERIC(15,2) NOT NULL,
      balance_amount NUMERIC(15,2) NOT NULL,
      credit_days INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_bill_no_company_fy ON bills(company_id, fiscal_year_id, bill_no)`);
  await db.execute(sql`CREATE INDEX idx_bills_company_id ON bills(company_id)`);
  await db.execute(sql`CREATE INDEX idx_bills_fiscal_year_id ON bills(fiscal_year_id)`);
  await db.execute(sql`CREATE INDEX idx_bills_company_fy ON bills(company_id, fiscal_year_id)`);

  await db.execute(sql`
    CREATE TABLE bill_lines (
      id SERIAL PRIMARY KEY,
      bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC(15,2) NOT NULL,
      reference_type TEXT,
      reference_id INTEGER
    )
  `);
  await db.execute(sql`CREATE INDEX idx_bill_lines_bill_id ON bill_lines(bill_id)`);

  await db.execute(sql`
    CREATE TABLE payments (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
      payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
      party_id INTEGER NOT NULL REFERENCES parties(id),
      instrument_type TEXT NOT NULL,
      instrument_no TEXT,
      amount NUMERIC(15,2) NOT NULL,
      deposited_bank TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE INDEX idx_payments_company_id ON payments(company_id)`);
  await db.execute(sql`CREATE INDEX idx_payments_fiscal_year_id ON payments(fiscal_year_id)`);
  await db.execute(sql`CREATE INDEX idx_payments_company_fy ON payments(company_id, fiscal_year_id)`);

  await db.execute(sql`
    CREATE TABLE payment_allocations (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      allocated_amount NUMERIC(15,2) NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX idx_payment_alloc_payment_id ON payment_allocations(payment_id)`);
  await db.execute(sql`CREATE INDEX idx_payment_alloc_bill_id ON payment_allocations(bill_id)`);

  await db.execute(sql`
    CREATE TABLE ledger (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      fiscal_year_id INTEGER NOT NULL REFERENCES fiscal_years(id),
      transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),
      account_id INTEGER NOT NULL REFERENCES parties(id),
      source_type TEXT NOT NULL,
      source_id INTEGER,
      debit NUMERIC(15,2) DEFAULT '0.00',
      credit NUMERIC(15,2) DEFAULT '0.00',
      narration TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id)
    )
  `);
  await db.execute(sql`CREATE INDEX idx_ledger_account_id ON ledger(account_id)`);
  await db.execute(sql`CREATE INDEX idx_ledger_source_type ON ledger(source_type)`);
  await db.execute(sql`CREATE INDEX idx_ledger_transaction_date ON ledger(transaction_date)`);
  await db.execute(sql`CREATE INDEX idx_ledger_company_id ON ledger(company_id)`);
  await db.execute(sql`CREATE INDEX idx_ledger_fiscal_year_id ON ledger(fiscal_year_id)`);
  await db.execute(sql`CREATE INDEX idx_ledger_company_fy ON ledger(company_id, fiscal_year_id)`);

  console.log('✅ Schema created');

  console.log('🌱 Seeding companies, fiscal years, admin user...');

  const companyIds: number[] = [];
  for (const c of COMPANIES) {
    const [row] = await db.execute<{ id: number }>(sql`
      INSERT INTO companies (name, short_code, description)
      VALUES (${c.name}, ${c.shortCode}, ${c.description})
      RETURNING id
    `);
    const companyId = (row as { id: number }).id;
    companyIds.push(companyId);

    for (const fy of FY_RANGES) {
      await db.execute(sql`
        INSERT INTO fiscal_years (company_id, label, start_date, end_date, is_current, is_locked)
        VALUES (${companyId}, ${fy.label}, ${fy.start}, ${fy.end}, ${fy.isCurrent}, ${fy.isLocked})
      `);
    }
  }

  const [adminRow] = await db.execute<{ id: number }>(sql`
    INSERT INTO users (username, password_hash, display_name, role, is_active)
    VALUES ('admin', ${hashPassword('admin123')}, 'Administrator', 'ADMIN', true)
    RETURNING id
  `);
  const adminId = (adminRow as { id: number }).id;

  for (const companyId of companyIds) {
    await db.execute(sql`
      INSERT INTO user_company_access (user_id, company_id)
      VALUES (${adminId}, ${companyId})
    `);
  }

  console.log('✅ Seed complete');
  console.log('');
  console.log('   Companies : ' + COMPANIES.map((c) => c.shortCode).join(', '));
  console.log('   Login     : admin / admin123');
  console.log('');

  await client.end();
}

seed().catch(async (err) => {
  console.error('❌ Seed failed:', err);
  await client.end();
  process.exit(1);
});
