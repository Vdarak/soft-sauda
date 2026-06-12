/**
 * GET /api/pdf/bill/:id — Bill / Invoice HTML print page
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { bills, billLines, parties } from '@/db/schema';
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

  const rows = await db.select().from(bills)
    .where(and(eq(bills.id, id), eq(bills.companyId, ctx.companyId))).limit(1);
  if (!rows.length) return new NextResponse('Not found', { status: 404 });
  const b = rows[0];

  const lines = await db.select().from(billLines).where(eq(billLines.billId, id));
  const party = b.partyId
    ? await db.select({ name: parties.name, place: parties.place, phone: parties.phone })
        .from(parties).where(eq(parties.id, b.partyId)).limit(1)
    : [];

  const partyName = party[0]?.name || 'Unknown';
  const partyPlace = party[0]?.place || '';
  const partyPhone = party[0]?.phone || '';

  const amountPaid = parseFloat(b.totalAmount as string) - parseFloat(b.balanceAmount as string ?? '0');
  const balance = parseFloat(b.balanceAmount as string ?? '0');

  const linesHtml = lines.length ? `
    <div class="section">
      <div class="section-title">Bill Line Items</div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th class="right">Amount (₹)</th></tr></thead>
        <tbody>
          ${lines.map((l, i) => `<tr>
            <td>${i + 1}</td>
            <td>${l.description || '—'}</td>
            <td class="right mono">${fmt(l.amount)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="2"><strong>Total Bill Amount</strong></td>
          <td class="right mono large"><strong>${fmt(b.totalAmount)}</strong></td>
        </tr></tfoot>
      </table>
    </div>` : '';

  const body = `
    <div class="grid-2 section">
      <div>
        <div class="section-title">Billed To</div>
        <div class="field"><div class="field-value">${partyName}</div></div>
        ${partyPlace ? `<div class="field"><div class="field-label">Station / City</div><div class="field-value">${partyPlace}</div></div>` : ''}
        ${partyPhone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${partyPhone}</div></div>` : ''}
      </div>
      <div>
        <div class="section-title">Bill Details</div>
        <div class="field"><div class="field-label">Bill Number</div><div class="field-value">${b.billNo}</div></div>
        <div class="field"><div class="field-label">Bill Date</div><div class="field-value">${fmtDate(b.billDate)}</div></div>
        <div class="field"><div class="field-label">Basis</div><div class="field-value"><span class="badge">${b.basis || 'DIRECT'}</span></div></div>
        ${b.creditDays ? `<div class="field"><div class="field-label">Credit Days</div><div class="field-value">${b.creditDays} days</div></div>` : ''}
      </div>
    </div>

    ${linesHtml}

    <div class="grid-3 section">
      <div class="field"><div class="field-label">Total Bill Amount</div><div class="field-value mono large">${fmt(b.totalAmount)}</div></div>
      <div class="field"><div class="field-label">Amount Received</div><div class="field-value mono">${fmt(amountPaid)}</div></div>
      <div class="field"><div class="field-label">Balance Outstanding</div><div class="field-value mono" style="color:${balance > 0 ? '#c00' : '#1a6b1a'}">${fmt(balance)}</div></div>
    </div>
  `;

  const html = printPage(
    `Invoice / Bill — ${b.billNo}`,
    `Bill No: ${b.billNo}`,
    fmtDate(b.billDate),
    body
  );

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
