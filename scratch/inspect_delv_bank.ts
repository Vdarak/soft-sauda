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

  const stations = new Map<number, { name: string; state: string; district: string; pincode: string }>();
  const banks = new Map<number, { name: string; branch: string; ifsc: string }>();
  const delvAccounts: any[] = [];
  const bankAccounts: any[] = [];

  for await (const line of rl) {
    if (line.startsWith('INSERT [dbo].[stationmst]')) {
      const p = parseSqlInsert(line);
      if (p) {
        stations.set(parseInt(p.row.sno), {
          name: p.row.st_name?.trim() || '',
          state: p.row.st_state?.trim() || '',
          district: p.row.st_district?.trim() || '',
          pincode: p.row.st_pincode?.trim() || '',
        });
      }
    } else if (line.startsWith('INSERT [dbo].[bankmst]')) {
      const p = parseSqlInsert(line);
      if (p) {
        banks.set(parseInt(p.row.sno), {
          name: p.row.bnk_name?.trim() || '',
          branch: p.row.bnk_brnch?.trim() || '',
          ifsc: p.row.bnk_ifsc?.trim() || '',
        });
      }
    } else if (line.startsWith('INSERT [dbo].[accountmst]')) {
      const p = parseSqlInsert(line);
      if (p) {
        const r = p.row;
        const add1 = r.ac_delvadd1?.trim();
        const add2 = r.ac_delvadd2?.trim();
        const nm = r.ac_delvnm?.trim();
        const pl = parseInt(r.ac_delvplace || '0');
        const pin = r.ac_delvpin?.trim();
        if (add1 || add2 || nm || pl > 0 || pin) {
          delvAccounts.push({
            sno: r.sno,
            name: r.ac_name?.trim(),
            nm,
            add1,
            add2,
            pl,
            pin,
            tin: r.ac_delvtin?.trim(),
            pan: r.ac_delvpan?.trim(),
            vat: r.ac_delvvat?.trim(),
            pho: r.ac_delvpho1?.trim() || r.ac_delvpho2?.trim() || r.ac_delvphm1?.trim() || r.ac_delvphm2?.trim()
          });
        }

        const b1 = parseInt(r.ac_bnk1 || '0');
        const b2 = parseInt(r.ac_bnk2 || '0');
        const b3 = parseInt(r.ac_bnk3 || '0');
        const ac1 = r.ac_bnkac1?.trim();
        const ac2 = r.ac_bnkac2?.trim();
        const ac3 = r.ac_bnkac3?.trim();
        if (b1 || b2 || b3 || ac1 || ac2 || ac3) {
          bankAccounts.push({
            sno: r.sno,
            name: r.ac_name?.trim(),
            banks: [
              { bSno: b1, acNo: ac1 },
              { bSno: b2, acNo: ac2 },
              { bSno: b3, acNo: ac3 },
            ]
          });
        }
      }
    }
  }

  console.log(`Found ${delvAccounts.length} accounts with delivery info`);
  console.log(`Found ${bankAccounts.length} accounts with bank info`);
  console.log('Sample delivery accounts:');
  console.log(delvAccounts.slice(0, 5));
  console.log('Sample bank accounts:');
  console.log(bankAccounts.slice(0, 5));
}
run();
