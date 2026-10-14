import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { db } from '../src/db/index';
import { banks, parties } from '../src/db/schema/index';

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
  console.log('Fetching all banks and parties from PostgreSQL...');
  const allBanks = await db.select({
    id: banks.id,
    bankName: banks.bankName,
    branch: banks.branch,
    ifscCode: banks.ifscCode
  }).from(banks);

  const bankMap = new Map<number, { bankName: string; branch: string | null; ifscCode: string | null }>();
  allBanks.forEach(b => bankMap.set(b.id, b));

  const allParties = await db.select({ id: parties.id, name: parties.name }).from(parties);
  const partyMap = new Map<string, number>();
  allParties.forEach(p => partyMap.set(p.name.trim().toUpperCase(), p.id));

  console.log(`Loaded ${bankMap.size} banks from PG, ${partyMap.size} parties from PG.`);

  const bankRecords: any[] = [];

  for await (const stmt of readStatements(SQL_FILE, ['INSERT [dbo].[accountmst]'])) {
    const p = parseSqlInsert(stmt);
    if (!p) continue;
    const r = p.row;
    const name = cleanStr(r.ac_name);
    if (!name) continue;

    const partyId = partyMap.get(name.toUpperCase());
    if (!partyId) {
      console.warn(`Party not found in PG: "${name}"`);
      continue;
    }

    for (const idx of [1, 2, 3]) {
      const bSno = parseInt(r[`ac_bnk${idx}`], 10) || 0;
      let acNo = cleanStr(r[`ac_bnkac${idx}`]);

      if (bSno > 0 || (acNo && acNo !== '-')) {
        const bankInfo = bankMap.get(bSno);
        let bName = bankInfo?.bankName || null;
        let branch = bankInfo?.branch || null;
        let ifsc = bankInfo?.ifscCode || null;

        // Clean up weird legacy entries where IFSC was in acNo
        if (acNo && /ifsc(?:\s*code)?\s*[:-]?\s*([a-z0-9]+)/i.test(acNo)) {
          const m = acNo.match(/ifsc(?:\s*code)?\s*[:-]?\s*([a-z0-9]+)/i);
          if (m && !ifsc) {
            ifsc = m[1].toUpperCase();
          }
          // If acNo was solely the IFSC code, clear acNo or set to '-'
          if (acNo.replace(/ifsc(?:\s*code)?\s*[:-]?\s*[a-z0-9]+/i, '').trim().length === 0) {
            acNo = '-';
          }
        }

        // If bankName is missing or generic, try to infer from ifsc
        if (!bName && ifsc) {
          if (ifsc.startsWith('SBIN')) bName = 'STATE BANK OF INDIA';
          else if (ifsc.startsWith('HDFC')) bName = 'HDFC BANK LTD';
          else if (ifsc.startsWith('ICIC')) bName = 'ICICI BANK';
          else if (ifsc.startsWith('UTIB')) bName = 'AXIS BANK';
          else if (ifsc.startsWith('PUNB')) bName = 'PUNJAB NATIONAL BANK';
          else if (ifsc.startsWith('CNRB')) bName = 'CANARA BANK';
          else if (ifsc.startsWith('BARB')) bName = 'BANK OF BARODA';
          else if (ifsc.startsWith('UBIN')) bName = 'UNION BANK OF INDIA';
        }

        bankRecords.push({
          partyId,
          partyName: name,
          bankName: bName || 'Bank',
          accountNo: acNo || '-',
          ifscCode: ifsc || null,
          branch: branch || null,
          bSno
        });
      }
    }
  }

  console.log(`Total resolved bank records: ${bankRecords.length}`);
  const genericBanks = bankRecords.filter(b => b.bankName === 'Bank');
  console.log(`Generic "Bank" records: ${genericBanks.length}`);
  console.log(`Records with account number: ${bankRecords.filter(b => b.accountNo && b.accountNo !== '-').length}`);
  console.log(`Records with IFSC: ${bankRecords.filter(b => b.ifscCode).length}`);
  console.log('Sample 10 bank records:');
  console.log(bankRecords.slice(0, 10));

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
