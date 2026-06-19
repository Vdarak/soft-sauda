/**
 * GET /api/market/tenders — public feed of active government tenders.
 */
import { NextRequest } from 'next/server';
import { ok } from '@/lib/api-helpers';
import { db } from '@/db';
import { listings, commodities, cities } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const commodityId = url.searchParams.get('commodityId');

  const filters = [eq(listings.listingType, 'TENDER'), eq(listings.status, 'ACTIVE')];
  if (commodityId && !isNaN(parseInt(commodityId, 10))) {
    filters.push(eq(listings.commodityId, parseInt(commodityId, 10)));
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      qtyQuintals: listings.qtyQuintals,
      pricePerQuintal: listings.pricePerQuintal, // acts as base price
      qualityNotes: listings.qualityNotes,
      closeDate: listings.closeDate,
      createdAt: listings.createdAt,
      commodityId: listings.commodityId,
      commodityName: commodities.name,
      volatilityTier: commodities.volatilityTier,
      cityName: cities.name,
    })
    .from(listings)
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .where(and(...filters))
    .orderBy(desc(listings.createdAt));

  return ok({ tenders: rows });
}
