/**
 * Seed Script — Multi-Company & Marketplace Data Seeder
 * 
 * Wipes ALL existing data and seeds:
 * - 4 Companies (GCC Pulses, GCC Soybean & Wheat, GCC Oil & Cottonseed Cake, MAFI)
 * - 3 Fiscal Years per company (FY 2023-24 locked, FY 2024-25 locked, FY 2025-26 active)
 * - 1 Admin user (gccnanded / gccnanded@123)
 * - Realistic location masters (Maharashtra, MP states, districts, cities)
 * - Realistic parties, commodities, contracts, deliveries, bills, payments, ledger
 * - Marketplace Members (buyer, seller, trader)
 * - Marketplace Listings (open, tenders), Bids, Chats, and Chat Messages
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

// ── Data Constants ──
const COMPANIES = [
  { name: 'GCC Pulses', shortCode: 'PULSES', description: 'Pulses division - Moong, Chana, Tur, Urad, Masoor' },
  { name: 'GCC Soywheat', shortCode: 'SOYWHEAT', description: 'Soybean, Wheat, and Bajra trading' },
  { name: 'GCC Oilcake', shortCode: 'OILCAKE', description: 'Edible oils and cottonseed oil cake' },
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
  ],
  'SOYWHEAT': [
    { name: 'Soybean', unit: 'Quintal', hsnCode: '12011000', shortName: 'SOY' },
    { name: 'Soybean Meal', unit: 'Quintal', hsnCode: '23040000', shortName: 'SOYMEAL' },
    { name: 'Wheat', unit: 'Quintal', hsnCode: '10011990', shortName: 'WHEAT' },
    { name: 'Wheat Flour (Atta)', unit: 'Quintal', hsnCode: '11010000', shortName: 'ATTA' },
    { name: 'Bajra', unit: 'Quintal', hsnCode: '10082900', shortName: 'BAJRA' },
  ],
  'OILCAKE': [
    { name: 'Groundnut Oil', unit: 'Litre', hsnCode: '15081000', shortName: 'GNOIL' },
    { name: 'Soybean Oil', unit: 'Litre', hsnCode: '15071000', shortName: 'SOYOIL' },
    { name: 'Cottonseed Oil', unit: 'Litre', hsnCode: '15122100', shortName: 'CSOL' },
    { name: 'Cottonseed Cake', unit: 'Quintal', hsnCode: '23061000', shortName: 'CSCAKE' },
  ],
  'MAFI': [
    { name: 'MAFI Grade A', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-A' },
    { name: 'MAFI Grade B', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-B' },
    { name: 'MAFI Premium', unit: 'Quintal', hsnCode: '23099090', shortName: 'MAFI-P' },
  ],
};

const PARTY_NAMES = [
  // Buyers
  'Agarwal Trading Co.', 'Shri Balaji Enterprises', 'Patel Commodities Pvt Ltd',
  'Gupta & Sons', 'Maheshwari Brothers', 'Rajasthan Dal Mills',
  'Mumbai Grain Traders', 'Delhi Pulse House', 'Indore Agri Corp',
  'Hyderabad Oil Mills', 'Jain Udyog', 'National Commodities',
  // Sellers
  'Nanded Farmers Coop', 'Latur Krushi Mandal', 'Marathwada Grain Assoc',
  'Vidarbha Agro Traders', 'Solapur Seeds Ltd', 'Nagpur Oil Millers',
  'Washim Traders Pvt Ltd', 'Akola Agri Produce', 'Amravati Grain Market',
  // Brokers
  'R.K. Brokerage Services', 'S.S. Commission Agent', 'Madhav Dalali Services',
  'Vijay Brokerage House', 'Ashok Commission Agency',
  // Transporters
  'Shri Ram Transport', 'Jai Bhavani Logistics', 'Mahalaxmi Carriers',
  'Deccan Transport Co.',
];

const PLACES = ['Nanded', 'Latur', 'Mumbai', 'Pune', 'Indore', 'Delhi', 'Hyderabad', 'Nagpur', 'Solapur', 'Akola'];
const STATES = ['Maharashtra', 'Madhya Pradesh', 'Delhi', 'Telangana', 'Rajasthan', 'Gujarat'];
const DELIVERY_TERMS = ['Ex-Mill', 'Ex-Godown', 'FOR Destination', 'FCA Origin', 'Ex-Factory'];
const TRUCK_PREFIXES = ['MH26', 'MH24', 'MH31', 'MH12', 'MH04', 'MP09', 'RJ14'];
const BANKS = ['SBI', 'Bank of Maharashtra', 'HDFC Bank', 'ICICI Bank', 'Axis Bank'];

// ── Fiscal Year Boundaries ──
const FY_RANGES = [
  { label: 'FY 2023-24', start: '2023-04-01T00:00:00.000Z', end: '2024-03-31T23:59:59.000Z', isLocked: true, isCurrent: false, startD: new Date('2023-04-01'), endD: new Date('2024-03-31') },
  { label: 'FY 2024-25', start: '2024-04-01T00:00:00.000Z', end: '2025-03-31T23:59:59.000Z', isLocked: true, isCurrent: false, startD: new Date('2024-04-01'), endD: new Date('2025-03-31') },
  { label: 'FY 2025-26', start: '2025-04-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z', isLocked: false, isCurrent: true, startD: new Date('2025-04-01'), endD: new Date('2026-03-31') },
];

async function seed() {
  console.log('🧹 Wiping all existing data via Truncation...');

  try {
    await db.execute(sql`
      TRUNCATE TABLE 
        chat_messages,
        chats,
        bids,
        watchlist,
        listings,
        members,
        ledger,
        payment_allocations,
        payments,
        bill_lines,
        bills,
        delivery_charges,
        delivery_lines,
        deliveries,
        contract_lines,
        contract_parties,
        contracts,
        commodity_specifications,
        commodity_packaging,
        commodities,
        commodity_groups,
        party_contacts,
        party_bank_details,
        party_delivery_addresses,
        party_tax_ids,
        party_roles,
        parties,
        cities,
        districts,
        states,
        user_company_access,
        fiscal_years,
        users,
        companies,
        audit_log
      RESTART IDENTITY CASCADE;
    `);
    console.log('✅ Database truncated successfully.');
  } catch (err) {
    console.error('❌ Truncation failed. Tables might not exist yet.');
    console.error('   Running CREATE EXTENSION and assuming schema is in sync...');
    throw err;
  }

  // Ensure pg_trgm is present (safe to call multiple times)
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  } catch (e) {
    console.log('⚠️ Could not run CREATE EXTENSION IF NOT EXISTS pg_trgm:', e);
  }

  // ════════════════════════════════════════
  // 1. Companies
  // ════════════════════════════════════════
  console.log('🏢 Seeding companies...');
  const companyIds: number[] = [];
  for (const c of COMPANIES) {
    const [row] = await db.execute(sql`
      INSERT INTO companies (name, short_code, description) VALUES (${c.name}, ${c.shortCode}, ${c.description}) RETURNING id
    `);
    companyIds.push((row as any).id);
  }
  console.log(`   Created ${companyIds.length} companies`);

  // ════════════════════════════════════════
  // 2. Fiscal Years
  // ════════════════════════════════════════
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

  // ════════════════════════════════════════
  // 3. Admin User
  // ════════════════════════════════════════
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

  // ════════════════════════════════════════
  // 4. Location Masters
  // ════════════════════════════════════════
  console.log('🌍 Seeding location masters...');
  const [mhRow] = await db.execute(sql`INSERT INTO states (name) VALUES ('Maharashtra') RETURNING id`);
  const mhId = (mhRow as any).id;
  const [mpRow] = await db.execute(sql`INSERT INTO states (name) VALUES ('Madhya Pradesh') RETURNING id`);
  const mpId = (mpRow as any).id;

  const districts = [
    { stateId: mhId, name: 'Nanded' }, { stateId: mhId, name: 'Latur' },
    { stateId: mhId, name: 'Pune' }, { stateId: mhId, name: 'Nagpur' },
    { stateId: mhId, name: 'Solapur' }, { stateId: mpId, name: 'Indore' },
  ];
  const cityIds: number[] = [];
  for (const d of districts) {
    const [dRow] = await db.execute(sql`INSERT INTO districts (state_id, name) VALUES (${d.stateId}, ${d.name}) RETURNING id`);
    const dId = (dRow as any).id;
    const [cRow] = await db.execute(sql`
      INSERT INTO cities (district_id, name, pincode) VALUES (${dId}, ${d.name + ' City'}, ${`${randomInt(400000, 500000)}`}) RETURNING id
    `);
    cityIds.push((cRow as any).id);
  }
  console.log(`   Created ${cityIds.length} cities`);

  // ════════════════════════════════════════
  // 5. Parties
  // ════════════════════════════════════════
  console.log('👥 Seeding parties...');
  const partyIds: number[] = [];
  for (let i = 0; i < PARTY_NAMES.length; i++) {
    const name = PARTY_NAMES[i];
    const place = randomFrom(PLACES);
    const state = randomFrom(STATES);
    const phone = `0${randomInt(20, 99)}${randomInt(1000000, 9999999)}`;
    const mobile = `9${randomInt(100000000, 999999999)}`;
    const creditLimit = randomDecimal(50000, 5000000);
    const cityId = randomFrom(cityIds);

    const [row] = await db.execute(sql`
      INSERT INTO parties (name, place, state_name, phone, sms_mobile, credit_limit, address, city_id, created_by)
      VALUES (${name}, ${place}, ${state}, ${phone}, ${mobile}, ${creditLimit}, ${`${randomInt(1, 500)}, Market Yard, ${place}`}, ${cityId}, ${adminId})
      RETURNING id
    `);
    const partyId = (row as any).id;
    partyIds.push(partyId);

    const roles: string[] = [];
    if (i < 12) { roles.push('BUYER'); if (i < 6) roles.push('SELLER'); }
    else if (i < 21) { roles.push('SELLER'); }
    else if (i < 26) { roles.push('BUYER_BROKER'); roles.push('SELLER_BROKER'); }

    for (const role of roles) {
      await db.execute(sql`INSERT INTO party_roles (party_id, role) VALUES (${partyId}, ${role}::party_role)`);
    }

    if (i < 25) {
      const gstin = `27${String(i).padStart(10, '0')}${randomInt(1, 9)}Z${randomInt(1, 9)}`;
      await db.execute(sql`INSERT INTO party_tax_ids (party_id, tax_type, tax_value) VALUES (${partyId}, 'GSTIN', ${gstin})`);
    }
  }
  console.log(`   Created ${partyIds.length} parties`);

  const buyerIds = partyIds.slice(0, 12);
  const sellerIds = partyIds.slice(12, 21);
  const brokerIds = partyIds.slice(21, 26);
  const transporterIds = partyIds.slice(26);

  // ════════════════════════════════════════
  // 6. Commodities
  // ════════════════════════════════════════
  console.log('📦 Seeding commodities...');
  const commodityMap: Record<string, number[]> = {};
  for (const [compCode, items] of Object.entries(COMMODITIES_PER_COMPANY)) {
    commodityMap[compCode] = [];
    for (const item of items) {
      const existing = await db.execute(sql`SELECT id FROM commodities WHERE name = ${item.name} LIMIT 1`);
      let commodityId: number;
      if (existing.length > 0) {
        commodityId = (existing[0] as any).id;
      } else {
        const volTier = randomFrom(['LOW', 'MEDIUM', 'HIGH']);
        const [row] = await db.execute(sql`
          INSERT INTO commodities (name, short_name, unit, hsn_code, is_shared, volatility_tier)
          VALUES (${item.name}, ${item.shortName}, ${item.unit}, ${item.hsnCode}, true, ${volTier}::volatility_tier) RETURNING id
        `);
        commodityId = (row as any).id;

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
  console.log(`   Created commodities`);

  // ════════════════════════════════════════
  // 7. Contracts, Deliveries, Bills, Payments, Ledger
  // ════════════════════════════════════════
  for (let ci = 0; ci < companyIds.length; ci++) {
    const compId = companyIds[ci];
    const comp = COMPANIES[ci];
    const compCommodityIds = commodityMap[comp.shortCode];

    console.log(`\n🏢 Seeding transaction data for ${comp.name}...`);
    const activeFYs = fyMap[compId].slice(1); // Seed for FY 2024-25, FY 2025-26

    for (const fyRec of activeFYs) {
      const fy = { ...fyRec, start: fyRec.startD, end: fyRec.endD };
      const numContracts = randomInt(15, 25);
      console.log(`   📋 ${fy.label}: Generating ${numContracts} contracts...`);

      const contractLineIds: number[] = [];
      const contractIds: number[] = [];
      const contractPartyMap: Record<number, number> = {}; 

      for (let s = 1; s <= numContracts; s++) {
        const saudaDate = randomDate(fy.start, fy.end);
        const buyer = randomFrom(buyerIds);
        const seller = randomFrom(sellerIds);
        const broker = randomFrom(brokerIds);
        const commodity = randomFrom(compCommodityIds);
        const weight = randomDecimal(50, 300, 3);
        const rate = randomDecimal(3000, 12000);
        const amount = (parseFloat(weight) * parseFloat(rate)).toFixed(2);
        const numLorries = randomInt(1, 4);
        const deliveryTerm = randomFrom(DELIVERY_TERMS);
        const status = Math.random() < 0.15 ? 'COMPLETED' : 'ACTIVE';

        const [contractRow] = await db.execute(sql`
          INSERT INTO contracts (company_id, fiscal_year_id, sauda_no, sauda_book, sauda_date, status, delivery_term,
            payment_term_type, payment_days, approx_weight, origin_station, destination_station, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${s}, 'Main Book', ${saudaDate}, ${status}::contract_status, ${deliveryTerm},
            ${randomFrom(['DISCOUNT', 'CREDIT', 'PAYMENT'])}::payment_term_type, ${randomInt(7, 30)}, ${weight}, ${randomFrom(PLACES)}, ${randomFrom(PLACES)}, ${adminId}, ${saudaDate})
          RETURNING id
        `);
        const contractId = (contractRow as any).id;
        contractIds.push(contractId);
        contractPartyMap[contractId] = buyer;

        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${buyer}, 'BUYER')`);
        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${seller}, 'SELLER')`);
        await db.execute(sql`INSERT INTO contract_parties (contract_id, party_id, role) VALUES (${contractId}, ${broker}, 'SELLER_BROKER')`);

        const packRows = await db.execute(sql`SELECT id FROM commodity_packaging WHERE commodity_id = ${commodity} LIMIT 1`);
        const packId = packRows.length > 0 ? (packRows[0] as any).id : null;

        const [lineRow] = await db.execute(sql`
          INSERT INTO contract_lines (contract_id, commodity_id, packaging_id, number_of_lorries, weight_quintals, rate, amount, quantity_bags)
          VALUES (${contractId}, ${commodity}, ${packId}, ${numLorries}, ${weight}, ${rate}, ${amount}, ${Math.floor(parseFloat(weight) * 2)})
          RETURNING id
        `);
        contractLineIds.push((lineRow as any).id);
      }

      // Deliveries
      const numDeliveries = Math.min(contractLineIds.length * 2, randomInt(20, 35));
      console.log(`   🚛 ${fy.label}: Generating ${numDeliveries} deliveries...`);

      const deliveryIds: number[] = [];
      for (let d = 0; d < numDeliveries; d++) {
        const clId = randomFrom(contractLineIds);
        const dispatchDate = randomDate(fy.start, fy.end);
        const transporter = randomFrom(transporterIds);
        const truckNo = `${randomFrom(TRUCK_PREFIXES)} ${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))} ${randomInt(1000, 9999)}`;
        const dispatchedWeight = randomDecimal(20, 100, 3);
        const status = randomFrom(['DISPATCHED', 'DELIVERED', 'DELIVERED']);

        const [delRow] = await db.execute(sql`
          INSERT INTO deliveries (company_id, fiscal_year_id, dispatch_date, truck_no, transporter_id, status,
            advance_payment_collected, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${dispatchDate}, ${truckNo}, ${transporter}, ${status}::delivery_status,
            ${Math.random() < 0.3 ? randomDecimal(5000, 25000) : null}, ${adminId}, ${dispatchDate})
          RETURNING id
        `);
        const deliveryId = (delRow as any).id;
        deliveryIds.push(deliveryId);

        await db.execute(sql`
          INSERT INTO delivery_lines (delivery_id, contract_line_id, dispatched_weight, dispatched_bags)
          VALUES (${deliveryId}, ${clId}, ${dispatchedWeight}, ${Math.floor(parseFloat(dispatchedWeight) * 2)})
        `);

        if (Math.random() < 0.35) {
          await db.execute(sql`
            INSERT INTO delivery_charges (delivery_id, charge_type, amount)
            VALUES (${deliveryId}, 'FREIGHT_ADVANCE', ${randomDecimal(2000, 8000)})
          `);
        }
      }

      // Bills
      const numBills = randomInt(10, 18);
      console.log(`   🧾 ${fy.label}: Generating ${numBills} bills...`);

      const billRecords: { id: number; partyId: number; total: number; balance: number }[] = [];
      for (let b = 1; b <= numBills; b++) {
        const billDate = randomDate(fy.start, fy.end);
        const partyId = randomFrom(buyerIds);
        const totalAmount = randomDecimal(50000, 800000);
        const paid = Math.random() < 0.5 ? parseFloat(randomDecimal(0, parseFloat(totalAmount))) : 0;
        const balance = (parseFloat(totalAmount) - paid).toFixed(2);
        const basis = randomFrom(['CONTRACT', 'DELIVERY', 'DALALI', 'DIRECT'] as const);
        const billNo = `${comp.shortCode.substring(0, 3)}/${fy.label.replace('FY ', '')}/${String(b).padStart(4, '0')}`;

        const [billRow] = await db.execute(sql`
          INSERT INTO bills (company_id, fiscal_year_id, bill_no, bill_date, party_id, basis, total_amount, balance_amount, credit_days, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${billNo}, ${billDate}, ${partyId}, ${basis}::bill_basis, ${totalAmount}, ${balance}, ${randomInt(15, 45)}, ${adminId}, ${billDate})
          RETURNING id
        `);
        const billId = (billRow as any).id;
        billRecords.push({ id: billId, partyId, total: parseFloat(totalAmount), balance: parseFloat(balance) });

        await db.execute(sql`
          INSERT INTO bill_lines (bill_id, description, amount, reference_type, reference_id)
          VALUES (${billId}, ${'Brokerage for ' + comp.name}, ${totalAmount}, ${basis === 'CONTRACT' ? 'CONTRACT' : 'DELIVERY'}, ${randomFrom(basis === 'CONTRACT' ? contractIds : deliveryIds)})
        `);
      }

      // Payments
      const numPayments = randomInt(8, 15);
      console.log(`   💰 ${fy.label}: Generating ${numPayments} payments...`);

      for (let p = 0; p < numPayments; p++) {
        const billRec = randomFrom(billRecords.filter(b => b.balance > 0));
        if (!billRec) continue;
        const paymentDate = randomDate(fy.start, fy.end);
        const instrument = randomFrom(['CHEQUE', 'NEFT', 'RTGS', 'CASH']);
        const payAmount = Math.min(billRec.balance, parseFloat(randomDecimal(10000, Math.min(billRec.balance, 300000)))).toFixed(2);

        const [payRow] = await db.execute(sql`
          INSERT INTO payments (company_id, fiscal_year_id, payment_date, party_id, instrument_type, instrument_no, amount, deposited_bank, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${paymentDate}, ${billRec.partyId}, ${instrument},
            ${instrument === 'CHEQUE' ? `CHQ${randomInt(100000, 999999)}` : instrument === 'NEFT' ? `NEFT${randomInt(1000000, 9999999)}` : null},
            ${payAmount}, ${randomFrom(BANKS)}, ${adminId}, ${paymentDate})
          RETURNING id
        `);
        const paymentId = (payRow as any).id;

        await db.execute(sql`
          INSERT INTO payment_allocations (payment_id, bill_id, allocated_amount)
          VALUES (${paymentId}, ${billRec.id}, ${payAmount})
        `);

        billRec.balance -= parseFloat(payAmount);
        await db.execute(sql`UPDATE bills SET balance_amount = ${billRec.balance.toFixed(2)} WHERE id = ${billRec.id}`);

        await db.execute(sql`
          INSERT INTO ledger (company_id, fiscal_year_id, transaction_date, account_id, source_type, source_id, debit, credit, narration, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${paymentDate}, ${billRec.partyId}, 'PAYMENT', ${paymentId}, ${payAmount}, '0.00', ${'Payment received via ' + instrument}, ${adminId}, ${paymentDate})
        `);
      }

      // Ledger entries for bills (debit side)
      for (const bill of billRecords) {
        const billDate = randomDate(fy.start, fy.end);
        await db.execute(sql`
          INSERT INTO ledger (company_id, fiscal_year_id, transaction_date, account_id, source_type, source_id, debit, credit, narration, created_by, created_at)
          VALUES (${compId}, ${fy.id}, ${billDate}, ${bill.partyId}, 'BILL', ${bill.id}, '0.00', ${bill.total.toFixed(2)}, ${'Bill raised - ' + comp.name}, ${adminId}, ${billDate})
        `);
      }
    }
    console.log(`   ✅ ${comp.name} transactions completed.`);
  }

  // ════════════════════════════════════════
  // 8. Public Marketplace Seeding
  // ════════════════════════════════════════
  console.log('\n🏪 Seeding marketplace...');

  // Get party IDs to link
  const buyerParties = await db.execute(sql`
    SELECT p.id FROM parties p JOIN party_roles r ON p.id = r.party_id WHERE r.role = 'BUYER' LIMIT 1
  `);
  const sellerParties = await db.execute(sql`
    SELECT p.id FROM parties p JOIN party_roles r ON p.id = r.party_id WHERE r.role = 'SELLER' LIMIT 1
  `);

  const buyerPartyId = buyerParties.length > 0 ? (buyerParties[0] as any).id : null;
  const sellerPartyId = sellerParties.length > 0 ? (sellerParties[0] as any).id : null;

  // Member passwords hashed
  const memberPwHash = hashPassword('gccnanded@123');

  // Create members
  const [memberSellerRow] = await db.execute(sql`
    INSERT INTO members (name, phone, email, password_hash, role, party_id, token_balance, is_verified)
    VALUES ('Nanded Pulses Seller', '9876543210', 'seller@marketplace.com', ${memberPwHash}, 'SELLER', ${sellerPartyId}, 500000.00, true)
    RETURNING id
  `);
  const mSellerId = (memberSellerRow as any).id;

  const [memberBuyerRow] = await db.execute(sql`
    INSERT INTO members (name, phone, email, password_hash, role, party_id, token_balance, is_verified)
    VALUES ('Mumbai Grain Buyer', '9123456789', 'buyer@marketplace.com', ${memberPwHash}, 'BUYER', ${buyerPartyId}, 1000000.00, true)
    RETURNING id
  `);
  const mBuyerId = (memberBuyerRow as any).id;

  const [memberBothRow] = await db.execute(sql`
    INSERT INTO members (name, phone, email, password_hash, role, token_balance, is_verified)
    VALUES ('Marathwada Trader', '9345678901', 'trader@marketplace.com', ${memberPwHash}, 'BOTH', 300000.00, true)
    RETURNING id
  `);
  const mBothId = (memberBothRow as any).id;

  console.log(`   Seeded 3 members (Nanded Pulses Seller, Mumbai Grain Buyer, Marathwada Trader)`);

  // Query some commodity IDs
  const moongDalRows = await db.execute(sql`SELECT id FROM commodities WHERE name = 'Moong Dal' LIMIT 1`);
  const soybeanRows = await db.execute(sql`SELECT id FROM commodities WHERE name = 'Soybean' LIMIT 1`);
  const wheatRows = await db.execute(sql`SELECT id FROM commodities WHERE name = 'Wheat' LIMIT 1`);

  const cMoongDal = moongDalRows.length > 0 ? (moongDalRows[0] as any).id : 1;
  const cSoybean = soybeanRows.length > 0 ? (soybeanRows[0] as any).id : 2;
  const cWheat = wheatRows.length > 0 ? (wheatRows[0] as any).id : 3;

  // Query packaging ID
  const packRows = await db.execute(sql`SELECT id FROM commodity_packaging WHERE commodity_id = ${cMoongDal} LIMIT 1`);
  const packId = packRows.length > 0 ? (packRows[0] as any).id : null;

  // Query city IDs
  const cityRows = await db.execute(sql`SELECT id FROM cities LIMIT 2`);
  const cityNanded = cityRows.length > 0 ? (cityRows[0] as any).id : null;
  const cityLatur = cityRows.length > 1 ? (cityRows[1] as any).id : null;

  // Insert Listings
  // 1. Open Market SELL Listing
  const [list1Row] = await db.execute(sql`
    INSERT INTO listings (member_id, listing_type, direction, commodity_id, packaging_id, title, quality_notes, qty_quintals, price_per_quintal, city_id, status)
    VALUES (${mBothId}, 'OPEN', 'SELL', ${cMoongDal}, ${packId}, 'Premium Moong Dal Nanded', 'Moisture < 10%, standard clean bags', 200.00, 8500.00, ${cityNanded}, 'ACTIVE')
    RETURNING id
  `);
  const list1Id = (list1Row as any).id;

  // 2. Open Market BUY Listing
  await db.execute(sql`
    INSERT INTO listings (member_id, listing_type, direction, commodity_id, title, quality_notes, qty_quintals, price_per_quintal, city_id, status)
    VALUES (${mBuyerId}, 'OPEN', 'BUY', ${cSoybean}, 'Required Soybean Latur Delivery', 'Yellow Soy, FAQ clean grade', 500.00, 4800.00, ${cityLatur}, 'ACTIVE')
  `);

  // 3. Government Tender (staff published, owner is null)
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 7);
  const [list3Row] = await db.execute(sql`
    INSERT INTO listings (member_id, listing_type, direction, commodity_id, title, quality_notes, qty_quintals, price_per_quintal, city_id, status, close_date)
    VALUES (null, 'TENDER', 'BUY', ${cWheat}, 'Gov Wheat Procurement Tender MH-99', 'FAQ Wheat Grade A, dry, standard sacks', 1000.00, 2400.00, ${cityNanded}, 'ACTIVE', ${closeDate})
    RETURNING id
  `);
  const list3Id = (list3Row as any).id;

  console.log(`   Seeded 3 listings (Open Market Sell, Open Market Buy, Government Tender)`);

  // Insert Bid on Government Tender
  const lockedDeposit = parseFloat((1000 * 2350 * 0.05).toFixed(2)); // 5% deposit for medium volatility
  await db.execute(sql`
    INSERT INTO bids (listing_id, member_id, bid_price_per_quintal, qty_quintals, token_locked, status)
    VALUES (${list3Id}, ${mSellerId}, 2350.00, 1000.00, ${lockedDeposit}, 'PENDING')
  `);
  console.log(`   Seeded 1 Bid on Gov Tender`);

  // Insert Chat Negotiation Room
  const [chatRow] = await db.execute(sql`
    INSERT INTO chats (listing_id, buyer_id, seller_id, agreed_buyer_price, agreed_seller_price, commission_rate, status)
    VALUES (${list1Id}, ${mBuyerId}, ${mBothId}, null, null, 0.0050, 'NEGOTIATING')
    RETURNING id
  `);
  const chatId = (chatRow as any).id;

  // Insert Chat Messages
  await db.execute(sql`
    INSERT INTO chat_messages (room_id, sender_id, message_text)
    VALUES (${chatId}, null, 'Negotiation started. Buyer can submit bid price, Seller can submit sell price.')
  `);
  await db.execute(sql`
    INSERT INTO chat_messages (room_id, sender_id, message_text)
    VALUES (${chatId}, ${mBuyerId}, 'Hello. Is 8300 per quintal acceptable for 200 quintals?')
  `);
  await db.execute(sql`
    INSERT INTO chat_messages (room_id, sender_id, message_text)
    VALUES (${chatId}, ${mBothId}, 'Hi! 8300 is too low for this grade. The quality is exceptional. I can match at 8400 minimum.')
  `);
  console.log(`   Seeded Chat room between Mumbai Grain Buyer and Marathwada Trader with messages`);

  console.log('\n════════════════════════════════════════');
  console.log('  🎉 SEED COMPLETE!');
  console.log('════════════════════════════════════════');
  console.log(`  Companies     : ${companyIds.length}`);
  console.log(`  Fiscal Years  : ${companyIds.length * FY_RANGES.length}`);
  console.log(`  Admin User    : gccnanded / gccnanded@123`);
  console.log(`  Parties       : ${partyIds.length}`);
  console.log(`  Market Members: 3 (Nanded Pulses Seller, Mumbai Grain Buyer, Marathwada Trader)`);
  console.log(`  Market Pass   : gccnanded@123`);
  console.log('════════════════════════════════════════\n');

  await client.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
