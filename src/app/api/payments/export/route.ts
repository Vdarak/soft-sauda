/**
 * GET /api/payments/export — Full-data export for payments
 */

import { db } from '@/db';
import { payments, parties } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await db.select({
      id: payments.id,
      paymentDate: payments.paymentDate,
      instrumentType: payments.instrumentType,
      instrumentNo: payments.instrumentNo,
      depositedBank: payments.depositedBank,
      amount: payments.amount,
      partyName: parties.name,
    })
      .from(payments)
      .leftJoin(parties, eq(parties.id, payments.partyId))
      .orderBy(desc(payments.id));

    const exportData = data.map(p => ({
      'Payment ID': p.id,
      'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '',
      'Party Name': p.partyName || 'Unknown',
      'Payment Method': p.instrumentType || '',
      'Reference No.': p.instrumentNo || '',
      'Deposited Bank': p.depositedBank || '',
      'Amount': p.amount || '0.00',
    }));

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/payments/export error:', err);
    return serverError('Failed to export payments');
  }
}
