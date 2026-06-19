/**
 * GET /api/market/commodities — public list of commodities for the marketplace
 * (id + name + volatility tier). Used to populate the "post a listing" form.
 */
import { ok } from '@/lib/api-helpers';
import { db } from '@/db';
import { commodities } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  const rows = await db
    .select({
      id: commodities.id,
      name: commodities.name,
      shortName: commodities.shortName,
      volatilityTier: commodities.volatilityTier,
    })
    .from(commodities)
    .orderBy(asc(commodities.name));

  return ok({ commodities: rows });
}
