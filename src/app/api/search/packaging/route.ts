/**
 * GET /api/search/packaging?commodityId=X — Get packaging options for a commodity
 * WS5: Commodity Brokerage Wiring
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { commodityPackaging } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const commodityId = searchParams.get('commodityId');
    
    if (!commodityId) return badRequest('commodityId is required');

    const rows = await db.select().from(commodityPackaging)
      .where(eq(commodityPackaging.commodityId, parseInt(commodityId, 10)));

    return ok(rows);
  } catch (err) {
    console.error('GET /api/search/packaging error:', err);
    return serverError('Failed to fetch packaging');
  }
}
