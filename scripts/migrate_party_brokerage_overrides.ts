import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { db } from '../src/db';
import { parties, partyItemBrokerage } from '../src/db/schema';
import { eq } from 'drizzle-orm';

interface RawPrtItemStp {
  sno: number;
  prtSno: number;
  itSno: number;
  packingWeight: number;
  sellerRate: number;
  sellerType: string;
  buyerRate: number;
  buyerType: string;
}

async function migratePartyBrokerageOverrides() {
  console.log('Starting migration of party brokerage overrides (prtitemstp)...');

  const sqlFilePath = path.join(__dirname, '..', 'schemawithdata.sql');
  const fileStream = fs.createReadStream(sqlFilePath, { encoding: 'utf16le' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const rawOverrides: RawPrtItemStp[] = [];
  const accountNames = new Map<number, string>();

  for await (const line of rl) {
    if (line.startsWith('INSERT [dbo].[prtitemstp]')) {
      const match = line.match(/VALUES\s*\((.*)\)/);
      if (match) {
        const parts = match[1].split(',').map((p) => p.trim().replace(/^N?'|'$/g, ''));
        rawOverrides.push({
          sno: parseInt(parts[0], 10),
          prtSno: parseInt(parts[1], 10),
          itSno: parseInt(parts[2], 10),
          packingWeight: parseFloat(parts[3]),
          sellerRate: parseFloat(parts[5]),
          sellerType: parts[6].trim(),
          buyerRate: parseFloat(parts[7]),
          buyerType: parts[8].trim(),
        });
      }
    } else if (line.startsWith('INSERT [dbo].[accountmst]')) {
      const match = line.match(/VALUES\s*\(\s*(\d+),\s*N?'([^']+)'/);
      if (match) {
        accountNames.set(parseInt(match[1], 10), match[2].trim());
      }
    }
  }

  console.log(`Found ${rawOverrides.length} records in prtitemstp and ${accountNames.size} account masters.`);

  // Load all parties from PostgreSQL
  const dbParties = await db.select({ id: parties.id, name: parties.name }).from(parties);
  const partyNameToId = new Map<string, number>();
  for (const p of dbParties) {
    partyNameToId.set(p.name.trim().toUpperCase(), p.id);
  }

  let insertedCount = 0;
  let skippedCount = 0;

  for (const raw of rawOverrides) {
    const pName = accountNames.get(raw.prtSno);
    if (!pName) {
      console.warn(`Skipping prt_sno ${raw.prtSno}: Name not found in accountmst`);
      skippedCount++;
      continue;
    }

    const partyId = partyNameToId.get(pName.trim().toUpperCase());
    if (!partyId) {
      console.warn(`Skipping party "${pName}": Not found in database parties table`);
      skippedCount++;
      continue;
    }

    // Clean rate types: 'PQtl' -> 'PMT', 'Bag' -> 'BAG', empty -> 'PMT'
    const cleanType = (t: string) => {
      const upper = t.toUpperCase();
      if (upper.includes('BAG')) return 'BAG';
      if (upper.includes('PCT') || upper.includes('%')) return 'PCT';
      return 'PMT';
    };

    const sType = cleanType(raw.sellerType);
    const bType = cleanType(raw.buyerType);

    // Insert into party_item_brokerage
    await db.insert(partyItemBrokerage).values({
      partyId,
      commodityId: raw.itSno > 0 ? raw.itSno : null,
      packingWeight: raw.packingWeight.toFixed(3),
      sellerBrokerageRate: raw.sellerRate.toFixed(2),
      sellerBrokerageType: sType,
      buyerBrokerageRate: raw.buyerRate.toFixed(2),
      buyerBrokerageType: bType,
    });

    console.log(`Migrated override #${raw.sno}: Party "${pName}" (ID: ${partyId}) | Pack: ${raw.packingWeight}kg | Seller: ₹${raw.sellerRate} (${sType}) | Buyer: ₹${raw.buyerRate} (${bType})`);
    insertedCount++;
  }

  console.log(`Successfully migrated ${insertedCount} party brokerage override rules (${skippedCount} skipped).`);
}

migratePartyBrokerageOverrides()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
