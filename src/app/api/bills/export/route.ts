/**
 * GET /api/bills/export — Full-data export for bills
 */

import { db } from '@/db';
import { bills, parties } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      basis: bills.basis,
      totalAmount: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      creditDays: bills.creditDays,
      partyName: parties.name,
    })
      .from(bills)
      .leftJoin(parties, eq(parties.id, bills.partyId))
      .orderBy(desc(bills.id));

    const exportData = data.map(b => ({
      'Bill ID': b.id,
      'Bill Number': b.billNo,
      'Bill Date': b.billDate ? new Date(b.billDate).toLocaleDateString('en-IN') : '',
      'Billed Party': b.partyName || 'Unknown',
      'Basis': b.basis || 'DIRECT',
      'Total Amount': b.totalAmount || '0.00',
      'Balance Amount': b.balanceAmount || '0.00',
      'Credit Days': b.creditDays || '',
    }));

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/bills/export error:', err);
    return serverError('Failed to export bills');
  }
}
