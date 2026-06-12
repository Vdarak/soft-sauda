/**
 * GET  /api/parties        — List all parties (cached, paginated)
 * POST /api/parties        — Create a new party
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { parties, partyTaxIds, partyRoles, partyContacts, partyBankDetails, partyDeliveryAddresses } from '@/db/schema';
import { desc, eq, ilike, sql } from 'drizzle-orm';
import { ok, created, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/cache';
import { triggerBackgroundWarmup } from '@/lib/warmup';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const q = searchParams.get('q') || '';
    const offset = (page - 1) * limit;

    const cacheKey = `parties:list:${page}:${limit}:${q}`;
    const cached = cacheGet<unknown[]>(cacheKey);
    if (cached) return ok(cached);

    let query = db.select().from(parties);

    if (q) {
      query = query.where(ilike(parties.name, `%${q}%`)) as typeof query;
      const data = await query.orderBy(desc(parties.id)).limit(100);
      return ok(data);
    }

    const data = await query
      .orderBy(desc(parties.id))
      .limit(limit)
      .offset(offset);

    cacheSet(cacheKey, data, 60);
    return ok(data);
  } catch (err) {
    console.error('GET /api/parties error:', err);
    return serverError('Failed to fetch parties');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    const companyId = ctx?.companyId;
    const fiscalYearId = ctx?.fiscalYearId;

    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.name) {
      return badRequest('Party name is required');
    }

    let result: any;
    await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(parties).values({
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
      }).returning();

      const partyId = inserted.id;

      // Insert tax IDs
      const taxEntries = [];
      if (body.gstin) taxEntries.push({ partyId, taxType: 'GSTIN' as const, taxValue: body.gstin });
      if (body.vatTin) taxEntries.push({ partyId, taxType: 'VAT_TIN' as const, taxValue: body.vatTin });
      if (body.cstTin) taxEntries.push({ partyId, taxType: 'CST_TIN' as const, taxValue: body.cstTin });
      if (body.cstNo) taxEntries.push({ partyId, taxType: 'CST_NO' as const, taxValue: body.cstNo });
      if (taxEntries.length > 0) {
        await tx.insert(partyTaxIds).values(taxEntries);
      }

      // Insert roles
      if (body.roles && Array.isArray(body.roles) && body.roles.length > 0) {
        const roleInserts = body.roles.map((r: string) => ({ partyId, role: r as any }));
        await tx.insert(partyRoles).values(roleInserts);
      }

      // Insert contacts
      if (body.contacts && Array.isArray(body.contacts) && body.contacts.length > 0) {
        const contactInserts = body.contacts.map((c: any) => ({
          partyId,
          contactName: c.contactName,
          contactNumber: c.contactNumber,
          emailId: c.emailId || null,
          designation: c.designation || null,
        }));
        await tx.insert(partyContacts).values(contactInserts);
      }

      // Insert bank details
      if (body.bankDetails && Array.isArray(body.bankDetails) && body.bankDetails.length > 0) {
        const bankInserts = body.bankDetails.map((b: any) => ({
          partyId,
          bankName: b.bankName || null,
          accountNo: b.accountNo || null,
          ifscCode: b.ifscCode || null,
          branch: b.branch || null,
        }));
        await tx.insert(partyBankDetails).values(bankInserts);
      }

      // Insert delivery addresses
      if (body.deliveryAddresses && Array.isArray(body.deliveryAddresses) && body.deliveryAddresses.length > 0) {
        const addrInserts = body.deliveryAddresses.map((a: any) => ({
          partyId,
          addressLine: a.addressLine,
          city: a.city || null,
          state: a.state || null,
          pincode: a.pincode || null,
        }));
        await tx.insert(partyDeliveryAddresses).values(addrInserts);
      }

      result = inserted;
    });

    cacheInvalidate('parties');
    triggerBackgroundWarmup(companyId, fiscalYearId);
    return created(result);
  } catch (err: any) {
    console.error('POST /api/parties error:', err);
    if (err.message?.includes('unique')) {
      return badRequest('A party with this name already exists');
    }
    return serverError('Failed to create party');
  }
}
