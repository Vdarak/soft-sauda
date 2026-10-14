/**
 * GET /api/contracts/:id — Get single contract with all relations (company+FY scoped)
 * PUT /api/contracts/:id — Update contract (wipe & rewrite parties/lines)
 * DELETE /api/contracts/:id — Delete contract
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { contracts, contractParties, contractLines, contractDocuments, contractSpecifications, contractTerms, parties, commodities, commodityPackaging, partyTaxIds, users } from '@/db/schema';
import { eq, and, aliasedTable } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody, unauthorized } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext, stripAuditFields, writeAuditLog } from '@/lib/middleware';

type Params = { params: Promise<{ id: string }> };

/** Resolve or create a party by name */
async function resolveParty(name: string | null | undefined, tx: any): Promise<number | null> {
  if (!name?.trim()) return null;
  const clean = name.trim();
  const existing = await tx.select({ id: parties.id }).from(parties).where(eq(parties.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(parties).values({ name: clean }).returning({ id: parties.id });
  return inserted.id;
}

async function resolveCommodity(name: string, tx: any): Promise<number> {
  const clean = name.trim();
  const existing = await tx.select({ id: commodities.id }).from(commodities).where(eq(commodities.name, clean)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(commodities).values({ name: clean }).returning({ id: commodities.id });
  return inserted.id;
}

async function resolvePackaging(commodityId: number, packName: string | null | undefined, tx: any): Promise<number | null> {
  if (!packName?.trim()) return null;
  const clean = packName.trim();
  const existing = await tx.select({ id: commodityPackaging.id }).from(commodityPackaging)
    .where(and(eq(commodityPackaging.commodityId, commodityId), eq(commodityPackaging.packingType, clean))).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [inserted] = await tx.insert(commodityPackaging).values({ commodityId, packingType: clean, packingWeight: '0' }).returning({ id: commodityPackaging.id });
  return inserted.id;
}

export async function GET(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid contract ID');

    const cacheKey = `contracts:detail:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(stripAuditFields(cached, role));

    const creator = aliasedTable(users, 'creator');
    const updater = aliasedTable(users, 'updater');

    const contractRows = await db.select({
      contract: contracts,
      createdByUsername: creator.username,
      createdByDisplayName: creator.displayName,
      updatedByUsername: updater.username,
      updatedByDisplayName: updater.displayName,
    })
      .from(contracts)
      .leftJoin(creator, eq(contracts.createdBy, creator.id))
      .leftJoin(updater, eq(contracts.updatedBy, updater.id))
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);

    if (contractRows.length === 0) return notFound('Contract not found');

    const contractData = contractRows[0].contract;

    const partiesRows = await db.select({ role: contractParties.role, name: parties.name, partyId: contractParties.partyId })
      .from(contractParties)
      .leftJoin(parties, eq(contractParties.partyId, parties.id))
      .where(eq(contractParties.contractId, id));

    const lines = await db.select().from(contractLines).where(eq(contractLines.contractId, id));

    const enrichedLines = [];
    for (const line of lines) {
      const comm = await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, line.commodityId)).limit(1);
      enrichedLines.push({ ...line, commodityName: comm[0]?.name || 'Unknown' });
    }

    const buyerParty = partiesRows.find(p => p.role === 'BUYER');
    const sellerParty = partiesRows.find(p => p.role === 'SELLER');
    let buyerGstin = null, sellerGstin = null;
    if (buyerParty?.partyId) {
      const taxRows = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, buyerParty.partyId));
      buyerGstin = taxRows.find((t: any) => t.taxType === 'GSTIN')?.taxValue || null;
    }
    if (sellerParty?.partyId) {
      const taxRows = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, sellerParty.partyId));
      sellerGstin = taxRows.find((t: any) => t.taxType === 'GSTIN')?.taxValue || null;
    }

    const documents = await db.select().from(contractDocuments)
      .where(eq(contractDocuments.contractId, id))
      .orderBy(contractDocuments.sortOrder, contractDocuments.id);

    const specifications = await db.select().from(contractSpecifications)
      .where(eq(contractSpecifications.contractId, id))
      .orderBy(contractSpecifications.id);

    const terms = await db.select().from(contractTerms)
      .where(eq(contractTerms.contractId, id))
      .orderBy(contractTerms.sortOrder, contractTerms.id);

    const result = {
      ...contractData,
      parties: partiesRows,
      lines: enrichedLines,
      documents,
      specifications,
      terms,
      sellerName: partiesRows.find(p => p.role === 'SELLER')?.name || null,
      buyerName: partiesRows.find(p => p.role === 'BUYER')?.name || null,
      sellerBroker: partiesRows.find(p => p.role === 'SELLER_BROKER')?.name || null,
      buyerBroker: partiesRows.find(p => p.role === 'BUYER_BROKER')?.name || null,
      buyerGstin,
      sellerGstin,
      createdByUsername: contractRows[0].createdByUsername,
      createdByDisplayName: contractRows[0].createdByDisplayName,
      updatedByUsername: contractRows[0].updatedByUsername,
      updatedByDisplayName: contractRows[0].updatedByDisplayName,
    };

    cacheSet(cacheKey, result, 120);
    return ok(stripAuditFields(result, role));
  } catch (err) {
    console.error('GET /api/contracts/[id] error:', err);
    return serverError('Failed to fetch contract');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId, role } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid contract ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body) return badRequest('Request body is required');

    // Verify ownership/scoping before update
    const existingContract = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingContract.length === 0) return notFound('Contract not found or does not belong to active company/fiscal year');

    await db.transaction(async (tx) => {
      await tx.update(contracts).set({
        saudaNo: parseInt(body.saudaNo, 10),
        saudaBook: body.saudaBook || 'Main Book',
        saudaPrefix: body.saudaPrefix || null,
        saudaDate: body.saudaDate ? new Date(body.saudaDate) : new Date(),
        deliveryTerm: body.deliveryTerm || null,
        paymentTermType: body.paymentTermType === 'CREDIT' ? 'CREDIT' : body.paymentTermType === 'PAYMENT' ? 'PAYMENT' : 'DISCOUNT',
        paymentPercent: body.paymentPercent || null,
        paymentDays: body.paymentDays ? parseInt(body.paymentDays, 10) : null,
        deliveryDeadlineDate: body.deliveryDeadlineDate ? new Date(body.deliveryDeadlineDate) : null,
        approxWeight: body.approxWeight || null,
        quantityTolerance: body.quantityTolerance || null,
        originStation: body.originStation || null,
        destinationStation: body.destinationStation || null,
        taxFormRequired: body.taxFormRequired || null,
        poNumber: body.poNumber || null,
        poDate: body.poDate ? new Date(body.poDate) : null,
        termsAndConditions: body.termsAndConditions || null,
        customRemarks: body.remarks || null,
        updatedAt: new Date(),
        updatedBy: userId,
      }).where(eq(contracts.id, id));

      await tx.delete(contractParties).where(eq(contractParties.contractId, id));
      const sellerId = await resolveParty(body.sellerName, tx);
      const buyerId = await resolveParty(body.buyerName, tx);
      const sellerBrokerId = await resolveParty(body.sellerBroker, tx);
      const buyerBrokerId = await resolveParty(body.buyerBroker, tx);

      const partyInserts: any[] = [];
      if (sellerId) partyInserts.push({ contractId: id, partyId: sellerId, role: 'SELLER' as const });
      if (buyerId) partyInserts.push({ contractId: id, partyId: buyerId, role: 'BUYER' as const });
      if (sellerBrokerId) partyInserts.push({ contractId: id, partyId: sellerBrokerId, role: 'SELLER_BROKER' as const });
      if (buyerBrokerId && buyerBrokerId !== sellerBrokerId) partyInserts.push({ contractId: id, partyId: buyerBrokerId, role: 'BUYER_BROKER' as const });
      if (partyInserts.length > 0) await tx.insert(contractParties).values(partyInserts);

      const lines = body.lines && Array.isArray(body.lines) ? body.lines : [{
        id: body.contractLineId || null,
        commodity: body.commodity,
        packaging: body.packaging,
        brand: body.brand,
        numberOfLorries: body.numberOfLorries,
        weight: body.weight,
        rate: body.rate,
        quantityBags: body.quantityBags,
      }];

      const existingLines = await tx.select().from(contractLines).where(eq(contractLines.contractId, id));
      const existingIds = existingLines.map(l => l.id);
      const incomingIds = lines.map(l => l.id).filter(Boolean);

      const toDelete = existingIds.filter(exId => !incomingIds.includes(exId));
      for (const delId of toDelete) {
        try {
          await tx.delete(contractLines).where(eq(contractLines.id, delId));
        } catch (err) {
          console.warn(`Cannot delete contract line ${delId} due to active reference constraints:`, err);
        }
      }

      for (const line of lines) {
        const commName = line.commodity || line.commodityName;
        if (!commName) continue;
        const commodityId = await resolveCommodity(commName, tx);
        const packagingId = await resolvePackaging(commodityId, line.packaging, tx);
        const weight = parseFloat(line.weight || line.weightQuintals || '0');
        const rate = parseFloat(line.rate || '0');
        const packWt = line.packWeight != null ? parseFloat(line.packWeight) : (line.pack != null ? parseFloat(line.pack) : null);
        const qtyBags = line.quantityBags != null ? parseFloat(line.quantityBags) : (packWt && packWt > 0 && weight > 0 ? (weight * 100) / packWt : null);
        const slBrok = line.sellerBrokerageRate != null ? parseFloat(line.sellerBrokerageRate) : (line.slBrokRate != null ? parseFloat(line.slBrokRate) : null);

        const lineValues: any = {
          contractId: id,
          commodityId,
          packagingId,
          brand: line.brand || line.quantityDetails || null,
          numberOfLorries: line.numberOfLorries ? parseInt(line.numberOfLorries, 10) : (line.qtyNos ? parseInt(line.qtyNos, 10) : 1),
          packWeight: packWt != null ? packWt.toString() : null,
          quantityBags: qtyBags != null ? qtyBags.toString() : null,
          weightQuintals: weight.toString(),
          rate: rate.toString(),
          amount: (weight * rate).toString(),
          sellerBrokerageRate: slBrok != null ? slBrok.toString() : null,
          brokerageType: line.brokerageType || line.type || 'PQtl',
        };

        if (line.id && existingIds.includes(line.id)) {
          await tx.update(contractLines).set(lineValues).where(eq(contractLines.id, line.id));
        } else {
          await tx.insert(contractLines).values(lineValues);
        }
      }

      if (Array.isArray(body.documents)) {
        await tx.delete(contractDocuments).where(eq(contractDocuments.contractId, id));
        const docRows = body.documents
          .filter((d: any) => d.narration && d.narration.trim().length > 0)
          .map((d: any, idx: number) => ({ contractId: id, narration: d.narration.trim(), sortOrder: d.sortOrder ?? idx }));
        if (docRows.length > 0) await tx.insert(contractDocuments).values(docRows);
      }

      if (Array.isArray(body.specifications)) {
        await tx.delete(contractSpecifications).where(eq(contractSpecifications.contractId, id));
        const specRows = body.specifications
          .filter((s: any) => s.specName && s.specName.trim().length > 0)
          .map((s: any) => ({
            contractId: id,
            specName: s.specName.trim(),
            specValue: s.specValue != null && s.specValue !== '' ? s.specValue.toString() : null,
            minMax: s.minMax ? s.minMax.trim() : null,
            remarks: s.remarks ? s.remarks.trim() : null,
          }));
        if (specRows.length > 0) await tx.insert(contractSpecifications).values(specRows);
      }

      if (Array.isArray(body.terms)) {
        await tx.delete(contractTerms).where(eq(contractTerms.contractId, id));
        const termRows = body.terms
          .filter((t: any) => t.narration && t.narration.trim().length > 0)
          .map((t: any, idx: number) => ({ contractId: id, narration: t.narration.trim(), sortOrder: t.sortOrder ?? idx }));
        if (termRows.length > 0) await tx.insert(contractTerms).values(termRows);
      }
    });

    writeAuditLog({
      userId,
      companyId,
      action: 'UPDATE',
      entityType: 'contract',
      entityId: id,
      changes: { saudaNo: body.saudaNo, sellerName: body.sellerName, buyerName: body.buyerName },
    });

    cacheInvalidate('contracts');
    cacheInvalidate('parties');
    cacheInvalidate('commodities');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    const updated = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return ok(stripAuditFields(updated[0], role));
  } catch (err) {
    console.error('PUT /api/contracts/[id] error:', err);
    return serverError('Failed to update contract');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId, userId } = ctx;
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid ID');

    // Verify ownership/scoping
    const existingContract = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .limit(1);
    if (existingContract.length === 0) return notFound('Contract not found or does not belong to active company/fiscal year');

    await db.delete(contracts).where(eq(contracts.id, id));

    writeAuditLog({
      userId,
      companyId,
      action: 'DELETE',
      entityType: 'contract',
      entityId: id,
    });

    cacheInvalidate('contracts');
    cacheInvalidate('parties');
    cacheInvalidate('commodities');
    cacheInvalidate('dashboard');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return ok({ success: true, id });
  } catch (err: any) {
    console.error('DELETE /api/contracts/[id] error:', err);
    if (err.code === '23503') {
      return badRequest('Cannot delete contract: it has active dispatches/deliveries associated with it. Please delete the deliveries first.');
    }
    return serverError('Failed to delete');
  }
}
