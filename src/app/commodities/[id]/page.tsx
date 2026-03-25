import { db } from '@/db';
import { commodities, commodityPackaging, commoditySpecifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import CommodityEditClient from '@/components/CommodityEditClient';

export default async function EditCommodityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  
  if (isNaN(id)) {
    redirect('/commodities');
  }

  const result = await db.select().from(commodities).where(eq(commodities.id, id)).limit(1);
  if (result.length === 0) {
    redirect('/commodities');
  }

  const commodity = result[0];
  const packs = await db.select().from(commodityPackaging).where(eq(commodityPackaging.commodityId, id));
  const specs = await db.select().from(commoditySpecifications).where(eq(commoditySpecifications.commodityId, id));

  return (
    <CommodityEditClient 
      commodity={commodity} 
      initialPackList={packs} 
      initialSpecList={specs} 
    />
  );
}
