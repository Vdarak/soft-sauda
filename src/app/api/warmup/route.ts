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
    if (!ctx) {
      console.warn('[API /api/warmup] Unauthorized access attempt');
      return unauthorized();
    }

    const { companyId, fiscalYearId } = ctx;
    const t0 = Date.now();

    console.log(`[API /api/warmup] GET request received for Company: ${companyId}, FY: ${fiscalYearId}`);
    const payload = await getCachedWarmup(companyId, fiscalYearId);
    const dataDone = Date.now() - t0;
    console.log(`[API /api/warmup] GET response ready in ${dataDone}ms`);
    
    return ok({
      success: true,
      payload,
      stats: { timeMs: dataDone, dataDone }
    });
  } catch (err) {
    console.error('[API /api/warmup] GET error:', err);
    return serverError('Warmup failed');
  }
}
