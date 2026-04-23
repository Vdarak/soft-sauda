/**
 * GET /api/warmup — Pre-cache all data AND warm Turbopack compilation.
 * 
 * Two-phase warmup:
 * 1. Data warmup: Runs all DB queries in parallel → populates the in-memory cache
 * 2. Route warmup: Hits each API route internally → forces Turbopack to compile them
 * 
 * After this completes, every subsequent request returns in <30ms because
 * both the route code AND the data are already hot.
 */

import { ok, serverError } from '@/lib/api-helpers';
import { warmCache } from '@/lib/warmup';

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
];

export async function GET(req: Request) {
  try {
    const t0 = Date.now();

    // Phase 1: Populate the data cache (parallel DB queries)
    const cacheResult = await warmCache();
    const dataDone = Date.now() - t0;

    // Phase 2: Hit each API route to force Turbopack to compile the handler code.
    // In production this is unnecessary (routes are pre-compiled), but in dev
    // it eliminates the 2-3s "first hit" delay per route.
    const origin = new URL(req.url).origin;
    const routePromises = ROUTES_TO_WARM.map(async (route) => {
      try {
        await fetch(`${origin}${route}`, {
          headers: { 'x-warmup': '1' }, // marker so logs are clear
        });
        return { route, ok: true };
      } catch {
        return { route, ok: false };
      }
    });

    const routeResults = await Promise.all(routePromises);
    const totalMs = Date.now() - t0;

    console.log(`[warmup] Data: ${dataDone}ms | Routes: ${totalMs - dataDone}ms | Total: ${totalMs}ms`);

    return ok({
      ...cacheResult,
      routesWarmed: routeResults.filter(r => r.ok).map(r => r.route),
      elapsedMs: totalMs,
      dataMs: dataDone,
    });
  } catch (err) {
    console.error('GET /api/warmup error:', err);
    return serverError('Warmup failed');
  }
}
