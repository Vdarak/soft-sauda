/**
 * GET    /api/parties/:id  — Get single party with tax IDs
 * PUT    /api/parties/:id  — Update party
 * DELETE /api/parties/:id  — Soft-delete party
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties, partyTaxIds, partyBankDetails, partyContacts, partyDeliveryAddresses, partyRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, badRequest, notFound, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext } from '@/lib/middleware';

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
    const roles = await db.select().from(partyRoles).where(eq(partyRoles.partyId, id));

    const result = {
      ...party[0],
      taxIds,
      bankDetails,
      contacts,
      deliveryAddresses,
      roles,
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

    const ctx = await getRequestContext(req);
    const companyId = ctx?.companyId;
    const fiscalYearId = ctx?.fiscalYearId;

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
        phoneRes: body.phoneRes || null,
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

      // Wipe and rewrite roles
      await tx.delete(partyRoles).where(eq(partyRoles.partyId, id));
      if (body.roles && Array.isArray(body.roles) && body.roles.length > 0) {
        const roleInserts = body.roles.map((r: string) => ({ partyId: id, role: r as any }));
        await tx.insert(partyRoles).values(roleInserts);
      }

      // Wipe and rewrite contacts
      await tx.delete(partyContacts).where(eq(partyContacts.partyId, id));
      if (body.contacts && Array.isArray(body.contacts) && body.contacts.length > 0) {
        const contactInserts = body.contacts.map((c: any) => ({
          partyId: id,
          contactName: c.contactName,
          contactNumber: c.contactNumber,
          emailId: c.emailId || null,
          designation: c.designation || null,
        }));
        await tx.insert(partyContacts).values(contactInserts);
      }

      // Wipe and rewrite bank details
      await tx.delete(partyBankDetails).where(eq(partyBankDetails.partyId, id));
      if (body.bankDetails && Array.isArray(body.bankDetails) && body.bankDetails.length > 0) {
        const bankInserts = body.bankDetails.map((b: any) => ({
          partyId: id,
          bankName: b.bankName || null,
          accountNo: b.accountNo || null,
          ifscCode: b.ifscCode || null,
          branch: b.branch || null,
        }));
        await tx.insert(partyBankDetails).values(bankInserts);
      }

      // Wipe and rewrite delivery addresses
      await tx.delete(partyDeliveryAddresses).where(eq(partyDeliveryAddresses.partyId, id));
      if (body.deliveryAddresses && Array.isArray(body.deliveryAddresses) && body.deliveryAddresses.length > 0) {
        const addrInserts = body.deliveryAddresses.map((a: any) => ({
          partyId: id,
          addressLine: a.addressLine,
          city: a.city || null,
          state: a.state || null,
          pincode: a.pincode || null,
        }));
        await tx.insert(partyDeliveryAddresses).values(addrInserts);
      }
    });

    cacheInvalidate('parties');
    triggerBackgroundWarmup(companyId, fiscalYearId);

    const updated = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
    return ok(updated[0]);
  } catch (err) {
    console.error('PUT /api/parties/[id] error:', err);
    return serverError('Failed to update party');
  }
}

export async function DELETE(req: NextRequest, context: Params) {
  try {
    const ctx = await getRequestContext(req);
    const companyId = ctx?.companyId;
    const fiscalYearId = ctx?.fiscalYearId;

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
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return ok({ success: true, id });
  } catch (err) {
    console.error('DELETE /api/parties/[id] error:', err);
    return serverError('Failed to delete party');
  }
}
