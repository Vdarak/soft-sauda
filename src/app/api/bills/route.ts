/**
 * GET  /api/bills  — List bills with party names (JOIN, no N+1)
 * POST /api/bills  — Create bill + ledger posting
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, ledger, parties } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function resolveParty(name: string | null | undefined): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await db.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await db.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // ── Search Mode ──
    if (q) {
      const searchPattern = `%${q}%`;
      const { or, ilike } = require('drizzle-orm');
      const data = await db.select({
        id: bills.id,
        billNo: bills.billNo,
        billDate: bills.billDate,
        partyId: bills.partyId,
        basis: bills.basis,
        totalAmount: bills.totalAmount,
        balanceAmount: bills.balanceAmount,
        creditDays: bills.creditDays,
        createdAt: bills.createdAt,
        partyName: parties.name,
      })
        .from(bills)
        .leftJoin(parties, eq(parties.id, bills.partyId))
        .where(
          or(
            ilike(bills.billNo, searchPattern),
            ilike(parties.name, searchPattern)
          )
        )
        .orderBy(desc(bills.id))
        .limit(100);
      return ok(data);
    }

    // ── Standard Paginated Mode ──
    const cacheKey = `bills:list:${page}:${limit}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    const data = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      partyId: bills.partyId,
      basis: bills.basis,
      totalAmount: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      creditDays: bills.creditDays,
      createdAt: bills.createdAt,
      partyName: parties.name,
    })
      .from(bills)
      .leftJoin(parties, eq(parties.id, bills.partyId))
      .orderBy(desc(bills.id))
      .limit(limit)
      .offset(offset);

    cacheSet(cacheKey, data, 30);
    return ok(data);
  } catch (err) {
    console.error('GET /api/bills error:', err);
    return serverError('Failed to fetch bills');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.billNo) return badRequest('Bill number is required');
    if (!body.partyName) return badRequest('Party name is required');

    const partyId = await resolveParty(body.partyName);
    if (!partyId) return badRequest('A valid party is required');

    const totalAmount = parseFloat(body.totalAmount || '0');
    if (totalAmount <= 0) return badRequest('Bill amount must be greater than zero');

    const billDate = body.billDate ? new Date(body.billDate) : new Date();
    const basis = body.basis || 'DIRECT';

    const [bill] = await db.insert(bills).values({
      billNo: body.billNo,
      billDate,
      partyId,
      basis,
      totalAmount: totalAmount.toString(),
      balanceAmount: totalAmount.toString(),
      creditDays: body.creditDays ? parseInt(body.creditDays, 10) : null,
    }).returning();

    // Create bill line item
    await db.insert(billLines).values({
      billId: bill.id,
      description: body.description || `Bill against ${basis}`,
      amount: totalAmount.toString(),
      referenceType: basis,
    });

    // Post to ledger (Debit the party's account)
    await db.insert(ledger).values({
      transactionDate: billDate,
      accountId: partyId,
      sourceType: 'BILL',
      sourceId: bill.id,
      debit: totalAmount.toString(),
      credit: '0.00',
      narration: `Bill Generated: #${body.billNo} (${basis})`,
    });

    cacheInvalidate('bills');
    cacheInvalidate('ledger');
    return created(bill);
  } catch (err: any) {
    console.error('POST /api/bills error:', err);
    if (err.message?.includes('unique')) return badRequest('A bill with this number already exists');
    return serverError('Failed to create bill');
  }
}
