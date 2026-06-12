import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, parties } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;
    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'date'; // date, city, proprietor, type

    let query = db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      basis: bills.basis,
      totalAmount: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      partyName: parties.name,
      place: parties.place,
      stateName: parties.stateName,
      designation: parties.designation,
    })
    .from(bills)
    .innerJoin(parties, eq(parties.id, bills.partyId))
    .where(and(eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)));

    // Apply sorting in SQL
    if (sortBy === 'city') {
      query = query.orderBy(parties.place, bills.billDate) as typeof query;
    } else if (sortBy === 'proprietor') {
      query = query.orderBy(parties.name, bills.billDate) as typeof query;
    } else if (sortBy === 'type') {
      query = query.orderBy(bills.basis, bills.billDate) as typeof query;
    } else {
      query = query.orderBy(desc(bills.billDate)) as typeof query;
    }

    const rows = await query;
    return ok(rows);
  } catch (err) {
    console.error('GET /api/reports/bill-register error:', err);
    return serverError('Failed to fetch bill register report');
  }
}
