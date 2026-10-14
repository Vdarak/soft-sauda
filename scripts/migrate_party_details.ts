/**
 * Migration Script: Party Delivery Addresses, Bank Details & Contacts
 * 
 * Ingests from schemawithdata.sql into PostgreSQL:
 * 1. Party Delivery Addresses (party_delivery_addresses)
 * 2. Party Bank Details (party_bank_details) - enriched with IFSC, branch, bank name
 * 3. Party Contacts (party_contacts)
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

function parseSqlInsert(stmt: string) {
  const m = stmt.trim().match(/^INSERT\s+(?:INTO\s+)?\[?dbo\]?\.?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*)\)$/i);
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
  const row: Record<string, any> = {};
  cols.forEach((c, i) => { row[c] = vals[i] ?? null; });
  return { tbl, row };
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

function normalizeIfsc(ifsc: string): string {
  return ifsc.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function inferBankNameFromIfsc(ifsc: string): string | null {
  const prefix = ifsc.slice(0, 4).toUpperCase();
  const bankMap: Record<string, string> = {
    'SBIN': 'STATE BANK OF INDIA',
    'SBHY': 'STATE BANK OF HYDERABAD',
    'SBBJ': 'STATE BANK OF BIKANER AND JAIPUR',
    'HDFC': 'HDFC BANK LTD',
    'ICIC': 'ICICI BANK',
    'UTIB': 'AXIS BANK',
    'PUNB': 'PUNJAB NATIONAL BANK',
    'CNRB': 'CANARA BANK',
    'BARB': 'BANK OF BARODA',
    'UBIN': 'UNION BANK OF INDIA',
    'BKDN': 'DENA BANK',
    'ALLA': 'ALLAHABAD BANK',
    'CORP': 'CORPORATION BANK',
    'ANDB': 'ANDHRA BANK',
    'MAHB': 'BANK OF MAHARASHTRA',
    'IOBA': 'INDIAN OVERSEAS BANK',
    'IDIB': 'INDIAN BANK',
    'SYNB': 'SYNDICATE BANK',
    'CBIN': 'CENTRAL BANK OF INDIA',
    'VIJB': 'VIJAYA BANK',
    'ORBC': 'ORIENTAL BANK OF COMMERCE',
    'VSBL': 'VIKAS SAHAKARI BANK LTD',
    'KKBK': 'KOTAK MAHINDRA BANK',
    'YESB': 'YES BANK',
    'INDB': 'INDUSIND BANK'
  };
  return bankMap[prefix] || null;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 SOFT SAUDA: PARTY DELIVERY ADDRESSES & BANK DETAILS MIGRATION');
  console.log(`📁 Source: ${SQL_FILE}`);
  console.log(`🐘 Target: ${DATABASE_URL}`);
  console.log('='.repeat(70));

  const sql = postgres(DATABASE_URL);

  // 1. Fetch parties and banks from PostgreSQL
  console.log('\n[STEP 1] Fetching parties and banks from PostgreSQL...');
  const partyRows = await sql`SELECT id, name, place FROM parties`;
  const partyNameToId = new Map<string, number>();
  partyRows.forEach(p => partyNameToId.set(p.name.trim().toUpperCase(), p.id));

  const bankRows = await sql`SELECT id, bank_name, branch, ifsc_code FROM banks`;
  const bankDir = new Map<number, { bankName: string; branch: string | null; ifscCode: string | null }>();
  bankRows.forEach(b => bankDir.set(b.id, {
    bankName: b.bank_name,
    branch: b.branch,
    ifscCode: b.ifsc_code
  }));

  console.log(`  ✓ Parties in PG: ${partyNameToId.size.toLocaleString()}`);
  console.log(`  ✓ Banks in PG: ${bankDir.size.toLocaleString()}`);

  // 2. Scan states and stations from SQL dump
  console.log('\n[STEP 2] Scanning stations and states from SQL dump...');
  const states = new Map<number, string>();
  const stations = new Map<number, { name: string; stateSno: number; pincode: string | null }>();

  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[statemst]', 'INSERT [dbo].[stationmst]'])) {
    const p = parseSqlInsert(stmt);
    if (!p) continue;
    const r = p.row;
    if (p.tbl.toLowerCase() === 'statemst') {
      const sno = parseInt(r.sno, 10);
      states.set(sno, cleanStr(r.state_nm) || '');
    } else if (p.tbl.toLowerCase() === 'stationmst') {
      const sno = parseInt(r.sno, 10);
      stations.set(sno, {
        name: cleanStr(r.st_name) || '',
        stateSno: parseInt(r.st_state, 10) || 0,
        pincode: cleanStr(r.st_pincode) || null,
      });
    }
  }
  console.log(`  ✓ States loaded: ${states.size}, Stations loaded: ${stations.size}`);

  // 3. Scan accountmst for delivery addresses, bank details, contacts
  console.log('\n[STEP 3] Parsing accountmst from SQL dump...');
  const deliveryAddressRows: any[][] = [];
  const bankDetailRows: any[][] = [];
  const contactRows: any[][] = [];

  const seenDelvParties = new Set<number>();
  const seenBankParties = new Set<string>();

  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[accountmst]'])) {
    const p = parseSqlInsert(stmt);
    if (!p) continue;
    const r = p.row;
    const name = cleanStr(r.ac_name);
    if (!name) continue;

    const partyId = partyNameToId.get(name.toUpperCase());
    if (!partyId) continue;

    // ──────────────────────────────────────────
    // A. DELIVERY ADDRESS
    // ──────────────────────────────────────────
    const delvNm = cleanStr(r.ac_delvnm);
    const delvAdd1 = cleanStr(r.ac_delvadd1);
    const delvAdd2 = cleanStr(r.ac_delvadd2);
    let delvPlaceSno = parseInt(r.ac_delvplace, 10) || 0;
    let delvPin = cleanStr(r.ac_delvpin);

    const hasDelv = delvNm || delvAdd1 || delvAdd2 || delvPlaceSno > 0 || delvPin;
    if (hasDelv && !seenDelvParties.has(partyId)) {
      seenDelvParties.add(partyId);

      // Fallback to party's place if delivery place is not specified
      if (delvPlaceSno === 0) {
        delvPlaceSno = parseInt(r.ac_place, 10) || 0;
      }

      const stn = stations.get(delvPlaceSno);
      const cityName = stn?.name || null;
      const stateName = stn ? states.get(stn.stateSno) || null : null;
      const pincode = delvPin || stn?.pincode || cleanStr(r.ac_pin) || null;

      const addrParts = [delvNm, delvAdd1, delvAdd2].filter(Boolean);
      let addressLine = addrParts.join(', ').trim();
      if (!addressLine) {
        addressLine = cityName ? `Delivery Godown / Factory, ${cityName}` : 'Delivery Godown / Factory';
      }

      deliveryAddressRows.push([
        partyId,
        addressLine,
        cityName,
        stateName,
        pincode
      ]);
    }

    // ──────────────────────────────────────────
    // B. BANK DETAILS
    // ──────────────────────────────────────────
    // Gather all 3 slots
    const slots: { idx: number; bSno: number; acNo: string | null }[] = [];
    for (const idx of [1, 2, 3]) {
      const bSno = parseInt(r[`ac_bnk${idx}`], 10) || 0;
      const acNo = cleanStr(r[`ac_bnkac${idx}`]);
      if (bSno > 0 || (acNo && acNo !== '-')) {
        slots.push({ idx, bSno, acNo });
      }
    }

    if (slots.length > 0) {
      // Check if slot 2 or slot 3 is an IFSC code for slot 1
      let mergedIfsc: string | null = null;
      const filteredSlots: typeof slots = [];

      for (const slot of slots) {
        if (slot.bSno === 0 && slot.acNo && /ifsc/i.test(slot.acNo)) {
          const m = slot.acNo.match(/ifsc(?:\s*code)?\s*[:-]?\s*([a-z0-9\.]+)/i);
          if (m) {
            mergedIfsc = normalizeIfsc(m[1]);
          }
        } else {
          filteredSlots.push(slot);
        }
      }

      const slotsToProcess = filteredSlots.length > 0 ? filteredSlots : slots;

      for (let i = 0; i < slotsToProcess.length; i++) {
        const slot = slotsToProcess[i];
        const bInfo = bankDir.get(slot.bSno);
        let bName = bInfo?.bankName || null;
        let branch = bInfo?.branch || null;
        let ifsc = bInfo?.ifscCode || null;
        let acNo = slot.acNo || '-';

        // Check if IFSC code was embedded in acNo
        if (acNo && /ifsc/i.test(acNo)) {
          const m = acNo.match(/ifsc(?:\s*code)?\s*[:-]?\s*([a-z0-9\.]+)/i);
          if (m) {
            if (!ifsc) ifsc = normalizeIfsc(m[1]);
            // Remove the IFSC part from acNo
            const cleanedAc = acNo.replace(/ifsc(?:\s*code)?\s*[:-]?\s*[a-z0-9\.]+/i, '').replace(/[^0-9]/g, '').trim();
            acNo = cleanedAc || '-';
          }
        }

        // Apply mergedIfsc if this is slot 0 and no IFSC was set
        if (i === 0 && !ifsc && mergedIfsc) {
          ifsc = mergedIfsc;
        }

        // Normalize IFSC
        if (ifsc) {
          ifsc = normalizeIfsc(ifsc);
          if (!bName || bName === 'Bank') {
            const inferred = inferBankNameFromIfsc(ifsc);
            if (inferred) bName = inferred;
          }
        }

        // Clean account number
        if (acNo && acNo !== '-') {
          acNo = acNo.replace(/^(?:A\/C\s*NO\.?|A\/C\s*NUMBER|A\/C|ACC\.?)\s*[:-]?\s*/i, '').trim();
        }

        // Infer bank name from account number prefix if still 'Bank'
        if ((!bName || bName === 'Bank') && acNo && acNo !== '-') {
          const digits = acNo.replace(/\D/g, '');
          if (digits.length === 11) {
            if (digits.startsWith('114') || digits.startsWith('305') || digits.startsWith('314') || digits.startsWith('354')) {
              bName = 'STATE BANK OF INDIA';
            } else if (digits.startsWith('620') || digits.startsWith('621') || digits.startsWith('622') || digits.startsWith('623')) {
              bName = 'STATE BANK OF HYDERABAD';
            } else if (digits.startsWith('610')) {
              bName = 'STATE BANK OF BIKANER AND JAIPUR';
            }
          }
        }

        const bankRecordKey = `${partyId}:${acNo}:${ifsc || ''}`;
        if (!seenBankParties.has(bankRecordKey)) {
          seenBankParties.add(bankRecordKey);
          bankDetailRows.push([
            partyId,
            bName || 'Bank',
            acNo || '-',
            ifsc || null,
            branch || null
          ]);
        }
      }
    }

    // ──────────────────────────────────────────
    // C. CONTACT PERSONS
    // ──────────────────────────────────────────
    const contNames = [cleanStr(r.ac_cont), cleanStr(r.ac_cont1), cleanStr(r.ac_cont2), cleanStr(r.ac_cont3)].filter(Boolean);
    const contFrms = [cleanStr(r.ac_contfrm1), cleanStr(r.ac_contfrm2), cleanStr(r.ac_contfrm3), cleanStr(r.ac_contfrm4)];
    const contMobiles = [cleanStr(r.ac_phm), cleanStr(r.ac_phm1), cleanStr(r.ac_pho), cleanStr(r.ac_pho1)].filter(Boolean);
    const contEmails = [cleanStr(r.ac_email), cleanStr(r.ac_email1), cleanStr(r.ac_email2), cleanStr(r.ac_email3)].filter(Boolean);

    contNames.forEach((cName, idx) => {
      if (!cName) return;
      const phone = contMobiles[idx] || contMobiles[0] || '-';
      const email = contEmails[idx] || null;
      const desig = contFrms[idx] || 'Contact Person';

      contactRows.push([
        partyId,
        cName,
        phone,
        email,
        desig
      ]);
    });
  }

  console.log(`\n[EXTRACTED SUMMARY]`);
  console.log(`  ✓ Delivery Addresses: ${deliveryAddressRows.length.toLocaleString()}`);
  console.log(`  ✓ Bank Details:       ${bankDetailRows.length.toLocaleString()}`);
  console.log(`  ✓ Contact Persons:    ${contactRows.length.toLocaleString()}`);

  // 4. Truncate and Insert
  console.log('\n[STEP 4] Truncating party_delivery_addresses, party_bank_details, party_contacts...');
  await sql`TRUNCATE TABLE party_delivery_addresses RESTART IDENTITY CASCADE;`;
  await sql`TRUNCATE TABLE party_bank_details RESTART IDENTITY CASCADE;`;
  await sql`TRUNCATE TABLE party_contacts RESTART IDENTITY CASCADE;`;

  console.log('  Inserting party delivery addresses...');
  if (deliveryAddressRows.length > 0) {
    await batchInsert(sql, 'party_delivery_addresses', [
      'party_id', 'address_line', 'city', 'state', 'pincode'
    ], deliveryAddressRows);
  }

  console.log('  Inserting party bank details...');
  if (bankDetailRows.length > 0) {
    await batchInsert(sql, 'party_bank_details', [
      'party_id', 'bank_name', 'account_no', 'ifsc_code', 'branch'
    ], bankDetailRows);
  }

  console.log('  Inserting party contacts...');
  if (contactRows.length > 0) {
    await batchInsert(sql, 'party_contacts', [
      'party_id', 'contact_name', 'contact_number', 'email_id', 'designation'
    ], contactRows);
  }

  // 5. Verification
  console.log('\n[STEP 5] Verification...');
  const [resDelv] = await sql`SELECT count(*) FROM party_delivery_addresses`;
  const [resBank] = await sql`SELECT count(*) FROM party_bank_details`;
  const [resCont] = await sql`SELECT count(*) FROM party_contacts`;

  console.log(`  ✓ party_delivery_addresses in PG: ${resDelv.count}`);
  console.log(`  ✓ party_bank_details in PG:       ${resBank.count}`);
  console.log(`  ✓ party_contacts in PG:           ${resCont.count}`);

  console.log('\nSample party_delivery_addresses:');
  const sampleDelv = await sql`
    SELECT pda.id, p.name as party_name, pda.address_line, pda.city, pda.state, pda.pincode
    FROM party_delivery_addresses pda
    JOIN parties p ON p.id = pda.party_id
    LIMIT 5;
  `;
  console.table(sampleDelv);

  console.log('\nSample party_bank_details:');
  const sampleBank = await sql`
    SELECT pbd.id, p.name as party_name, pbd.bank_name, pbd.account_no, pbd.ifsc_code, pbd.branch
    FROM party_bank_details pbd
    JOIN parties p ON p.id = pbd.party_id
    LIMIT 5;
  `;
  console.table(sampleBank);

  console.log('\n🎉 ALL PARTY SUB-ENTITIES MIGRATED SUCCESSFULLY!');
  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
