/**
 * Seed Script — Multi-Company Data Seeder
 * 
 * Wipes ALL existing data and seeds:
 * - 4 Companies (GCC Pulses, GCC Soybean & Wheat, GCC Oil & Cottonseed Cake, MAFI)
 * - 3 Fiscal Years per company (FY 2023-24 locked, FY 2024-25 locked, FY 2025-26 active)
 * - 1 Admin user (gccnanded / gccnanded@123)
 * - Realistic parties, commodities, contracts, deliveries, bills, payments, ledger
 * 
 * Run: npx tsx src/db/seed-companies.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const client = postgres(connectionString, { max: 3 });
const db = drizzle(client);

// ── Password Hashing (SHA-256 with salt, no extra deps) ──
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

// ── Helpers ──
function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDecimal(min: number, max: number, precision = 2): string {
  return (Math.random() * (max - min) + min).toFixed(precision);
}
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString();
}
function dateToISO(d: Date): string { return d.toISOString(); }

// ── Data Constants ──
const COMPANIES = [
  { name: 'GCC Pulses', shortCode: 'PULSES', description: 'Pulses division - Moong, Chana, Tur, Urad, Masoor' },
  { name: 'GCC Soybean & Wheat', shortCode: 'SOYWHEAT', description: 'Soybean, Wheat, and Bajra trading' },
  { name: 'GCC Oil & Cottonseed Cake', shortCode: 'OILCAKE', description: 'Edible oils and cottonseed oil cake' },
  { name: 'MAFI', shortCode: 'MAFI', description: 'MAFI commodity trading' },
];

const COMMODITIES_PER_COMPANY: Record<string, { name: string; unit: string; hsnCode: string; shortName: string }[]> = {
  'PULSES': [
    { name: 'Moong Dal', unit: 'Quintal', hsnCode: '07132100', shortName: 'MOONG' },
    { name: 'Moong Whole', unit: 'Quintal', hsnCode: '07132100', shortName: 'MOONG-W' },
    { name: 'Chana Dal', unit: 'Quintal', hsnCode: '07132000', shortName: 'CHANA' },
    { name: 'Chana Whole', unit: 'Quintal', hsnCode: '07132000', shortName: 'CHANA-W' },
    { name: 'Tur Dal', unit: 'Quintal', hsnCode: '07133100', shortName: 'TUR' },
    { name: 'Tur Whole', unit: 'Quintal', hsnCode: '07133100', shortName: 'TUR-W' },
    { name: 'Urad Dal', unit: 'Quintal', hsnCode: '07133100', shortName: 'URAD' },
    { name: 'Urad Whole', unit: 'Quintal', hsnCode: '07133100', shortName: 'URAD-W' },
    { name: 'Masoor Dal', unit: 'Quintal', hsnCode: '07134000', shortName: 'MASOOR' },
    { name: 'Masoor Whole', unit: 'Quintal', hsnCode: '07134000', shortName: 'MASOOR-W' },
    { name: 'Moth Dal', unit: 'Quintal', hsnCode: '07139090', shortName: 'MOTH' },
    { name: 'Rajma', unit: 'Quintal', hsnCode: '07133200', shortName: 'RAJMA' },
  ],
  'SOYWHEAT': [
    { name: 'Soybean', unit: 'Quintal', hsnCode: '12011000', shortName: 'SOY' },
    { name: 'Soybean Meal', unit: 'Quintal', hsnCode: '23040000', shortName: 'SOYMEAL' },
    { name: 'Wheat', unit: 'Quintal', hsnCode: '10011990', shortName: 'WHEAT' },
    { name: 'Wheat Flour (Atta)', unit: 'Quintal', hsnCode: '11010000', shortName: 'ATTA' },
    { name: 'Bajra', unit: 'Quintal', hsnCode: '10082900', shortName: 'BAJRA' },
    { name: 'Maize', unit: 'Quintal', hsnCode: '10051000', shortName: 'MAIZE' },
    { name: 'Jowar', unit: 'Quintal', hsnCode: '10070090', shortName: 'JOWAR' },
    { name: 'Ragi', unit: 'Quintal', hsnCode: '10082100', shortName: 'RAGI' },
  ],
  'OILCAKE': [
    { name: 'Groundnut Oil', unit: 'Litre', hsnCode: '15081000', shortName: 'GNOIL' },
    { name: 'Soybean Oil', unit: 'Litre', hsnCode: '15071000', shortName: 'SOYOIL' },
    { name: 'Cottonseed Oil', unit: 'Litre', hsnCode: '15122100', shortName: 'CSOL' },
    { name: 'Cottonseed Cake', unit: 'Quintal', hsnCode: '23061000', shortName: 'CSCAKE' },
    { name: 'Mustard Oil', unit: 'Litre', hsnCode: '15141100', shortName: 'MUSTOIL' },
    { name: 'Sunflower Oil', unit: 'Litre', hsnCode: '15121100', shortName: 'SUNOIL' },
    { name: 'Sesame Oil (Til)', unit: 'Litre', hsnCode: '15151100', shortName: 'TILOIL' },
    { name: 'Groundnut Cake', unit: 'Quintal', hsnCode: '23050000', shortName: 'GNCAKE' },
    { name: 'Rapeseed Cake', unit: 'Quintal', hsnCode: '23064100', shortName: 'RAPCAKE' },
  ],
  'MAFI': [
    { name: 'MAFI Grade A', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-A' },
    { name: 'MAFI Grade B', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-B' },
    { name: 'MAFI Premium', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-P' },
    { name: 'MAFI Standard', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-S' },
    { name: 'MAFI Export Quality', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-EQ' },
    { name: 'MAFI Industrial', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-I' },
  ],
};

const PARTY_NAMES = [
  // Buyers
  'Agarwal Trading Co.', 'Shri Balaji Enterprises', 'Patel Commodities Pvt Ltd',
  'Gupta & Sons', 'Maheshwari Brothers', 'Rajasthan Dal Mills',
  'Mumbai Grain Traders', 'Delhi Pulse House', 'Indore Agri Corp',
  'Hyderabad Oil Mills', 'Jain Udyog', 'National Commodities',
  'Pioneer Agro Industries', 'Shree Ganesh Trading', 'K.L. Agrawal & Co.',
  // Sellers
  'Nanded Farmers Coop', 'Latur Krushi Mandal', 'Marathwada Grain Assoc',
  'Vidarbha Agro Traders', 'Solapur Seeds Ltd', 'Nagpur Oil Millers',
  'Washim Traders Pvt Ltd', 'Akola Agri Produce', 'Amravati Grain Market',
  'Yavatmal Kisan Sangh', 'Beed Commodity House', 'Osmanabad Agro Trading',
  // Brokers
  'R.K. Brokerage Services', 'S.S. Commission Agent', 'Madhav Dalali Services',
  'Vijay Brokerage House', 'Ashok Commission Agency', 'Nanded Broking Co.',
  // Transporters
  'Shri Ram Transport', 'Jai Bhavani Logistics', 'Mahalaxmi Carriers',
  'Deccan Transport Co.', 'Godavari Freight Services', 'Sahyadri Logistics',
];

const PLACES = ['Nanded', 'Latur', 'Mumbai', 'Pune', 'Indore', 'Delhi', 'Hyderabad', 'Nagpur', 'Solapur', 'Akola', 'Amravati', 'Aurangabad'];
const STATES = ['Maharashtra', 'Madhya Pradesh', 'Delhi', 'Telangana', 'Rajasthan', 'Gujarat', 'Karnataka'];
const DELIVERY_TERMS = ['Ex-Mill', 'Ex-Godown', 'FOR Destination', 'FCA Origin', 'CIF Nanded', 'Ex-Factory'];
const TRUCK_PREFIXES = ['MH26', 'MH24', 'MH31', 'MH12', 'MH04', 'MH14', 'MP09', 'RJ14', 'GJ03'];
const BANKS = ['SBI', 'Bank of Maharashtra', 'HDFC Bank', 'ICICI Bank', 'PNB', 'Axis Bank', 'Union Bank'];

// ── Fiscal Year Boundaries ──
const FY_RANGES = [
  { label: 'FY 2023-24', start: '2023-04-01T00:00:00.000Z', end: '2024-03-31T23:59:59.000Z', isLocked: true, isCurrent: false, startD: new Date('2023-04-01'), endD: new Date('2024-03-31') },
  { label: 'FY 2024-25', start: '2024-04-01T00:00:00.000Z', end: '2025-03-31T23:59:59.000Z', isLocked: true, isCurrent: false, startD: new Date('2024-04-01'), endD: new Date('2025-03-31') },
  { label: 'FY 2025-26', start: '2025-04-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z', isLocked: false, isCurrent: true, startD: new Date('2025-04-01'), endD: new Date('2026-03-31') },
];

async function seed() {
  console.log('🧹 Wiping all existing data...');
  
  // Drop all tables in dependency order
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

  // Drop enums (they might conflict)
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

  console.log('✅ All tables dropped');
  console.log('🔧 Pushing fresh schema via drizzle-kit...');

  // We need to push the schema first. We'll use drizzle-kit push programmatically
  // But since we're in a script, let's just create tables manually using raw SQL
  // Actually, let's just let the script push schema first, then seed.
  // The caller should run `npx drizzle-kit push` before this script.
  // For safety, let's try to create what we need:

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

  // Companies
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

  // Fiscal Years
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

  // Users
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

  // User Company Access
  await db.execute(sql`
    CREATE TABLE user_company_access (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      granted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX unq_user_company ON user_company_access(user_id, company_id)`);

  // Audit Log
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

  // States, Districts, Cities
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

  // Parties
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
  await db.execute(sql`CREATE INDEX idx_parties_company_id ON parties(company_id)`);

  // Party sub-tables
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

  // Commodity Groups & Commodities
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

  // Contracts
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

  // Deliveries
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

  // Bills
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

  // Payments
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

  // Ledger
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

  // Try to create trigram extension (may already exist)
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await db.execute(sql`CREATE INDEX idx_parties_name_trgm ON parties USING gin (name gin_trgm_ops)`);
    await db.execute(sql`CREATE INDEX idx_commodities_name_trgm ON commodities USING gin (name gin_trgm_ops)`);
    await db.execute(sql`CREATE INDEX idx_cities_name_trgm ON cities USING gin (name gin_trgm_ops)`);
  } catch (e) {
    console.log('⚠️ pg_trgm extension not available, skipping trigram indexes');
  }

  console.log('✅ All tables created');

  // ════════════════════════════════════════
  // SEED DATA
  // ════════════════════════════════════════

  // 1. Companies
  console.log('🏢 Seeding companies...');
  const companyIds: number[] = [];
  for (const c of COMPANIES) {
    const [row] = await db.execute(sql`
      INSERT INTO companies (name, short_code, description) VALUES (${c.name}, ${c.shortCode}, ${c.description}) RETURNING id
    `);
    companyIds.push((row as any).id);
  }
  console.log(`   Created ${companyIds.length} companies`);

  // 2. Fiscal Years
  console.log('📅 Seeding fiscal years...');
  const fyMap: Record<number, { id: number; label: string; startD: Date; endD: Date }[]> = {};
  for (const compId of companyIds) {
    fyMap[compId] = [];
    for (const fy of FY_RANGES) {
      const [row] = await db.execute(sql`
        INSERT INTO fiscal_years (company_id, label, start_date, end_date, is_current, is_locked)
        VALUES (${compId}, ${fy.label}, ${fy.start}, ${fy.end}, ${fy.isCurrent}, ${fy.isLocked}) RETURNING id
      `);
      fyMap[compId].push({ id: (row as any).id, label: fy.label, startD: fy.startD, endD: fy.endD });
    }
  }
  console.log(`   Created ${companyIds.length * FY_RANGES.length} fiscal years`);

  // 3. Admin User
  console.log('👤 Seeding admin user...');
  const adminPerms = {
    contracts: { read: true, write: true, delete: true },
    deliveries: { read: true, write: true, delete: true },
    bills: { read: true, write: true, delete: true },
    payments: { read: true, write: true, delete: true },
    ledger: { read: true, write: true, delete: true },
    parties: { read: true, write: true, delete: true },
    commodities: { read: true, write: true, delete: true },
    analytics: { read: true },
    audit_meta: { read: true },
    admin: { read: true, write: true },
  };

  const pwHash = hashPassword('gccnanded@123');
  const [adminRow] = await db.execute(sql`
    INSERT INTO users (username, password_hash, display_name, role, permissions)
    VALUES ('gccnanded', ${pwHash}, 'GCC Admin', 'ADMIN', ${JSON.stringify(adminPerms)}::jsonb) RETURNING id
  `);
  const adminId = (adminRow as any).id;

  // Grant admin access to all companies
  for (const compId of companyIds) {
    await db.execute(sql`
      INSERT INTO user_company_access (user_id, company_id) VALUES (${adminId}, ${compId})
    `);
  }
  console.log(`   Created admin user (id=${adminId}), granted access to ${companyIds.length} companies`);

  // 4. Parties
  console.log('👥 Seeding parties...');
  const partyIds: number[] = [];
  for (let i = 0; i < PARTY_NAMES.length; i++) {
    const name = PARTY_NAMES[i];
    const place = randomFrom(PLACES);
    const state = randomFrom(STATES);
    const phone = `0${randomInt(20, 99)}${randomInt(1000000, 9999999)}`;
    const mobile = `9${randomInt(100000000, 999999999)}`;
    const creditLimit = randomDecimal(50000, 5000000);

    const [row] = await db.execute(sql`
      INSERT INTO parties (name, place, state_name, phone, sms_mobile, credit_limit, address, created_by)
      VALUES (${name}, ${place}, ${state}, ${phone}, ${mobile}, ${creditLimit}, ${`${randomInt(1,500)}, Market Yard, ${place}`}, ${adminId})
      RETURNING id
    `);
    const partyId = (row as any).id;
    partyIds.push(partyId);

    // Assign roles based on position in array
    const roles: string[] = [];
    if (i < 15) { roles.push('BUYER'); if (i < 8) roles.push('SELLER'); }
    else if (i < 27) { roles.push('SELLER'); }
    else if (i < 33) { roles.push('BUYER_BROKER'); roles.push('SELLER_BROKER'); }
    // rest are transporters — no party_role, just used as transporter

    for (const role of roles) {
      await db.execute(sql`INSERT INTO party_roles (party_id, role) VALUES (${partyId}, ${role}::party_role)`);
    }

    // Add a GSTIN for some
    if (i < 30) {
      const gstin = `27${String(i).padStart(10, '0')}${randomInt(1,9)}Z${randomInt(1,9)}`;
      await db.execute(sql`INSERT INTO party_tax_ids (party_id, tax_type, tax_value) VALUES (${partyId}, 'GSTIN', ${gstin})`);
    }
  }
  console.log(`   Created ${partyIds.length} parties`);

  // Separate party groups by role for contracts
  const buyerIds = partyIds.slice(0, 15);
  const sellerIds = partyIds.slice(15, 27);
  const brokerIds = partyIds.slice(27, 33);
  const transporterIds = partyIds.slice(33);

  // 5. Commodities
  console.log('📦 Seeding commodities...');
  const commodityMap: Record<string, number[]> = {};
  for (const [compCode, items] of Object.entries(COMMODITIES_PER_COMPANY)) {
    commodityMap[compCode] = [];
    for (const item of items) {
      // Check if already exists (cross-company sharing)
      const existing = await db.execute(sql`SELECT id FROM commodities WHERE name = ${item.name} LIMIT 1`);
      let commodityId: number;
      if (existing.length > 0) {
        commodityId = (existing[0] as any).id;
      } else {
        const [row] = await db.execute(sql`
          INSERT INTO commodities (name, short_name, unit, hsn_code, is_shared)
          VALUES (${item.name}, ${item.shortName}, ${item.unit}, ${item.hsnCode}, true) RETURNING id
        `);
        commodityId = (row as any).id;

        // Add packaging
        await db.execute(sql`
          INSERT INTO commodity_packaging (commodity_id, packing_weight, packing_type, seller_brokerage_rate, buyer_brokerage_rate)
          VALUES (${commodityId}, 50, 'Bag (50kg)', ${randomDecimal(0.5, 2.5)}, ${randomDecimal(0.5, 2.5)})
        `);
        await db.execute(sql`
          INSERT INTO commodity_packaging (commodity_id, packing_weight, packing_type, seller_brokerage_rate, buyer_brokerage_rate)
          VALUES (${commodityId}, 100, 'Bag (100kg)', ${randomDecimal(0.5, 2.5)}, ${randomDecimal(0.5, 2.5)})
        `);
      }
      commodityMap[compCode].push(commodityId);
    }
  }
  const totalCommodities = Object.values(commodityMap).flat().length;
  console.log(`   Created commodities mapped to ${Object.keys(commodityMap).length} companies`);

  // 6. Contracts, Deliveries, Bills, Payments, Ledger — per company, per FY
  for (let ci = 0; ci < companyIds.length; ci++) {
    const compId = companyIds[ci];
    const comp = COMPANIES[ci];
    const compCommodityIds = commodityMap[comp.shortCode];

    console.log(`\n🏢 Seeding data for ${comp.name}...`);

    // Only seed for FY 2024-25 and FY 2025-26 (skip locked FY 2023-24 for volume)
    const activeFYs = fyMap[compId].slice(1); // FY 2024-25, FY 2025-26

    for (const fyRec of activeFYs) {
      const fy = { ...fyRec, start: fyRec.startD, end: fyRec.endD };
      const numContracts = randomInt(25, 40);
      console.log(`   📋 ${fy.label}: Seeding ${numContracts} contracts...`);

      const contractLineIds: number[] = [];
      const contractIds: number[] = [];
      const contractPartyMap: Record<number, number> = {}; // contractId -> buyerPartyId

      for (let s = 1; s <= numContracts; s++) {
        const saudaDate = randomDate(fy.start, fy.end);
        const buyer = randomFrom(buyerIds);
        const seller = randomFrom(sellerIds);
        const broker = randomFrom(brokerIds);
        const commodity = randomFrom(compCommodityIds);
        const weight = randomDecimal(50, 500, 3);
        const rate = randomDecimal(3000, 15000);
        const amount = (parseFloat(weight) * parseFloat(rate)).toFixed(2);
        const numLorries = randomInt(1, 5);
        const deliveryTerm = randomFrom(DELIVERY_TERMS);
        const status = Math.random() < 0.1 ? 'COMPLETED' : 'ACTIVE';

        const [contractRow] = await db.execute(sql`
          INSERT INTO contracts (company_id, fiscal_year_id, sauda_no, sauda_book, sauda_date, status, delivery_term,
            payment_term_type, payment_days, approx_weight, origin_station, destination_station, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${s}, 'Main Book', ${saudaDate.toString()}, ${status}::contract_status, ${deliveryTerm},
            ${randomFrom(['DISCOUNT', 'CREDIT', 'PAYMENT'])}::payment_term_type, ${randomInt(7, 45)}, ${weight}, ${randomFrom(PLACES)}, ${randomFrom(PLACES)}, ${adminId}, ${saudaDate.toString()})
          RETURNING id
        `);
        const contractId = (contractRow as any).id;
        contractIds.push(contractId);
        contractPartyMap[contractId] = buyer;

        // Contract parties
        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${buyer}, 'BUYER')`);
        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${seller}, 'SELLER')`);
        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${broker}, 'SELLER_BROKER')`);

        // Contract line
        const [lineRow] = await db.execute(sql`
          INSERT INTO contract_lines (contract_id, commodity_id, number_of_lorries, weight_quintals, rate, amount, quantity_bags)
          VALUES (${contractId}, ${commodity}, ${numLorries}, ${weight}, ${rate}, ${amount}, ${Math.floor(parseFloat(weight) * 2)})
          RETURNING id
        `);
        contractLineIds.push((lineRow as any).id);
      }

      // Deliveries
      const numDeliveries = Math.min(contractLineIds.length * 2, randomInt(35, 60));
      console.log(`   🚛 ${fy.label}: Seeding ${numDeliveries} deliveries...`);

      const deliveryIds: number[] = [];
      for (let d = 0; d < numDeliveries; d++) {
        const clId = randomFrom(contractLineIds);
        const dispatchDate = randomDate(fy.start, fy.end);
        const transporter = randomFrom(transporterIds);
        const truckNo = `${randomFrom(TRUCK_PREFIXES)} ${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(1000, 9999)}`;
        const dispatchedWeight = randomDecimal(20, 150, 3);
        const status = randomFrom(['DISPATCHED', 'DELIVERED', 'DELIVERED', 'DELIVERED']);

        const [delRow] = await db.execute(sql`
          INSERT INTO deliveries (company_id, fiscal_year_id, dispatch_date, truck_no, transporter_id, status,
            advance_payment_collected, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${dispatchDate.toString()}, ${truckNo}, ${transporter}, ${status}::delivery_status,
            ${Math.random() < 0.3 ? randomDecimal(5000, 50000) : null}, ${adminId}, ${dispatchDate.toString()})
          RETURNING id
        `);
        const deliveryId = (delRow as any).id;
        deliveryIds.push(deliveryId);

        // Delivery line
        await db.execute(sql`
          INSERT INTO delivery_lines (delivery_id, contract_line_id, dispatched_weight, dispatched_bags)
          VALUES (${deliveryId}, ${clId}, ${dispatchedWeight}, ${Math.floor(parseFloat(dispatchedWeight) * 2)})
        `);

        // Occasional freight charges
        if (Math.random() < 0.4) {
          await db.execute(sql`
            INSERT INTO delivery_charges (delivery_id, charge_type, amount)
            VALUES (${deliveryId}, 'FREIGHT_ADVANCE', ${randomDecimal(2000, 15000)})
          `);
        }
      }

      // Bills
      const numBills = randomInt(15, 30);
      console.log(`   🧾 ${fy.label}: Seeding ${numBills} bills...`);

      const billRecords: { id: number; partyId: number; total: number; balance: number }[] = [];
      for (let b = 1; b <= numBills; b++) {
        const billDate = randomDate(fy.start, fy.end);
        const partyId = randomFrom(buyerIds);
        const totalAmount = randomDecimal(50000, 1500000);
        const paid = Math.random() < 0.6 ? parseFloat(randomDecimal(0, parseFloat(totalAmount))) : 0;
        const balance = (parseFloat(totalAmount) - paid).toFixed(2);
        const basis = randomFrom(['CONTRACT', 'DELIVERY', 'DALALI', 'DIRECT'] as const);
        const billNo = `${comp.shortCode.substring(0, 3)}/${fy.label.replace('FY ', '')}/${String(b).padStart(4, '0')}`;

        const [billRow] = await db.execute(sql`
          INSERT INTO bills (company_id, fiscal_year_id, bill_no, bill_date, party_id, basis, total_amount, balance_amount, credit_days, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${billNo}, ${billDate.toString()}, ${partyId}, ${basis}::bill_basis, ${totalAmount}, ${balance}, ${randomInt(15, 60)}, ${adminId}, ${billDate.toString()})
          RETURNING id
        `);
        const billId = (billRow as any).id;
        billRecords.push({ id: billId, partyId, total: parseFloat(totalAmount), balance: parseFloat(balance) });

        // Bill line
        await db.execute(sql`
          INSERT INTO bill_lines (bill_id, description, amount, reference_type, reference_id)
          VALUES (${billId}, ${'Brokerage for ' + comp.name}, ${totalAmount}, ${basis === 'CONTRACT' ? 'CONTRACT' : 'DELIVERY'}, ${randomFrom(basis === 'CONTRACT' ? contractIds : deliveryIds)})
        `);
      }

      // Payments
      const numPayments = randomInt(10, 25);
      console.log(`   💰 ${fy.label}: Seeding ${numPayments} payments...`);

      for (let p = 0; p < numPayments; p++) {
        const billRec = randomFrom(billRecords.filter(b => b.balance > 0));
        if (!billRec) continue;
        const paymentDate = randomDate(fy.start, fy.end);
        const instrument = randomFrom(['CHEQUE', 'NEFT', 'RTGS', 'CASH']);
        const payAmount = Math.min(billRec.balance, parseFloat(randomDecimal(10000, Math.min(billRec.balance, 500000)))).toFixed(2);

        const [payRow] = await db.execute(sql`
          INSERT INTO payments (company_id, fiscal_year_id, payment_date, party_id, instrument_type, instrument_no, amount, deposited_bank, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${paymentDate.toString()}, ${billRec.partyId}, ${instrument},
            ${instrument === 'CHEQUE' ? `CHQ${randomInt(100000, 999999)}` : instrument === 'NEFT' ? `NEFT${randomInt(1000000, 9999999)}` : null},
            ${payAmount}, ${randomFrom(BANKS)}, ${adminId}, ${paymentDate.toString()})
          RETURNING id
        `);
        const paymentId = (payRow as any).id;

        // Payment allocation
        await db.execute(sql`
          INSERT INTO payment_allocations (payment_id, bill_id, allocated_amount)
          VALUES (${paymentId}, ${billRec.id}, ${payAmount})
        `);

        // Update bill balance
        billRec.balance -= parseFloat(payAmount);
        await db.execute(sql`UPDATE bills SET balance_amount = ${billRec.balance.toFixed(2)} WHERE id = ${billRec.id}`);

        // Ledger entries
        await db.execute(sql`
          INSERT INTO ledger (company_id, fiscal_year_id, transaction_date, account_id, source_type, source_id, debit, credit, narration, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${paymentDate.toString()}, ${billRec.partyId}, 'PAYMENT', ${paymentId}, ${payAmount}, '0.00', ${'Payment received via ' + instrument}, ${adminId}, ${paymentDate.toString()})
        `);
      }

      // Ledger entries for bills (debit side)
      for (const bill of billRecords) {
        const billDate = randomDate(fy.start, fy.end);
        await db.execute(sql`
          INSERT INTO ledger (company_id, fiscal_year_id, transaction_date, account_id, source_type, source_id, debit, credit, narration, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${billDate.toString()}, ${bill.partyId}, 'BILL', ${bill.id}, '0.00', ${bill.total.toFixed(2)}, ${'Bill raised - ' + comp.name}, ${adminId}, ${billDate.toString()})
        `);
      }
    }

    console.log(`   ✅ ${comp.name} seeding complete`);
  }

  // 7. Location masters
  console.log('\n🌍 Seeding location masters...');
  const [mhRow] = await db.execute(sql`INSERT INTO states (name) VALUES ('Maharashtra') RETURNING id`);
  const mhId = (mhRow as any).id;
  const [mpRow] = await db.execute(sql`INSERT INTO states (name) VALUES ('Madhya Pradesh') RETURNING id`);
  const mpId = (mpRow as any).id;

  const districts = [
    { stateId: mhId, name: 'Nanded' }, { stateId: mhId, name: 'Latur' },
    { stateId: mhId, name: 'Pune' }, { stateId: mhId, name: 'Mumbai Suburban' },
    { stateId: mhId, name: 'Nagpur' }, { stateId: mhId, name: 'Solapur' },
    { stateId: mpId, name: 'Indore' },
  ];
  for (const d of districts) {
    const [dRow] = await db.execute(sql`INSERT INTO districts (state_id, name) VALUES (${d.stateId}, ${d.name}) RETURNING id`);
    const dId = (dRow as any).id;
    // Add a city for each district
    await db.execute(sql`INSERT INTO cities (district_id, name, pincode) VALUES (${dId}, ${d.name + ' City'}, ${`${randomInt(400000, 500000)}`})`);
  }
  console.log('   ✅ Location masters seeded');

  console.log('\n════════════════════════════════════════');
  console.log('  🎉 SEED COMPLETE!');
  console.log('════════════════════════════════════════');
  console.log(`  Companies: ${companyIds.length}`);
  console.log(`  Fiscal Years: ${companyIds.length * FY_RANGES.length}`);
  console.log(`  Admin User: gccnanded / gccnanded@123`);
  console.log(`  Parties: ${partyIds.length}`);
  console.log('  Data seeded per company per active FY:');
  console.log('    ~25-40 contracts, ~35-60 deliveries');
  console.log('    ~15-30 bills, ~10-25 payments, ledger entries');
  console.log('════════════════════════════════════════\n');

  await client.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
