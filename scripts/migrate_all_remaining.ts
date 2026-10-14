/**
 * Soft Sauda: Complete Migration of All Remaining Entities
 * 
 * Ingests from schemawithdata.sql into PostgreSQL:
 * 1. Banks (bankmst: 48,922)
 * 2. Transporters (trptmst: 116)
 * 3. Vehicles (vehmst: 10)
 * 4. Expense Heads (expmst: 10)
 * 5. Terms & Conditions (termmst: 12)
 * 6. Couriers (coumst: 4)
 * 7. Proprietors (propmst: 3)
 * 8. Narration Templates (narrmst: 21)
 * 9. Account Groups (groupmst: 29)
 * 10. Commodity Specifications (itemspec: 205)
 * 11. Commodity Packaging (itemstp: 219)
 * 12. Payments (payment: 7,944)
 * 13. Outstanding (outstanding: 126,444)
 * 14. Bills (bills: deduplicated from outstanding)
 * 15. Outstanding Details (outsdet: 3,369)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const SQL_FILE = path.join(__dirname, '..', 'schemawithdata.sql');

function cleanStr(val: any, maxLen?: number): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s.toUpperCase() === 'NULL') return null;
  return maxLen && s.length > maxLen ? s.slice(0, maxLen) : s;
}

function cleanNum(val: any, defaultVal: number | null = null): number | null {
  if (val === null || val === undefined) return defaultVal;
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

function cleanInt(val: any, defaultVal: number | null = null): number | null {
  if (val === null || val === undefined) return defaultVal;
  const n = parseInt(val, 10);
  return isNaN(n) ? defaultVal : n;
}

function cleanDate(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    const yr = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const dy = parseInt(m[3], 10);
    const hr = parseInt(m[4] || '0', 10);
    const mn = parseInt(m[5] || '0', 10);
    const sc = parseInt(m[6] || '0', 10);
    if (yr >= 1900 && yr <= 2100 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      return `${yr.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${dy.toString().padStart(2, '0')} ${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

function parseSqlInsert(stmt: string) {
  const m = stmt.trim().match(/^INSERT\s+(?:INTO\s+)?\[?dbo\]?\.?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*)\)$/);
  if (!m) return null;
  const tbl = m[1];
  const cols = m[2].split(',').map(c => c.trim().replace(/[\[\]"']/g, ''));
  const valsStr = m[3];

  const vals: (string | null)[] = [];
  const tokenRe = /CAST\s*\(\s*N?'(?<cast_val>[^']*)'\s*AS\s+\w+\s*\)|N?'(?<str_val>(?:''|[^'])*)'|(?<num_val>NULL|-?\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = tokenRe.exec(valsStr)) !== null) {
    if (match.groups?.cast_val !== undefined) {
      vals.push(match.groups.cast_val);
    } else if (match.groups?.str_val !== undefined) {
      vals.push(match.groups.str_val.replace(/''/g, "'").trim());
    } else if (match.groups?.num_val !== undefined) {
      const v = match.groups.num_val;
      vals.push(v.toUpperCase() === 'NULL' ? null : v);
    } else {
      vals.push(null);
    }
  }
  return { tbl, cols, vals };
}

async function* readStatements(filePath: string, targetPrefixes: string[]) {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf16le' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let buffer: string[] = [];
  let inString = false;

  for await (const line of rl) {
    if (buffer.length === 0) {
      if (!targetPrefixes.some(p => line.startsWith(p))) continue;
    }
    buffer.push(line);
    const cleaned = line.replace(/''/g, '');
    const quotes = (cleaned.match(/'/g) || []).length;
    if (quotes % 2 !== 0) {
      inString = !inString;
    }
    if (!inString && line.trimEnd().endsWith(')')) {
      yield buffer.join('\n');
      buffer = [];
    }
  }
}

async function batchInsert(sql: any, table: string, columns: string[], rows: any[][], onConflictClause = '', batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (batch.length === 0) continue;
    
    let paramIdx = 1;
    const valuePlaceholders: string[] = [];
    const flatValues: any[] = [];
    
    for (const row of batch) {
      const rowPlaceholders: string[] = [];
      for (const val of row) {
        rowPlaceholders.push(`$${paramIdx++}`);
        flatValues.push(val);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valuePlaceholders.join(',\n')}
      ${onConflictClause ? onConflictClause : ''};
    `;
    await sql.unsafe(query, flatValues);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 SOFT SAUDA: FULL REMAINING ENTITIES MIGRATION');
  console.log(`📁 Source: ${SQL_FILE}`);
  console.log(`🐘 Target: ${DATABASE_URL}`);
  console.log('='.repeat(70));

  const sql = postgres(DATABASE_URL, { max: 10 });
  const t0 = Date.now();

  try {
    // ── 1. PRELOAD ID MAPS ──
    console.log('\n[STEP 1] Preloading existing database IDs...');
    const coRes = await sql`SELECT legacy_cocode, id FROM companies WHERE legacy_cocode IS NOT NULL`;
    const cocodeToCompany = new Map<number, number>();
    coRes.forEach(r => cocodeToCompany.set(r.legacy_cocode, r.id));

    const fyRes = await sql`SELECT company_id, id FROM fiscal_years`;
    const compToFy = new Map<number, number>();
    fyRes.forEach(r => {
      if (!compToFy.has(r.company_id)) compToFy.set(r.company_id, r.id);
    });

    const partyRes = await sql`SELECT id, name FROM parties`;
    const partyNameToId = new Map<string, number>();
    partyRes.forEach(r => partyNameToId.set(r.name.trim().toUpperCase(), r.id));

    const commRes = await sql`SELECT id, name FROM commodities`;
    const commNameToId = new Map<string, number>();
    commRes.forEach(r => commNameToId.set(r.name.trim().toUpperCase(), r.id));

    const stateRes = await sql`SELECT id FROM states`;
    const validStates = new Set<number>(stateRes.map(r => r.id));

    const cityRes = await sql`SELECT id FROM cities`;
    const validCities = new Set<number>(cityRes.map(r => r.id));

    const defaultPartyId = partyRes[0]?.id || 1;
    const defaultCommId = commRes[0]?.id || 1;

    console.log(`  ✓ Companies: ${cocodeToCompany.size}, Fiscal Years: ${compToFy.size}, Parties: ${partyNameToId.size}, Commodities: ${commNameToId.size}`);

    // ── 2. STREAM SCAN SQL DUMP ──
    console.log('\n[STEP 2] Scanning legacy SQL dump for all entities...');
    const targetPrefixes = [
      'INSERT [dbo].[bankmst]',
      'INSERT [dbo].[trptmst]',
      'INSERT [dbo].[vehmst]',
      'INSERT [dbo].[expmst]',
      'INSERT [dbo].[termmst]',
      'INSERT [dbo].[coumst]',
      'INSERT [dbo].[propmst]',
      'INSERT [dbo].[narrmst]',
      'INSERT [dbo].[groupmst]',
      'INSERT [dbo].[itemspec]',
      'INSERT [dbo].[itemstp]',
      'INSERT [dbo].[payment]',
      'INSERT [dbo].[outstanding]',
      'INSERT [dbo].[outsdet]',
      'INSERT [dbo].[accountmst]',
      'INSERT [dbo].[itemmst]'
    ];

    const legacyAccountToName = new Map<number, string>();
    const legacyItemToName = new Map<number, string>();

    const banksBatch: any[][] = [];
    const transportersBatch: any[][] = [];
    const vehiclesBatch: any[][] = [];
    const expHeadsBatch: any[][] = [];
    const termsBatch: any[][] = [];
    const couriersBatch: any[][] = [];
    const proprietorsBatch: any[][] = [];
    const narrationsBatch: any[][] = [];
    const groupsBatch: any[][] = [];
    const specsBatch: any[][] = [];
    const packingsBatch: any[][] = [];
    const paymentsRaw: Record<string, any>[] = [];
    const outstandingRaw: Record<string, any>[] = [];
    const outsdetRaw: Record<string, any>[] = [];

    const tScan = Date.now();
    for await (const stmt of readStatements(SQL_FILE, targetPrefixes)) {
      const parsed = parseSqlInsert(stmt);
      if (!parsed) continue;
      const { tbl, cols, vals } = parsed;
      const d: Record<string, any> = {};
      cols.forEach((c, idx) => { d[c] = vals[idx]; });

      if (tbl === 'accountmst') {
        const sno = cleanInt(d.sno);
        const nm = cleanStr(d.ac_name);
        if (sno && nm) legacyAccountToName.set(sno, nm.trim().toUpperCase());
      } else if (tbl === 'itemmst') {
        const sno = cleanInt(d.sno);
        const nm = cleanStr(d.item_nm);
        if (sno && nm) legacyItemToName.set(sno, nm.trim().toUpperCase());
      } else if (tbl === 'bankmst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.bnk_name, 250) || 'Bank';
        const branch = cleanStr(d.bnk_brnch || d.bnk_branch, 250);
        const ifsc = cleanStr(d.bnk_ifsc, 30);
        const micr = cleanStr(d.bnk_micr, 30);
        const add = cleanStr(d.bnk_add, 250);
        const add1 = cleanStr(d.bnk_add1, 250);
        const center = cleanStr(d.bnk_center, 100);
        const cont = cleanStr(d.bnk_cont, 100);
        const dist = cleanStr(d.bnk_dist, 100);
        const st = cleanInt(d.bnk_state);
        const stId = (st && validStates.has(st)) ? st : null;
        banksBatch.push([sno, name, branch, ifsc, micr, add, add1, center, cont, dist, stId]);
      } else if (tbl === 'trptmst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.tr_name, 250) || 'Transporter';
        const add1 = cleanStr(d.tr_add1, 250);
        const add2 = cleanStr(d.tr_add2, 250);
        const plc = cleanInt(d.tr_place);
        const cityId = (plc && validCities.has(plc)) ? plc : null;
        const pin = cleanStr(d.tr_pin, 20);
        const cont = cleanStr(d.tr_cont, 100);
        const pho = cleanStr(d.tr_pho, 30);
        const phr = cleanStr(d.tr_phr, 30);
        const phm = cleanStr(d.tr_phm, 30);
        const pan = cleanStr(d.tr_pan, 30);
        const eml = cleanStr(d.tr_email, 100);
        transportersBatch.push([sno, name, add1, add2, cityId, pin, cont, pho, phr, phm, pan, eml]);
      } else if (tbl === 'vehmst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.veh_name, 100) || 'Truck';
        const stdW = cleanNum(d.veh_wght);
        const appW = cleanStr(d.veh_apprxwght, 50);
        const minW = cleanNum(d.veh_minapprx);
        const maxW = cleanNum(d.veh_maxapprx);
        vehiclesBatch.push([sno, name, stdW, appW, minW, maxW]);
      } else if (tbl === 'expmst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.expnm, 100) || 'Expense';
        const typ = cleanStr(d.type, 20);
        expHeadsBatch.push([sno, name, typ]);
      } else if (tbl === 'termmst') {
        const sno = cleanInt(d.sno);
        const term = cleanStr(d.term);
        if (term) termsBatch.push([sno, term]);
      } else if (tbl === 'coumst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.ac_name, 150) || 'Courier';
        const add1 = cleanStr(d.ac_add1, 250);
        const plc = cleanInt(d.ac_place);
        const cityId = (plc && validCities.has(plc)) ? plc : null;
        const pin = cleanStr(d.ac_pin, 20);
        const pho = cleanStr(d.ac_pho, 30);
        const phm = cleanStr(d.ac_phm, 30);
        couriersBatch.push([sno, name, add1, cityId, pin, pho, phm]);
      } else if (tbl === 'propmst') {
        const sno = cleanInt(d.sno);
        const name = cleanStr(d.ac_name, 150) || 'Proprietor';
        const add1 = cleanStr(d.ac_add1, 250);
        const add2 = cleanStr(d.ac_add2, 250);
        const plc = cleanInt(d.ac_place);
        const cityId = (plc && validCities.has(plc)) ? plc : null;
        const pin = cleanStr(d.ac_pin, 20);
        const cont = cleanStr(d.ac_cont, 100);
        const pho = cleanStr(d.ac_pho, 30);
        const phr = cleanStr(d.ac_phr, 30);
        const phm = cleanStr(d.ac_phm, 30);
        const tin = cleanStr(d.ac_tin, 30);
        const pan = cleanStr(d.ac_pan, 30);
        const eml = cleanStr(d.ac_email, 100);
        proprietorsBatch.push([sno, name, add1, add2, cityId, pin, cont, pho, phr, phm, tin, pan, eml]);
      } else if (tbl === 'narrmst') {
        const sno = cleanInt(d.sno);
        const nar = cleanStr(d.narration);
        const typ = cleanStr(d.type, 20);
        if (nar) narrationsBatch.push([sno, nar, typ]);
      } else if (tbl === 'groupmst') {
        const sno = cleanInt(d.g_sno || d.sno);
        const name = cleanStr(d.g_name, 100);
        const typ = cleanStr(d.g_type, 50);
        const sup = (cleanStr(d.g_supprs) || '').toUpperCase() === 'Y';
        const pId = cleanInt(d.g_sgrp);
        if (name) groupsBatch.push([sno, name, typ, sup, pId]);
      } else if (tbl === 'itemspec') {
        const sno = cleanInt(d.sno);
        const itmSno = cleanInt(d.itm_sno);
        const specNm = cleanStr(d.spec_nm, 100);
        const specVal = cleanNum(d.spec_val);
        const minMax = cleanStr(d.spec_minmax, 20);
        const rmk = cleanStr(d.spec_rmk);
        specsBatch.push([sno, itmSno, specNm, specVal, minMax, rmk]);
      } else if (tbl === 'itemstp') {
        const itSno = cleanInt(d.it_sno);
        const itPck = cleanNum(d.it_pck, 50.0);
        const itBk = cleanStr(d.it_bk, 20) || 'BAG';
        const rSl = cleanNum(d.it_ratesl, 0.0);
        const rtSl = cleanStr(d.it_ratetypsl, 20);
        const rBr = cleanNum(d.it_ratebr, 0.0);
        const rtBr = cleanStr(d.it_ratetypbr, 20);
        packingsBatch.push([itSno, itPck, itBk, rSl, rtSl, rBr, rtBr]);
      } else if (tbl === 'payment') {
        paymentsRaw.push(d);
      } else if (tbl === 'outstanding') {
        outstandingRaw.push(d);
      } else if (tbl === 'outsdet') {
        outsdetRaw.push(d);
      }
    }

    console.log(`  ✓ Scan completed in ${((Date.now() - tScan) / 1000).toFixed(2)}s.`);
    console.log(`    Banks: ${banksBatch.length.toLocaleString()}`);
    console.log(`    Transporters: ${transportersBatch.length.toLocaleString()}`);
    console.log(`    Vehicles: ${vehiclesBatch.length.toLocaleString()}`);
    console.log(`    Expense Heads: ${expHeadsBatch.length.toLocaleString()}`);
    console.log(`    Terms & Conditions: ${termsBatch.length.toLocaleString()}`);
    console.log(`    Couriers: ${couriersBatch.length.toLocaleString()}`);
    console.log(`    Proprietors: ${proprietorsBatch.length.toLocaleString()}`);
    console.log(`    Narration Templates: ${narrationsBatch.length.toLocaleString()}`);
    console.log(`    Account Groups: ${groupsBatch.length.toLocaleString()}`);
    console.log(`    Commodity Specs: ${specsBatch.length.toLocaleString()}`);
    console.log(`    Commodity Packings: ${packingsBatch.length.toLocaleString()}`);
    console.log(`    Payments: ${paymentsRaw.length.toLocaleString()}`);
    console.log(`    Outstanding: ${outstandingRaw.length.toLocaleString()}`);
    console.log(`    Outstanding Details: ${outsdetRaw.length.toLocaleString()}`);

    // Build resolved party & commodity maps
    const partyIdMap = new Map<number, number>();
    legacyAccountToName.forEach((name, sno) => {
      if (partyNameToId.has(name)) partyIdMap.set(sno, partyNameToId.get(name)!);
    });

    const commIdMap = new Map<number, number>();
    legacyItemToName.forEach((name, sno) => {
      if (commNameToId.has(name)) commIdMap.set(sno, commNameToId.get(name)!);
    });

    // ── 3. INSERT MASTERS ──
    console.log('\n[STEP 3] Inserting Masters...');

    // Banks
    if (banksBatch.length > 0) {
      await batchInsert(sql, 'banks', [
        'id', 'bank_name', 'branch', 'ifsc_code', 'micr_code', 'address', 'address1', 'center', 'contact_person', 'district_name', 'state_id'
      ], banksBatch, 'ON CONFLICT (id) DO UPDATE SET bank_name = EXCLUDED.bank_name, branch = EXCLUDED.branch, ifsc_code = EXCLUDED.ifsc_code', 2000);
      await sql`SELECT setval('banks_id_seq', COALESCE((SELECT MAX(id) FROM banks), 1))`;
      console.log(`  ✓ Banks inserted: ${banksBatch.length.toLocaleString()}`);
    }

    // Transporters
    if (transportersBatch.length > 0) {
      await batchInsert(sql, 'transporters', [
        'id', 'name', 'address1', 'address2', 'city_id', 'pincode', 'contact_person', 'phone_office', 'phone_res', 'mobile', 'pan_no', 'email'
      ], transportersBatch, 'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', 1000);
      await sql`SELECT setval('transporters_id_seq', COALESCE((SELECT MAX(id) FROM transporters), 1))`;
      console.log(`  ✓ Transporters inserted: ${transportersBatch.length.toLocaleString()}`);
    }

    // Vehicles
    if (vehiclesBatch.length > 0) {
      await batchInsert(sql, 'vehicles', [
        'id', 'vehicle_type', 'standard_weight', 'approx_weight_text', 'min_weight', 'max_weight'
      ], vehiclesBatch, 'ON CONFLICT (vehicle_type) DO UPDATE SET standard_weight = EXCLUDED.standard_weight', 1000);
      await sql`SELECT setval('vehicles_id_seq', COALESCE((SELECT MAX(id) FROM vehicles), 1))`;
      console.log(`  ✓ Vehicles inserted: ${vehiclesBatch.length.toLocaleString()}`);
    }

    // Expense Heads
    if (expHeadsBatch.length > 0) {
      await batchInsert(sql, 'expense_heads', [
        'id', 'name', 'expense_type'
      ], expHeadsBatch, 'ON CONFLICT (name) DO UPDATE SET expense_type = EXCLUDED.expense_type', 1000);
      await sql`SELECT setval('expense_heads_id_seq', COALESCE((SELECT MAX(id) FROM expense_heads), 1))`;
      console.log(`  ✓ Expense Heads inserted: ${expHeadsBatch.length.toLocaleString()}`);
    }

    // Terms & Conditions
    if (termsBatch.length > 0) {
      await batchInsert(sql, 'terms_conditions', [
        'id', 'term_text'
      ], termsBatch, 'ON CONFLICT (id) DO UPDATE SET term_text = EXCLUDED.term_text', 1000);
      await sql`SELECT setval('terms_conditions_id_seq', COALESCE((SELECT MAX(id) FROM terms_conditions), 1))`;
      console.log(`  ✓ Terms & Conditions inserted: ${termsBatch.length.toLocaleString()}`);
    }

    // Couriers
    if (couriersBatch.length > 0) {
      await batchInsert(sql, 'couriers', [
        'id', 'name', 'address1', 'city_id', 'pincode', 'phone', 'mobile'
      ], couriersBatch, 'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', 1000);
      await sql`SELECT setval('couriers_id_seq', COALESCE((SELECT MAX(id) FROM couriers), 1))`;
      console.log(`  ✓ Couriers inserted: ${couriersBatch.length.toLocaleString()}`);
    }

    // Proprietors
    if (proprietorsBatch.length > 0) {
      await batchInsert(sql, 'proprietors', [
        'id', 'firm_name', 'address1', 'address2', 'city_id', 'pincode', 'contact_person', 'phone', 'phone_res', 'mobile', 'tin_no', 'pan_no', 'email'
      ], proprietorsBatch, 'ON CONFLICT (id) DO UPDATE SET firm_name = EXCLUDED.firm_name', 1000);
      await sql`SELECT setval('proprietors_id_seq', COALESCE((SELECT MAX(id) FROM proprietors), 1))`;
      console.log(`  ✓ Proprietors inserted: ${proprietorsBatch.length.toLocaleString()}`);
    }

    // Narration Templates
    if (narrationsBatch.length > 0) {
      await batchInsert(sql, 'narration_templates', [
        'id', 'template_text', 'voucher_type'
      ], narrationsBatch, 'ON CONFLICT (id) DO UPDATE SET template_text = EXCLUDED.template_text', 1000);
      await sql`SELECT setval('narration_templates_id_seq', COALESCE((SELECT MAX(id) FROM narration_templates), 1))`;
      console.log(`  ✓ Narration Templates inserted: ${narrationsBatch.length.toLocaleString()}`);
    }

    // Account Groups
    if (groupsBatch.length > 0) {
      const roots = groupsBatch.map(g => [g[0], g[1], g[2], g[3], null]);
      await batchInsert(sql, 'account_groups', [
        'id', 'name', 'group_type', 'suppress_flag', 'parent_group_id'
      ], roots, 'ON CONFLICT (name) DO UPDATE SET group_type = EXCLUDED.group_type', 1000);
      for (const g of groupsBatch) {
        if (g[4]) {
          await sql`UPDATE account_groups SET parent_group_id = ${g[4]} WHERE id = ${g[0]}`;
        }
      }
      await sql`SELECT setval('account_groups_id_seq', COALESCE((SELECT MAX(id) FROM account_groups), 1))`;
      console.log(`  ✓ Account Groups inserted: ${groupsBatch.length.toLocaleString()}`);
    }

    // Commodity Specifications
    const specsToInsert: any[][] = [];
    for (const s of specsBatch) {
      const [sno, itmSno, specNm, specVal, minMax, rmk] = s;
      const cid = commIdMap.get(itmSno) || defaultCommId;
      if (specNm) specsToInsert.push([cid, specNm, specVal, minMax, rmk]);
    }
    if (specsToInsert.length > 0) {
      await batchInsert(sql, 'commodity_specifications', [
        'commodity_id', 'specification', 'spec_value', 'min_max', 'remarks'
      ], specsToInsert, '', 1000);
      console.log(`  ✓ Commodity Specifications inserted: ${specsToInsert.length.toLocaleString()}`);
    }

    // Commodity Packaging
    const packingsToInsert: any[][] = [];
    for (const p of packingsBatch) {
      const [itSno, itPck, itBk, rSl, rtSl, rBr, rtBr] = p;
      const cid = commIdMap.get(itSno) || defaultCommId;
      packingsToInsert.push([cid, itPck, itBk, rSl, rtSl, rBr, rtBr]);
    }
    if (packingsToInsert.length > 0) {
      await batchInsert(sql, 'commodity_packaging', [
        'commodity_id', 'packing_weight', 'packing_type', 'seller_brokerage_rate', 'seller_brokerage_type', 'buyer_brokerage_rate', 'buyer_brokerage_type'
      ], packingsToInsert, '', 1000);
      console.log(`  ✓ Commodity Packings inserted: ${packingsToInsert.length.toLocaleString()}`);
    }

    // ── 4. PAYMENTS ──
    console.log('\n[STEP 4] Ingesting Payments...');
    const bankIdRes = await sql`SELECT id FROM banks`;
    const validBankIds = new Set<number>(bankIdRes.map(r => r.id));

    const courierIdRes = await sql`SELECT id FROM couriers`;
    const validCourierIds = new Set<number>(courierIdRes.map(r => r.id));

    const paymentsToInsert: any[][] = [];
    for (const d of paymentsRaw) {
      const sno = cleanInt(d.sno);
      const cocode = cleanInt(d.cocode, 1)!;
      const compId = cocodeToCompany.get(cocode) || 1;
      const fyId = compToFy.get(compId) || 67;
      const pdate = cleanDate(d.pay_date) || '2012-04-01 00:00:00';
      const slCode = cleanInt(d.sl_code);
      const pId = (slCode && partyIdMap.get(slCode)) || defaultPartyId;
      const itype = cleanStr(d.chkddtyp, 20) || 'CHEQUE';
      const ino = cleanStr(d.chkddno, 50);
      const idt = cleanDate(d.chkdddt);
      const amt = cleanNum(d.chkddamt, 0.0);
      const depBnk = cleanInt(d.dep_bnk);
      const depBnkId = (depBnk && validBankIds.has(depBnk)) ? depBnk : null;
      const depAc = cleanStr(d.dep_ac, 50);
      const cou = cleanInt(d.courier);
      const couId = (cou && validCourierIds.has(cou)) ? cou : null;
      const couRec = cleanStr(d.cou_rec, 50);
      const couChg = cleanNum(d.cou_chgs);
      const rmk1 = cleanStr(d.rmks1, 250);
      const rmk2 = cleanStr(d.rmks2, 250);

      paymentsToInsert.push([
        sno, compId, fyId, pdate, pId, itype, ino, idt, amt,
        depBnkId, depAc, couId, couRec, couChg, rmk1, rmk2
      ]);
    }

    if (paymentsToInsert.length > 0) {
      await batchInsert(sql, 'payments', [
        'id', 'company_id', 'fiscal_year_id', 'payment_date', 'party_id', 'instrument_type',
        'instrument_no', 'instrument_date', 'amount', 'deposit_bank_id', 'deposit_account_no',
        'courier_id', 'courier_receipt_no', 'courier_charges', 'remarks1', 'remarks2'
      ], paymentsToInsert, 'ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount', 1000);
      await sql`SELECT setval('payments_id_seq', COALESCE((SELECT MAX(id) FROM payments), 1))`;
      console.log(`  ✓ Payments inserted: ${paymentsToInsert.length.toLocaleString()}`);
    }

    // ── 5. OUTSTANDING & BILLS ──
    console.log('\n[STEP 5] Ingesting Outstanding & Bills...');
    const outstandingToInsert: any[][] = [];
    const billsToInsert: any[][] = [];
    const seenBills = new Set<string>();

    for (const d of outstandingRaw) {
      const sno = cleanInt(d.sno);
      const cocode = cleanInt(d.cocode, 1)!;
      const compId = cocodeToCompany.get(cocode) || 1;
      const fyId = compToFy.get(compId) || 67;
      const voucCode = cleanStr(d.vouc_code, 50) || String(sno);
      const slCode = cleanInt(d.sl_code);
      const pId = (slCode && partyIdMap.get(slCode)) || defaultPartyId;
      const sdate = cleanDate(d.sd_date) || '2012-04-01 00:00:00';
      const bAmt = cleanNum(d.bill_amt || d.vouc_amt, 0.0);
      const balAmt = cleanNum(d.bal_amt, bAmt);
      const adjAmt = cleanNum(d.adj_amt, 0.0);
      const expAmt = cleanNum(d.exp_amt, 0.0);
      const clrAmt = cleanNum(d.clr_amt, 0.0);

      outstandingToInsert.push([
        sno, compId, fyId, pId, voucCode, sdate, bAmt, bAmt,
        adjAmt, expAmt, clrAmt, balAmt
      ]);

      const billKey = `${compId}:${fyId}:${voucCode}`;
      if (!seenBills.has(billKey)) {
        seenBills.add(billKey);
        billsToInsert.push([
          compId, fyId, voucCode, sdate, pId, 'CONTRACT', bAmt, balAmt
        ]);
      }
    }

    if (outstandingToInsert.length > 0) {
      await batchInsert(sql, 'outstanding', [
        'id', 'company_id', 'fiscal_year_id', 'party_id', 'bill_no', 'po_date',
        'bill_amount', 'outstanding_amount', 'received_amount', 'expense_amount',
        'cleared_amount', 'balance_amount'
      ], outstandingToInsert, 'ON CONFLICT (id) DO UPDATE SET bill_amount = EXCLUDED.bill_amount, balance_amount = EXCLUDED.balance_amount', 2000);
      await sql`SELECT setval('outstanding_id_seq', COALESCE((SELECT MAX(id) FROM outstanding), 1))`;
      console.log(`  ✓ Outstanding records inserted: ${outstandingToInsert.length.toLocaleString()}`);
    }

    if (billsToInsert.length > 0) {
      await batchInsert(sql, 'bills', [
        'company_id', 'fiscal_year_id', 'bill_no', 'bill_date', 'party_id',
        'basis', 'total_amount', 'balance_amount'
      ], billsToInsert, 'ON CONFLICT (company_id, fiscal_year_id, bill_no) DO UPDATE SET total_amount = EXCLUDED.total_amount, balance_amount = EXCLUDED.balance_amount', 2000);
      await sql`SELECT setval('bills_id_seq', COALESCE((SELECT MAX(id) FROM bills), 1))`;
      console.log(`  ✓ Bills inserted: ${billsToInsert.length.toLocaleString()}`);
    }

    // ── 6. OUTSTANDING DETAILS ──
    console.log('\n[STEP 6] Ingesting Outstanding Details...');
    const outIdRes = await sql`SELECT id FROM outstanding`;
    const validOutIds = new Set<number>(outIdRes.map(r => r.id));

    const expIdRes = await sql`SELECT id FROM expense_heads`;
    const validExpIds = new Set<number>(expIdRes.map(r => r.id));

    const outsdetToInsert: any[][] = [];
    for (const d of outsdetRaw) {
      const sno = cleanInt(d.sno);
      if (!sno || !validOutIds.has(sno)) continue;
      const expCode = cleanInt(d.exp_code);
      const expId = (expCode && validExpIds.has(expCode)) ? expCode : null;
      const rate = cleanNum(d.exp_rate, 0.0);
      const amt = cleanNum(d.exp_amt, 0.0);
      outsdetToInsert.push([sno, expId, rate, amt]);
    }

    if (outsdetToInsert.length > 0) {
      await batchInsert(sql, 'outstanding_details', [
        'outstanding_id', 'expense_head_id', 'expense_rate', 'expense_amount'
      ], outsdetToInsert, '', 1000);
      console.log(`  ✓ Outstanding Details inserted: ${outsdetToInsert.length.toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`🎉 ALL REMAINING ENTITIES SUCCESSFULLY MIGRATED IN ${((Date.now() - t0) / 1000).toFixed(2)}s!`);
    console.log('='.repeat(70));

  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
