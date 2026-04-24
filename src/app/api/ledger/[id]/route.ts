/**
 * GET /api/ledger/:id — Get single ledger entry
 * PUT /api/ledger/:id — Update ledger entry
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { ledger, parties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ledger entry ID');

    const cacheKey = `ledger:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const entry = await db.select().from(ledger).where(eq(ledger.id, id)).limit(1);
    if (entry.length === 0) return notFound('Ledger entry not found');

    const account = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, entry[0].accountId)).limit(1);
    const result = { ...entry[0], accountName: account[0]?.name || 'Unknown' };

    cacheSet(cacheKey, result, 60);
    return ok(result);
  } catch (err) {
    console.error('GET /api/ledger/[id] error:', err);
    return serverError('Failed to fetch ledger entry');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ledger entry ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.accountId) return badRequest('Account ID is required');

    const debit = parseFloat(body.debit || '0');
    const credit = parseFloat(body.credit || '0');
    if (debit <= 0 && credit <= 0) return badRequest('At least one positive amount is required');

    await db.update(ledger).set({
      transactionDate: body.transactionDate ? new Date(body.transactionDate) : undefined,
      accountId: parseInt(body.accountId, 10),
      sourceId: body.voucherRef ? parseInt(body.voucherRef, 10) : null,
      narration: body.narration || null,
      debit: debit > 0 ? debit.toString() : '0.00',
      credit: credit > 0 ? credit.toString() : '0.00',
    }).where(eq(ledger.id, id));

    cacheInvalidate('ledger');
    const updated = await db.select().from(ledger).where(eq(ledger.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/ledger/[id] error:', err);
    return serverError('Failed to update ledger entry');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');
    await db.delete(ledger).where(eq(ledger.id, id));
    cacheInvalidate('ledger');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/ledger/[id] error:', err);
    return serverError('Failed to delete');
  }
}
