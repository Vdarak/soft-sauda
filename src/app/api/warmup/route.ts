/**
 * GET /api/warmup — Pre-cache all data AND warm Turbopack compilation.
 * 
 * SCOPING: Scoped by company_id and fiscal_year_id from request context.
 */

import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getCachedWarmup } from '@/lib/warmup';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const t0 = Date.now();

    const payload = await getCachedWarmup(companyId, fiscalYearId);
    const dataDone = Date.now() - t0;
    
    return ok({
      success: true,
      payload,
      stats: { timeMs: dataDone, dataDone }
    });
  } catch (err) {
    console.error('GET /api/warmup error:', err);
    return serverError('Warmup failed');
  }
}
