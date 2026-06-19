/**
 * /api/market/watchlist  (all require a member token)
 *   GET    — the member's saved listings (joined for display).
 *   POST   — save a listing       { listingId }
 *   DELETE — remove a saved listing ?listingId=
 */
import { NextRequest } from 'next/server';
import { badRequest, created, ok, unauthorized } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { watchlist, listings, commodities, cities } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  const rows = await db
    .select({
      watchId: watchlist.id,
      id: listings.id,
      title: listings.title,
      qtyQuintals: listings.qtyQuintals,
      pricePerQuintal: listings.pricePerQuintal,
      status: listings.status,
      commodityName: commodities.name,
      cityName: cities.name,
      savedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(listings, eq(watchlist.listingId, listings.id))
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .where(eq(watchlist.memberId, ctx.memberId))
    .orderBy(desc(watchlist.createdAt));

  return ok({ watchlist: rows });
}

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  let listingId: number | undefined;
  try {
    ({ listingId } = (await req.json()) as { listingId?: number });
  } catch {
    return badRequest('Invalid request body');
  }
  if (!listingId || isNaN(Number(listingId))) return badRequest('listingId is required');

  // Idempotent: ignore if already saved (unique index protects against dupes).
  const [row] = await db
    .insert(watchlist)
    .values({ memberId: ctx.memberId, listingId: Number(listingId) })
    .onConflictDoNothing()
    .returning();

  return created({ saved: true, id: row?.id ?? null });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return unauthorized();

  const url = new URL(req.url);
  const listingId = parseInt(url.searchParams.get('listingId') || '', 10);
  if (isNaN(listingId)) return badRequest('listingId is required');

  await db
    .delete(watchlist)
    .where(and(eq(watchlist.memberId, ctx.memberId), eq(watchlist.listingId, listingId)));

  return ok({ removed: true });
}
