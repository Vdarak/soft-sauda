/**
 * GET    /api/parties/:id  — Get single party with tax IDs
 * PUT    /api/parties/:id  — Update party
 * DELETE /api/parties/:id  — Soft-delete party
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties, partyTaxIds, partyBankDetails, partyContacts, partyDeliveryAddresses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid party ID');

    const cacheKey = `parties:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return ok(cached);

    const party = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
    if (party.length === 0) return notFound('Party not found');

    const taxIds = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, id));
    const bankDetails = await db.select().from(partyBankDetails).where(eq(partyBankDetails.partyId, id));
    const contacts = await db.select().from(partyContacts).where(eq(partyContacts.partyId, id));
    const deliveryAddresses = await db.select().from(partyDeliveryAddresses).where(eq(partyDeliveryAddresses.partyId, id));

    const result = {
      ...party[0],
      taxIds,
      bankDetails,
      contacts,
      deliveryAddresses,
    };

    cacheSet(cacheKey, result, 300);
    return ok(result);
  } catch (err) {
    console.error('GET /api/parties/[id] error:', err);
    return serverError('Failed to fetch party');
  }
}

export async function PUT(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid party ID');

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.name) return badRequest('Party name is required');

    await db.transaction(async (tx) => {
      await tx.update(parties).set({
        name: body.name,
        address: body.address || null,
        landmark: body.landmark || null,
        place: body.place || null,
        stateName: body.stateName || null,
        pinCode: body.pinCode || null,
        creditLimit: body.creditLimit || null,
        phone: body.phone || null,
        smsMobile: body.smsMobile || null,
        mill: body.mill || null,
        fax: body.fax || null,
        emailIds: body.emailIds || null,
        designation: body.designation || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        updatedAt: new Date(),
      }).where(eq(parties.id, id));

      // Wipe and rewrite tax IDs
      await tx.delete(partyTaxIds).where(eq(partyTaxIds.partyId, id));
      const taxEntries = [];
      if (body.gstin) taxEntries.push({ partyId: id, taxType: 'GSTIN' as const, taxValue: body.gstin });
      if (body.vatTin) taxEntries.push({ partyId: id, taxType: 'VAT_TIN' as const, taxValue: body.vatTin });
      if (body.cstTin) taxEntries.push({ partyId: id, taxType: 'CST_TIN' as const, taxValue: body.cstTin });
      if (body.cstNo) taxEntries.push({ partyId: id, taxType: 'CST_NO' as const, taxValue: body.cstNo });
      if (taxEntries.length > 0) {
        await tx.insert(partyTaxIds).values(taxEntries);
      }
    });

    cacheInvalidate('parties');

    const updated = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/parties/[id] error:', err);
    return serverError('Failed to update party');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const { id: idStr } = await context.params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return badRequest('Invalid party ID');

    // Soft delete
    await db.update(parties).set({
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(parties.id, id));

    cacheInvalidate('parties');
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/parties/[id] error:', err);
    return serverError('Failed to delete party');
  }
}
