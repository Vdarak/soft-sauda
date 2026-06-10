/**
 * GET /api/ledger/export — Full-data export for ledger entries
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { ledger, parties } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');

    let query = db.select({
      id: ledger.id,
      transactionDate: ledger.transactionDate,
      sourceType: ledger.sourceType,
      sourceId: ledger.sourceId,
      debit: ledger.debit,
      credit: ledger.credit,
      narration: ledger.narration,
      accountName: parties.name,
    })
      .from(ledger)
      .leftJoin(parties, eq(parties.id, ledger.accountId));

    if (accountId) {
      query = query.where(eq(ledger.accountId, parseInt(accountId, 10))) as typeof query;
    }

    const data = await query.orderBy(desc(ledger.id));

    const exportData = data.map(l => ({
      'Entry ID': l.id,
      'Transaction Date': l.transactionDate ? new Date(l.transactionDate).toLocaleDateString('en-IN') : '',
      'Account Name': l.accountName || 'Unknown',
      'Source Type': l.sourceType,
      'Source ID': l.sourceId || '',
      'Debit Amount': l.debit || '0.00',
      'Credit Amount': l.credit || '0.00',
      'Narration': l.narration || '',
    }));

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/ledger/export error:', err);
    return serverError('Failed to export ledger entries');
  }
}
