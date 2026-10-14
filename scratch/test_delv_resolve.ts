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
  const stations = new Map<number, { name: string; stateSno: number; districtSno: number; pincode: string }>();
  const states = new Map<number, string>();
  const accounts: any[] = [];

  // Pass 1: stations and states
  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[statemst]', 'INSERT [dbo].[stationmst]'])) {
    const p = parseSqlInsert(stmt);
    if (!p) continue;
    const r = p.row;
    if (p.tbl.toLowerCase() === 'statemst') {
      states.set(parseInt(r.sno, 10), cleanStr(r.state_nm) || '');
    } else if (p.tbl.toLowerCase() === 'stationmst') {
      stations.set(parseInt(r.sno, 10), {
        name: cleanStr(r.st_name) || '',
        stateSno: parseInt(r.st_state, 10) || 0,
        districtSno: parseInt(r.st_district, 10) || 0,
        pincode: cleanStr(r.st_pincode) || '',
      });
    }
  }

  console.log(`Loaded ${states.size} states, ${stations.size} stations`);

  // Pass 2: accounts
  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[accountmst]'])) {
    const p = parseSqlInsert(stmt);
    if (!p) continue;
    const r = p.row;
    const name = cleanStr(r.ac_name);
    if (!name) continue;

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

      // Address lines
      const addrParts = [delvNm, delvAdd1, delvAdd2].filter(Boolean);
      const addressLine = addrParts.join(', ').trim();

      accounts.push({
        sno: parseInt(r.sno, 10),
        name,
        addressLine: addressLine || cityName || 'Delivery Address',
        city: cityName,
        state: stateName,
        pincode: pin,
        delvPlaceSno
      });
    }
  }

  console.log(`Resolved ${accounts.length} delivery addresses`);
  console.log(`Addresses with resolved city: ${accounts.filter(a => a.city).length}`);
  console.log(`Addresses with resolved state: ${accounts.filter(a => a.state).length}`);
  console.log(`Addresses with resolved pincode: ${accounts.filter(a => a.pincode).length}`);
  console.log('Sample 10 resolved addresses:');
  console.log(accounts.slice(0, 10));
}

main().catch(console.error);
