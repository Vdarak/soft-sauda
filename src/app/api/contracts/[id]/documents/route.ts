/**
 * /api/contracts/[id]/documents
 * GET, POST, PUT, DELETE for contract documents (saudadocu)
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { contracts, contractDocuments } from '@/db/schema';
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

    // Verify contract exists and belongs to company/FY
    const [c] = await db.select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (!c) return notFound('Contract not found');

    const docs = await db.select()
      .from(contractDocuments)
      .where(eq(contractDocuments.contractId, contractId))
      .orderBy(contractDocuments.sortOrder, contractDocuments.id);

    return ok(docs);
  } catch (err) {
    console.error('GET /api/contracts/[id]/documents error:', err);
    return serverError('Failed to fetch contract documents');
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
    if (!body || !body.narration?.trim()) return badRequest('Narration is required');

    const [inserted] = await db.insert(contractDocuments).values({
      contractId,
      narration: body.narration.trim(),
      sortOrder: body.sortOrder ?? 0,
    }).returning();

    return ok(inserted);
  } catch (err) {
    console.error('POST /api/contracts/[id]/documents error:', err);
    return serverError('Failed to create contract document');
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

    const body = await parseBody<{ documents: Array<{ id?: number; narration: string; sortOrder?: number }> }>(req);
    if (!body || !Array.isArray(body.documents)) return badRequest('Array of documents required');

    await db.transaction(async (tx) => {
      // Replace all documents for this contract
      await tx.delete(contractDocuments).where(eq(contractDocuments.contractId, contractId));
      if (body.documents.length > 0) {
        const rows = body.documents
          .filter(d => d.narration && d.narration.trim().length > 0)
          .map((d, index) => ({
            contractId,
            narration: d.narration.trim(),
            sortOrder: d.sortOrder ?? index,
          }));
        if (rows.length > 0) {
          await tx.insert(contractDocuments).values(rows);
        }
      }
    });

    const updated = await db.select()
      .from(contractDocuments)
      .where(eq(contractDocuments.contractId, contractId))
      .orderBy(contractDocuments.sortOrder, contractDocuments.id);

    return ok(updated);
  } catch (err) {
    console.error('PUT /api/contracts/[id]/documents error:', err);
    return serverError('Failed to update contract documents');
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
    const docId = searchParams.get('docId');

    if (docId) {
      await db.delete(contractDocuments)
        .where(and(eq(contractDocuments.id, parseInt(docId, 10)), eq(contractDocuments.contractId, contractId)));
    } else {
      await db.delete(contractDocuments).where(eq(contractDocuments.contractId, contractId));
    }

    return ok({ success: true });
  } catch (err) {
    console.error('DELETE /api/contracts/[id]/documents error:', err);
    return serverError('Failed to delete contract document(s)');
  }
}
