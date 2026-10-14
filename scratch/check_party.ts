import * as fs from 'fs';
import * as readline from 'readline';

function parseSqlInsert(stmt: string) {
  const m = stmt.trim().match(/^INSERT\s+(?:\[?dbo\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*)\)$/i);
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

async function run() {
  const fileStream = fs.createReadStream('schemawithdata.sql', { encoding: 'utf16le' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let partyRows: any[] = [];
  let accountRows: any[] = [];

  for await (const line of rl) {
    if (line.startsWith('INSERT [dbo].[Party]')) {
      const p = parseSqlInsert(line);
      if (p) partyRows.push(p.row);
    } else if (line.startsWith('INSERT [dbo].[accountmst]')) {
      const p = parseSqlInsert(line);
      if (p && accountRows.length < 500) accountRows.push(p.row);
    }
  }

  console.log(`Loaded ${partyRows.length} Party rows, ${accountRows.length} accountmst sample rows`);
  // Check party rows sample
  const nonBlankPartyBank = partyRows.filter(p => p.Bank || p.BankAcNo || p.BankIFCICode);
  console.log(`Party rows with bank: ${nonBlankPartyBank.length}`);
  const nonBlankPartyAddr = partyRows.filter(p => p.Address && p.Address.trim());
  console.log(`Party rows with address: ${nonBlankPartyAddr.length}`);
  if (nonBlankPartyAddr.length > 0) {
    console.log('Sample Party with Address:', nonBlankPartyAddr[0]);
  }
}
run();
