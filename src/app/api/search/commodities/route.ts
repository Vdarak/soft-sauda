/**
 * GET /api/search/commodities?q=term — Search commodities by name for autocomp.js
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { commodities } from '@/db/schema';
import { ilike } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (q.length < 1) return ok([]);

    const cacheKey = `search:commodities:${q.toLowerCase()}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    const results = await db.select({ id: commodities.id, name: commodities.name, unit: commodities.unit })
      .from(commodities)
      .where(ilike(commodities.name, `%${q}%`))
      .limit(15);

    const formatted = results.map(r => ({
      value: r.name,
      label: r.name + (r.unit ? ` (${r.unit})` : ''),
    }));

    cacheSet(cacheKey, formatted, 10);
    return ok(formatted);
  } catch (err) {
    console.error('GET /api/search/commodities error:', err);
    return serverError('Search failed');
  }
}
