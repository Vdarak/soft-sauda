/**
 * GET /api/warmup — Pre-cache all data AND warm Turbopack compilation.
 * 
 * SCOPING: Scoped by company_id and fiscal_year_id from request context.
 */

import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { warmCache } from '@/lib/warmup';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/** Internal route URLs to warm up (forces Turbopack compilation of each route handler) */
const ROUTES_TO_WARM = [
  '/api/dashboard',
  '/api/parties',
  '/api/parties/0',
  '/api/commodities',
  '/api/commodities/0',
  '/api/contracts',
  '/api/contracts/0',
  '/api/deliveries',
  '/api/deliveries/0',
  '/api/bills',
  '/api/bills/0',
  '/api/payments',
  '/api/payments/0',
  '/api/ledger',
  '/api/cities',
  '/api/search/parties',
  '/api/search/commodities',
  '/api/search/packaging',
];

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const t0 = Date.now();

    const cacheResult = await warmCache(companyId, fiscalYearId);
    const dataDone = Date.now() - t0;

    const timeMs = Date.now() - t0;
    
    return ok({
      success: true,
      payload: cacheResult.payload,
      stats: { warmed: cacheResult.warmed.length, skipped: cacheResult.skipped.length, timeMs, dataDone }
    });
  } catch (err) {
    console.error('GET /api/warmup error:', err);
    return serverError('Warmup failed');
  }
}
