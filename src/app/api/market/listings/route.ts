/**
 * /api/market/listings
 *   GET  — public feed of ACTIVE listings (no auth). Supports ?commodityId,
 *          ?q (title search), ?limit. Joined with commodity, city and seller.
 *   POST — create a listing (requires a member token; sellers/both only).
 */
import { NextRequest } from 'next/server';
import { badRequest, created, forbidden, ok } from '@/lib/api-helpers';
import { getMemberContext } from '@/lib/market-auth';
import { db } from '@/db';
import { listings, commodities, cities, members } from '@/db/schema';
import { and, desc, eq, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const commodityId = url.searchParams.get('commodityId');
  const q = url.searchParams.get('q');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);

  const listingType = url.searchParams.get('listingType') || 'OPEN';
  const filters = [eq(listings.status, 'ACTIVE'), eq(listings.listingType, listingType as any)];
  if (commodityId && !isNaN(parseInt(commodityId, 10))) {
    filters.push(eq(listings.commodityId, parseInt(commodityId, 10)));
  }
  if (q && q.trim()) {
    filters.push(ilike(listings.title, `%${q.trim()}%`));
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      listingType: listings.listingType,
      direction: listings.direction,
      qtyQuintals: listings.qtyQuintals,
      pricePerQuintal: listings.pricePerQuintal,
      qualityNotes: listings.qualityNotes,
      closeDate: listings.closeDate,
      createdAt: listings.createdAt,
      commodityId: listings.commodityId,
      commodityName: commodities.name,
      cityName: cities.name,
      sellerName: members.name,
      sellerVerified: members.isVerified,
    })
    .from(listings)
    .leftJoin(commodities, eq(listings.commodityId, commodities.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(members, eq(listings.memberId, members.id))
    .where(and(...filters))
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  return ok({ listings: rows });
}

interface CreateBody {
  commodityId: number;
  title: string;
  qtyQuintals?: number | string;
  pricePerQuintal?: number | string;
  qualityNotes?: string;
  cityId?: number;
  packagingId?: number;
  direction?: 'SELL' | 'BUY';
}

export async function POST(req: NextRequest) {
  const ctx = await getMemberContext(req);
  if (!ctx) return forbidden('Sign in to post a listing');
  if (ctx.role === 'BUYER') return forbidden('Your account is buyer-only');

  let body: CreateBody | null = null;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return badRequest('Invalid request body');
  }

  const commodityId = Number(body?.commodityId);
  const title = body?.title?.trim();
  if (!commodityId || isNaN(commodityId)) return badRequest('commodityId is required');
  if (!title) return badRequest('title is required');

  // Validate the commodity exists (FK + clearer error).
  const [commodity] = await db.select({ id: commodities.id }).from(commodities).where(eq(commodities.id, commodityId)).limit(1);
  if (!commodity) return badRequest('Unknown commodity');

  const direction = body.direction === 'BUY' ? 'BUY' : 'SELL';

  const [row] = await db
    .insert(listings)
    .values({
      memberId: ctx.memberId,
      commodityId,
      title,
      direction,
      qtyQuintals: body.qtyQuintals != null ? String(body.qtyQuintals) : null,
      pricePerQuintal: body.pricePerQuintal != null ? String(body.pricePerQuintal) : null,
      qualityNotes: body.qualityNotes?.trim() || null,
      cityId: body.cityId ? Number(body.cityId) : null,
      packagingId: body.packagingId ? Number(body.packagingId) : null,
    })
    .returning();

  return created({ listing: row });
}
