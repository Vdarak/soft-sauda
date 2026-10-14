import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

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

async function main() {
  console.log('Reading stations, banks, and accounts...');
  const stations = new Map<number, { name: string; stateSno: number; districtSno: number; pincode: string }>();
  const states = new Map<number, string>();
  const banks = new Map<number, { name: string; branch: string; ifsc: string }>();
  const delvAddresses: any[] = [];
  const bankAccounts: any[] = [];
  let totalAccounts = 0;

  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[statemst]', 'INSERT [dbo].[stationmst]', 'INSERT [dbo].[bankmst]', 'INSERT [dbo].[accountmst]'])) {
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
        districtSno: parseInt(r.st_district, 10) || 0,
        pincode: cleanStr(r.st_pincode) || '',
      });
    } else if (p.tbl.toLowerCase() === 'bankmst') {
      const sno = parseInt(r.sno, 10);
      banks.set(sno, {
        name: cleanStr(r.bnk_name, 100) || '',
        branch: cleanStr(r.bnk_brnch, 100) || '',
        ifsc: cleanStr(r.bnk_ifsc, 30) || '',
      });
    } else if (p.tbl.toLowerCase() === 'accountmst') {
      totalAccounts++;
      const sno = parseInt(r.sno, 10);
      const name = cleanStr(r.ac_name);
      if (!name) continue;

      // Delivery Address
      const delvNm = cleanStr(r.ac_delvnm);
      const delvAdd1 = cleanStr(r.ac_delvadd1);
      const delvAdd2 = cleanStr(r.ac_delvadd2);
      const delvPlaceSno = parseInt(r.ac_delvplace, 10) || 0;
      const delvPin = cleanStr(r.ac_delvpin);

      const hasDelv = delvNm || delvAdd1 || delvAdd2 || delvPlaceSno > 0 || delvPin;
      if (hasDelv) {
        const stn = stations.get(delvPlaceSno);
        const stateName = stn ? states.get(stn.stateSno) || null : null;
        const cityName = stn?.name || null;
        const pin = delvPin || stn?.pincode || null;

        // Build address line
        const addrParts = [delvNm, delvAdd1, delvAdd2].filter(Boolean);
        const addressLine = addrParts.join(', ').trim();

        if (addressLine || cityName) {
          delvAddresses.push({
            sno,
            partyName: name,
            addressLine: addressLine || cityName || 'Delivery Address',
            city: cityName,
            state: stateName,
            pincode: pin,
          });
        }
      }

      // Bank Details
      for (const idx of [1, 2, 3]) {
        const bSno = parseInt(r[`ac_bnk${idx}`], 10) || 0;
        const acNo = cleanStr(r[`ac_bnkac${idx}`]);
        if (bSno > 0 || (acNo && acNo !== '-')) {
          const b = banks.get(bSno);
          bankAccounts.push({
            sno,
            partyName: name,
            bankName: b?.name || (bSno ? `Bank #${bSno}` : 'Bank'),
            accountNo: acNo || '-',
            ifscCode: b?.ifsc || null,
            branch: b?.branch || null,
          });
        }
      }
    }
  }

  console.log(`Finished scanning!`);
  console.log(`Total accounts: ${totalAccounts}`);
  console.log(`Stations loaded: ${stations.size}`);
  console.log(`Banks loaded: ${banks.size}`);
  console.log(`Delivery addresses extracted: ${delvAddresses.length}`);
  console.log(`Bank accounts extracted: ${bankAccounts.length}`);
  console.log(`Sample delivery addresses (first 5):`, delvAddresses.slice(0, 5));
  console.log(`Sample bank accounts (first 5):`, bankAccounts.slice(0, 5));
}

main().catch(console.error);
