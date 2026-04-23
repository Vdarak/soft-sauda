/**
 * GET /api/dashboard — Aggregated metrics for dashboard
 */

import { db } from '@/db';
import { parties, contracts, deliveries, bills, payments } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';
import { cacheGet, cacheSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cacheKey = 'dashboard:metrics';
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const [partyCount] = await db.select({ count: sql<number>`count(*)` }).from(parties);
    const [contractCount] = await db.select({ count: sql<number>`count(*)` }).from(contracts);
    const [deliveryCount] = await db.select({ count: sql<number>`count(*)` }).from(deliveries);
    const [billCount] = await db.select({ count: sql<number>`count(*)` }).from(bills);
    const [paymentCount] = await db.select({ count: sql<number>`count(*)` }).from(payments);

    // Outstanding balance (sum of all bill balances)
    const [outstanding] = await db.select({ total: sql<string>`COALESCE(SUM(balance_amount::numeric), 0)` }).from(bills);

    const metrics = {
      parties: Number(partyCount.count),
      contracts: Number(contractCount.count),
      deliveries: Number(deliveryCount.count),
      bills: Number(billCount.count),
      payments: Number(paymentCount.count),
      outstandingBalance: parseFloat(outstanding.total as string) || 0,
    };

    cacheSet(cacheKey, metrics, 30);
    return ok(metrics);
  } catch (err) {
    console.error('GET /api/dashboard error:', err);
    return serverError('Failed to fetch dashboard metrics');
  }
}
