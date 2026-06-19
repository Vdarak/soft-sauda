/**
 * GET /api/market/listings/[id] — public listing detail (joined).
 */
import { NextRequest } from 'next/server';
import { notFound, ok } from '@/lib/api-helpers';
import { db } from '@/db';
import { listings, commodities, cities, members, commodityPackaging } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) return notFound('Listing not found');

  const [row] = await db
    .select({
      id: listings.id,
      title: listings.title,
      listingType: listings.listingType,
      direction: listings.direction,
      status: listings.status,
      qtyQuintals: listings.qtyQuintals,
      pricePerQuintal: listings.pricePerQuintal,
      qualityNotes: listings.qualityNotes,
      closeDate: listings.closeDate,
      createdAt: listings.createdAt,
      commodityId: listings.commodityId,
      commodityName: commodities.name,
      cityName: cities.name,
      packingType: commodityPackaging.packingType,
      packingWeight: commodityPackaging.packingWeight,
      sellerId: members.id,
      sellerName: members.name,
      sellerVerified: members.isVerified,
    })
    .from(listings)
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(members, eq(listings.memberId, members.id))
    .leftJoin(commodityPackaging, eq(listings.packagingId, commodityPackaging.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!row) return notFound('Listing not found');
  return ok({ listing: row });
}
