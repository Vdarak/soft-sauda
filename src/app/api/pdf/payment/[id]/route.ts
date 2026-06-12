/**
 * GET /api/pdf/payment/:id — Payment Receipt HTML print page
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, paymentAllocations, bills, parties } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getRequestContext } from '@/lib/middleware';
import { printPage, fmt, fmtDate } from '@/lib/print-layout';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctx = await getRequestContext(req);
  if (!ctx) return new NextResponse('Unauthorized', { status: 401 });

  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return new NextResponse('Invalid ID', { status: 400 });

  const rows = await db.select().from(payments)
    .where(and(eq(payments.id, id), eq(payments.companyId, ctx.companyId))).limit(1);
  if (!rows.length) return new NextResponse('Not found', { status: 404 });
  const p = rows[0];

  const party = p.partyId
    ? await db.select({ name: parties.name, place: parties.place, phone: parties.phone })
        .from(parties).where(eq(parties.id, p.partyId)).limit(1)
    : [];

  const allocs = await db.select().from(paymentAllocations).where(eq(paymentAllocations.paymentId, id));

  // Enrich allocations with bill numbers
  const enrichedAllocs = await Promise.all(allocs.map(async (a) => {
    if (!a.billId) return { ...a, billNo: '—', billDate: null };
    const b = await db.select({ billNo: bills.billNo, billDate: bills.billDate })
      .from(bills).where(eq(bills.id, a.billId)).limit(1);
    return { ...a, billNo: b[0]?.billNo || '—', billDate: b[0]?.billDate || null };
  }));

  const partyName = party[0]?.name || 'Unknown';
  const partyPlace = party[0]?.place || '';
  const partyPhone = party[0]?.phone || '';

  const instrLabels: Record<string, string> = {
    CASH: 'Cash', CHEQUE: 'Cheque', RTGS: 'RTGS / NEFT', UPI: 'UPI',
  };

  const allocsHtml = enrichedAllocs.length ? `
    <div class="section">
      <div class="section-title">Bill Allocations</div>
      <table>
        <thead><tr>
          <th>Bill No.</th><th>Bill Date</th><th class="right">Allocated Amount (₹)</th>
        </tr></thead>
        <tbody>
          ${enrichedAllocs.map(a => `<tr>
            <td>${a.billNo}</td>
            <td>${fmtDate(a.billDate)}</td>
            <td class="right mono">${fmt(a.allocatedAmount)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="2"><strong>Total Allocated</strong></td>
          <td class="right mono large"><strong>${fmt(enrichedAllocs.reduce((s, a) => s + parseFloat(a.allocatedAmount ?? '0'), 0))}</strong></td>
        </tr></tfoot>
      </table>
    </div>` : '';

  const body = `
    <div class="grid-2 section">
      <div>
        <div class="section-title">Received From</div>
        <div class="field"><div class="field-value">${partyName}</div></div>
        ${partyPlace ? `<div class="field"><div class="field-label">Station / City</div><div class="field-value">${partyPlace}</div></div>` : ''}
        ${partyPhone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${partyPhone}</div></div>` : ''}
      </div>
      <div>
        <div class="section-title">Payment Details</div>
        <div class="field"><div class="field-label">Payment Date</div><div class="field-value">${fmtDate(p.paymentDate)}</div></div>
        <div class="field"><div class="field-label">Payment Method</div><div class="field-value">${instrLabels[p.instrumentType ?? ''] || p.instrumentType || '—'}</div></div>
        ${p.instrumentNo ? `<div class="field"><div class="field-label">Reference No.</div><div class="field-value mono">${p.instrumentNo}</div></div>` : ''}
        ${p.depositedBank ? `<div class="field"><div class="field-label">Deposited Bank</div><div class="field-value">${p.depositedBank}</div></div>` : ''}
      </div>
    </div>

    <div class="section" style="background:#f0f8f0; border:1px solid #b6d9b6; padding:12px 16px; border-radius:5px; text-align:center;">
      <div class="field-label">Amount Received</div>
      <div style="font-size:22pt; font-weight:800; color:#1a6b1a; font-family:'Courier New',monospace;">${fmt(p.amount)}</div>
    </div>

    ${allocsHtml}
  `;

  const html = printPage(
    `Payment Receipt — Ref #${p.id}`,
    `Payment Ref #${p.id}`,
    fmtDate(p.paymentDate),
    body
  );

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
