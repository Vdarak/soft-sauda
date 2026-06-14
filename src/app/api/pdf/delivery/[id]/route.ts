/**
 * GET /api/pdf/delivery/:id — Delivery Order HTML print page
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryLines, deliveryCharges, contractLines, contracts, commodities, parties } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getRequestContext } from '@/lib/middleware';
import { printPage, fmt, fmtDate, fmtNum } from '@/lib/print-layout';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctx = await getRequestContext(req);
  if (!ctx) return new NextResponse('Unauthorized', { status: 401 });

  const { id: idStr } = await context.params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return new NextResponse('Invalid ID', { status: 400 });

  const rows = await db.select().from(deliveries)
    .where(and(eq(deliveries.id, id), eq(deliveries.companyId, ctx.companyId))).limit(1);
  if (!rows.length) return new NextResponse('Not found', { status: 404 });
  const d = rows[0];

  const lines = await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, id));
  const charges = await db.select().from(deliveryCharges).where(eq(deliveryCharges.deliveryId, id));

  // Enrich lines with commodity names and rates
  const enriched = await Promise.all(lines.map(async (l) => {
    const cl = await db.select({ commodityId: contractLines.commodityId, rate: contractLines.rate })
      .from(contractLines).where(eq(contractLines.id, l.contractLineId)).limit(1);
    if (!cl.length) return { ...l, commodityName: 'Unknown', rate: '0' };
    const comm = await db.select({ name: commodities.name }).from(commodities)
      .where(eq(commodities.id, cl[0].commodityId)).limit(1);
    return { ...l, commodityName: comm[0]?.name || 'Unknown', rate: cl[0].rate };
  }));

  let transporterName = '—';
  if (d.transporterId) {
    const t = await db.select({ name: parties.name }).from(parties).where(eq(parties.id, d.transporterId)).limit(1);
    transporterName = t[0]?.name || '—';
  }

  // Fetch contract info
  let saudaNo: number | null = null;
  if (enriched[0]?.contractLineId) {
    const cl = await db.select({ contractId: contractLines.contractId }).from(contractLines)
      .where(eq(contractLines.id, enriched[0].contractLineId)).limit(1);
    if (cl.length) {
      const c = await db.select({ saudaNo: contracts.saudaNo }).from(contracts)
        .where(eq(contracts.id, cl[0].contractId)).limit(1);
      saudaNo = c[0]?.saudaNo ?? null;
    }
  }

  const totalDispatched = enriched.reduce((s, l) => s + parseFloat(l.dispatchedWeight ?? '0'), 0);
  const additions = charges.filter(c => ['FREIGHT', 'VAT', 'ADD'].includes(c.chargeType))
    .reduce((s, c) => s + parseFloat(c.amount ?? '0'), 0);
  const deductions = charges.filter(c => ['ADVANCE', 'LESS', 'DEDUCTION'].includes(c.chargeType))
    .reduce((s, c) => s + parseFloat(c.amount ?? '0'), 0);
  const netFreight = additions - deductions;

  const linesHtml = enriched.length ? `
    <div class="section">
      <div class="section-title">Delivery Line Items</div>
      <table>
        <thead><tr>
          <th>Commodity</th>
          <th class="right">Dispatched Bags</th>
          <th class="right">Dispatched Weight (Qtl)</th>
          <th class="right">Rate (₹/Qtl)</th>
        </tr></thead>
        <tbody>
          ${enriched.map(l => `<tr>
            <td>${l.commodityName}</td>
            <td class="right">${l.dispatchedBags ?? '—'}</td>
            <td class="right mono">${fmtNum(l.dispatchedWeight)}</td>
            <td class="right mono">${fmtNum(l.rate)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="2"><strong>Total Dispatched Weight</strong></td>
          <td class="right mono" colspan="2"><strong>${fmtNum(totalDispatched)} Qtl</strong></td>
        </tr></tfoot>
      </table>
    </div>` : '';

  const chargesHtml = charges.length ? `
    <div class="section">
      <div class="section-title">Freight & Charges</div>
      <table>
        <thead><tr><th>Charge Type</th><th class="right">Amount (₹)</th></tr></thead>
        <tbody>
          ${charges.map(c => `<tr><td>${c.chargeType}</td><td class="right mono">${fmt(c.amount)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td>Additions (Freight + VAT)</td><td class="right mono">${fmt(additions)}</td></tr>
          <tr><td>Deductions (Advance + Less)</td><td class="right mono">−${fmt(deductions)}</td></tr>
          <tr><td><strong>Net Freight Payable</strong></td><td class="right mono large"><strong>${fmt(netFreight)}</strong></td></tr>
        </tfoot>
      </table>
    </div>` : '';

  const body = `
    <div class="grid-3 section">
      <div class="field"><div class="field-label">Dispatch No.</div><div class="field-value">Disp #${d.id}</div></div>
      <div class="field"><div class="field-label">Dispatch Date</div><div class="field-value">${fmtDate(d.dispatchDate)}</div></div>
      <div class="field"><div class="field-label">Sauda Reference</div><div class="field-value">${saudaNo ? `Sauda #${saudaNo}` : '—'}</div></div>
      <div class="field"><div class="field-label">Lorry / Truck No.</div><div class="field-value">${d.truckNo || '—'}</div></div>
      <div class="field"><div class="field-label">Transporter</div><div class="field-value">${transporterName}</div></div>
      <div class="field"><div class="field-label">Carrier Bill No.</div><div class="field-value">${d.billNo || '—'}</div></div>
      <div class="field"><div class="field-label">Carrier Bill Date</div><div class="field-value">${fmtDate(d.carrierBillDate)}</div></div>
      <div class="field"><div class="field-label">Advance Collected</div><div class="field-value mono">${fmt(d.advancePaymentCollected)}</div></div>
      <div class="field"><div class="field-label">Status</div><div class="field-value"><span class="badge">${d.status || 'DISPATCHED'}</span></div></div>
    </div>
    ${linesHtml}
    ${chargesHtml}
  `;

  const html = printPage(
    `Delivery Order — Disp #${d.id}`,
    `Disp #${d.id}${saudaNo ? ` · Sauda #${saudaNo}` : ''}`,
    fmtDate(d.dispatchDate),
    body
  );

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
