/**
 * GET /api/dashboard — Aggregated metrics for dashboard (company+FY scoped)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties, contracts, deliveries, bills, payments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const cacheKey = `dashboard:metrics:${companyId}:${fiscalYearId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const [partyCount] = await db.select({ count: sql<number>`count(*)` }).from(parties);
    
    const [contractCount] = await db.select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(and(eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)));
      
    const [deliveryCount] = await db.select({ count: sql<number>`count(*)` })
      .from(deliveries)
      .where(and(eq(deliveries.companyId, companyId), eq(deliveries.fiscalYearId, fiscalYearId)));
      
    const [billCount] = await db.select({ count: sql<number>`count(*)` })
      .from(bills)
      .where(and(eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)));
      
    const [paymentCount] = await db.select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.fiscalYearId, fiscalYearId)));

    // Outstanding balance (sum of all bill balances)
    const [outstanding] = await db.select({ total: sql<string>`COALESCE(SUM(balance_amount::numeric), 0)` })
      .from(bills)
      .where(and(eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)));

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
