/**
 * GET /api/search/parties?q=term — Search parties by name for autocomp.js
 * Returns array of { value, label } objects
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties } from '@/db/schema';
import { ilike } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    if (q.length < 1) return ok([]);

    const cacheKey = `search:parties:${q.toLowerCase()}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    const results = await db.select({ id: parties.id, name: parties.name, place: parties.place })
      .from(parties)
      .where(ilike(parties.name, `%${q}%`))
      .limit(15);

    const formatted = results.map(r => ({
      value: r.name,
      label: r.name + (r.place ? ` (${r.place})` : ''),
    }));

    cacheSet(cacheKey, formatted, 10);
    return ok(formatted);
  } catch (err) {
    console.error('GET /api/search/parties error:', err);
    return serverError('Search failed');
  }
}
