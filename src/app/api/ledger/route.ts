/**
 * GET  /api/ledger  — List ledger entries with account names (JOIN, no N+1)
 * POST /api/ledger  — Create manual journal entry
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { ledger, parties } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const accountId = searchParams.get('accountId');
    const offset = (page - 1) * limit;

    const cacheKey = `ledger:list:${page}:${limit}:${accountId || 'all'}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    // ── Single JOIN query instead of N+1 ──
    let query = db.select({
      id: ledger.id,
      transactionDate: ledger.transactionDate,
      accountId: ledger.accountId,
      sourceType: ledger.sourceType,
      sourceId: ledger.sourceId,
      debit: ledger.debit,
      credit: ledger.credit,
      narration: ledger.narration,
      createdAt: ledger.createdAt,
      accountName: parties.name,
    })
      .from(ledger)
      .leftJoin(parties, eq(parties.id, ledger.accountId));

    if (accountId) {
      query = query.where(eq(ledger.accountId, parseInt(accountId, 10))) as typeof query;
    }

    const data = await query.orderBy(desc(ledger.id)).limit(limit).offset(offset);

    cacheSet(cacheKey, data, 30);
    return ok(data);
  } catch (err) {
    console.error('GET /api/ledger error:', err);
    return serverError('Failed to fetch ledger');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.accountId) return badRequest('Account ID is required');

    const debit = parseFloat(body.debit || '0');
    const credit = parseFloat(body.credit || '0');

    if (debit <= 0 && credit <= 0) return badRequest('At least one positive amount is required');

    const [entry] = await db.insert(ledger).values({
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
      accountId: parseInt(body.accountId, 10),
      sourceType: 'MANUAL',
      sourceId: body.voucherRef ? parseInt(body.voucherRef, 10) : null,
      narration: body.narration || null,
      debit: debit > 0 ? debit.toString() : '0.00',
      credit: credit > 0 ? credit.toString() : '0.00',
    }).returning();

    cacheInvalidate('ledger');
    return created(entry);
  } catch (err) {
    console.error('POST /api/ledger error:', err);
    return serverError('Failed to create ledger entry');
  }
}
