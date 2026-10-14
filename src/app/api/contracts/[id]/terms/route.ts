/**
 * /api/contracts/[id]/terms
 * GET, POST, PUT, DELETE for contract terms (saudatrms)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { contracts, contractTerms } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, unauthorized, parseBody } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const terms = await db.select()
      .from(contractTerms)
      .where(eq(contractTerms.contractId, contractId))
      .orderBy(contractTerms.sortOrder, contractTerms.id);

    return ok(terms);
  } catch (err) {
    console.error('GET /api/contracts/[id]/terms error:', err);
    return serverError('Failed to fetch contract terms');
  }
}

export async function POST(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const body = await parseBody<{ narration: string; sortOrder?: number }>(req);
    if (!body || !body.narration?.trim()) return badRequest('Term narration is required');

    const [inserted] = await db.insert(contractTerms).values({
      contractId,
      narration: body.narration.trim(),
      sortOrder: body.sortOrder ?? 0,
    }).returning();

    return ok(inserted);
  } catch (err) {
    console.error('POST /api/contracts/[id]/terms error:', err);
    return serverError('Failed to create contract term');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const body = await parseBody<{ terms: Array<{ id?: number; narration: string; sortOrder?: number }> }>(req);
    if (!body || !Array.isArray(body.terms)) return badRequest('Array of terms required');

    await db.transaction(async (tx) => {
      await tx.delete(contractTerms).where(eq(contractTerms.contractId, contractId));
      if (body.terms.length > 0) {
        const rows = body.terms
          .filter(t => t.narration && t.narration.trim().length > 0)
          .map((t, index) => ({
            contractId,
            narration: t.narration.trim(),
            sortOrder: t.sortOrder ?? index,
          }));
        if (rows.length > 0) {
          await tx.insert(contractTerms).values(rows);
        }
      }
    });

    const updated = await db.select()
      .from(contractTerms)
      .where(eq(contractTerms.contractId, contractId))
      .orderBy(contractTerms.sortOrder, contractTerms.id);

    return ok(updated);
  } catch (err) {
    console.error('PUT /api/contracts/[id]/terms error:', err);
    return serverError('Failed to update contract terms');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { id: idStr } = await context.params;
    const contractId = parseInt(idStr, 10);
    if (isNaN(contractId)) return badRequest('Invalid contract ID');

    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const { searchParams } = new URL(req.url);
    const termId = searchParams.get('termId');

    if (termId) {
      await db.delete(contractTerms)
        .where(and(eq(contractTerms.id, parseInt(termId, 10)), eq(contractTerms.contractId, contractId)));
    } else {
      await db.delete(contractTerms).where(eq(contractTerms.contractId, contractId));
    }

    return ok({ success: true });
  } catch (err) {
    console.error('DELETE /api/contracts/[id]/terms error:', err);
    return serverError('Failed to delete contract term(s)');
  }
}
