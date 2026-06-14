/**
 * GET /api/pdf/contract/:saudano — Contract Note HTML print page
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contractParties, contractLines, parties, commodities, partyTaxIds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { printPage, fmt, fmtDate, fmtNum } from "@/lib/print-layout";

export async function GET(req: NextRequest, { params }: { params: Promise<{ saudano: string }> }) {
  const resolvedParams = await params;
  const saudaNo = parseInt(resolvedParams.saudano, 10);
  if (isNaN(saudaNo)) return NextResponse.json({ error: "Invalid Sauda No" }, { status: 400 });

  const contract = await db.select().from(contracts).where(eq(contracts.saudaNo, saudaNo)).limit(1);
  if (!contract.length) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  const data = contract[0];

  const partiesRows = await db.select({ role: contractParties.role, name: parties.name, partyId: contractParties.partyId })
    .from(contractParties).leftJoin(parties, eq(contractParties.partyId, parties.id))
    .where(eq(contractParties.contractId, data.id));

  const seller      = partiesRows.find(p => p.role === 'SELLER');
  const buyer       = partiesRows.find(p => p.role === 'BUYER');
  const sellerBroker = partiesRows.find(p => p.role === 'SELLER_BROKER');
  const buyerBroker  = partiesRows.find(p => p.role === 'BUYER_BROKER');

  let sellerGstin = '', buyerGstin = '';
  if (seller?.partyId) {
    const t = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, seller.partyId));
    sellerGstin = t.find(x => x.taxType === 'GSTIN')?.taxValue || '';
  }
  if (buyer?.partyId) {
    const t = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, buyer.partyId));
    buyerGstin = t.find(x => x.taxType === 'GSTIN')?.taxValue || '';
  }

  const lines = await db.select({
    brand: contractLines.brand, weight: contractLines.weightQuintals,
    rate: contractLines.rate, amount: contractLines.amount,
    numberOfLorries: contractLines.numberOfLorries, commodityName: commodities.name,
  }).from(contractLines).leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
    .where(eq(contractLines.contractId, data.id));

  let paymentTermText = '';
  if (data.paymentTermType === 'CREDIT') {
    paymentTermText = `Credit for ${data.paymentDays || 0} days without discount`;
  } else if (data.paymentPercent && data.paymentDays) {
    paymentTermText = `${data.paymentPercent}% discount within ${data.paymentDays} days`;
  } else if (data.paymentTermType === 'PAYMENT') {
    paymentTermText = 'Immediate Payment';
  }

  const totalAmount = lines.reduce((s, l) => s + parseFloat(l.amount ?? '0'), 0);

  const linesHtml = `
    <div class="section">
      <div class="section-title">Commodity Line Items</div>
      <table>
        <thead><tr>
          <th>Commodity</th><th>Brand</th>
          <th class="right">Lorries</th><th class="right">Weight (Qtl)</th>
          <th class="right">Rate (₹/Qtl)</th><th class="right">Amount (₹)</th>
        </tr></thead>
        <tbody>
          ${lines.map(l => `<tr>
            <td>${l.commodityName || '—'}</td>
            <td>${l.brand || '—'}</td>
            <td class="right">${l.numberOfLorries || '—'}</td>
            <td class="right mono">${fmtNum(l.weight)}</td>
            <td class="right mono">${fmtNum(l.rate)}</td>
            <td class="right mono">${fmt(l.amount)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr>
          <td colspan="5"><strong>Total Contract Value</strong></td>
          <td class="right mono large"><strong>${fmt(totalAmount)}</strong></td>
        </tr></tfoot>
      </table>
    </div>`;

  const body = `
    <div class="grid-2 section">
      <div>
        <div class="section-title">Seller (Vikreta)</div>
        <div class="field"><div class="field-value">${seller?.name || '—'}</div>${sellerGstin ? `<div class="field-label">GSTIN: ${sellerGstin}</div>` : ''}</div>
      </div>
      <div>
        <div class="section-title">Buyer (Kharidaar)</div>
        <div class="field"><div class="field-value">${buyer?.name || '—'}</div>${buyerGstin ? `<div class="field-label">GSTIN: ${buyerGstin}</div>` : ''}</div>
      </div>
    </div>

    <div class="grid-2 section">
      <div>
        <div class="section-title">Brokers</div>
        <div class="field"><div class="field-label">Seller Broker</div><div class="field-value">${sellerBroker?.name || '—'}</div></div>
        <div class="field"><div class="field-label">Buyer Broker</div><div class="field-value">${buyerBroker?.name || '—'}</div></div>
      </div>
      <div>
        <div class="section-title">Contract Details</div>
        <div class="field"><div class="field-label">Sauda Book</div><div class="field-value">${data.saudaBook || 'Main Book'}</div></div>
        <div class="field"><div class="field-label">Origin → Destination</div><div class="field-value">${data.originStation || '—'} → ${data.destinationStation || '—'}</div></div>
        ${data.deliveryDeadlineDate ? `<div class="field"><div class="field-label">Delivery Deadline</div><div class="field-value">${fmtDate(data.deliveryDeadlineDate)}</div></div>` : ''}
      </div>
    </div>

    ${linesHtml}

    <div class="grid-3 section">
      <div class="field"><div class="field-label">Payment Terms</div><div class="field-value">${paymentTermText || '—'}</div></div>
      ${data.taxFormRequired ? `<div class="field"><div class="field-label">Tax Form</div><div class="field-value">${data.taxFormRequired}</div></div>` : ''}
      ${data.deliveryTerm ? `<div class="field"><div class="field-label">Delivery Term</div><div class="field-value">${data.deliveryTerm}</div></div>` : ''}
    </div>

    ${data.termsAndConditions ? `<div class="section"><div class="section-title">Terms & Conditions</div><div style="font-size:9.5pt;line-height:1.5">${data.termsAndConditions}</div></div>` : ''}
    ${data.customRemarks ? `<div class="section"><div class="section-title">Remarks</div><div style="font-size:9.5pt">${data.customRemarks}</div></div>` : ''}
  `;

  const html = printPage(
    `Contract Note — Sauda #${data.saudaNo}`,
    `Sauda #${data.saudaNo} · ${data.saudaBook || 'Main Book'}`,
    fmtDate(data.saudaDate),
    body
  );

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
