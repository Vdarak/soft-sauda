/**
 * GET /api/market/bids — get bids submitted by the current member.
 */
import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { bids, listings, commodities, cities } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized('Sign in to view bids');

  const rows = await db
    .select({
      id: bids.id,
      bidPricePerQuintal: bids.bidPricePerQuintal,
      qtyQuintals: bids.qtyQuintals,
      tokenLocked: bids.tokenLocked,
      status: bids.status,
      createdAt: bids.createdAt,
      listingId: bids.listingId,
      listingTitle: listings.title,
      commodityName: commodities.name,
      cityName: cities.name,
    })
    .from(bids)
    .innerJoin(listings, eq(bids.listingId, listings.id))
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .where(eq(bids.memberId, ctx.memberId))
    .orderBy(desc(bids.createdAt));

  return ok({ bids: rows });
}
