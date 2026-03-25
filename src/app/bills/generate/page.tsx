import { db } from '@/db';
import { parties, commodities } from '@/db/schema';
import BulkBillClient from '@/components/BulkBillClient';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function BulkBillGeneratorPage() {
  const partyList = await db.select().from(parties).orderBy(asc(parties.name));
  const commList = await db.select().from(commodities).orderBy(asc(commodities.name));
  
  return <BulkBillClient parties={partyList} commodities={commList} />;
}
