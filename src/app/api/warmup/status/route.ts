/**
 * GET /api/warmup/status — Debug and monitoring API for proactive caching status.
 */

import { NextRequest } from 'next/server';
import { ok, unauthorized } from '@/lib/api-helpers';
import { getWarmupStatus } from '@/lib/warmup';
import { getCacheStats } from '@/lib/cache';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    // Let's allow admins to query cache stats, or anyone if logged in (for debugging)
    if (!ctx) return unauthorized();

    const warmupStatus = getWarmupStatus();
    const cacheStats = getCacheStats();

    return ok({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: ctx.userId,
        role: ctx.role,
      },
      warmupStatus,
      cacheStats,
    });
  } catch (err) {
    console.error('GET /api/warmup/status error:', err);
    return ok({
      success: false,
      error: 'Failed to retrieve cache status',
    });
  }
}
