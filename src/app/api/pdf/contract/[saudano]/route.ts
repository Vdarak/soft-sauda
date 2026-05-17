/**
 * GET /api/pdf/contract/:saudano — Generate contract note PDF
 * 
 * WS1: Renders correct payment term text (Discount vs Credit)
 * WS8: Includes party GSTIN on the document
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts, contractParties, contractLines, parties, commodities, partyTaxIds } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ saudano: string }> }) {
  const resolvedParams = await params;
  const saudaNo = parseInt(resolvedParams.saudano, 10);
  
  if (isNaN(saudaNo)) {
    return NextResponse.json({ error: "Invalid Sauda No" }, { status: 400 });
  }

  // Fetch contract data
  const contract = await db.select().from(contracts).where(eq(contracts.saudaNo, saudaNo)).limit(1);

  if (!contract || contract.length === 0) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const data = contract[0];

  // Fetch parties
  const partiesRows = await db.select({
    role: contractParties.role,
    name: parties.name,
    partyId: contractParties.partyId,
  })
    .from(contractParties)
    .leftJoin(parties, eq(contractParties.partyId, parties.id))
    .where(eq(contractParties.contractId, data.id));

  const seller = partiesRows.find(p => p.role === 'SELLER');
  const buyer = partiesRows.find(p => p.role === 'BUYER');
  const sellerBroker = partiesRows.find(p => p.role === 'SELLER_BROKER');
  const buyerBroker = partiesRows.find(p => p.role === 'BUYER_BROKER');

  // Fetch GST for buyer/seller
  let sellerGstin = '', buyerGstin = '';
  if (seller?.partyId) {
    const taxRows = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, seller.partyId));
    sellerGstin = taxRows.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  }
  if (buyer?.partyId) {
    const taxRows = await db.select().from(partyTaxIds).where(eq(partyTaxIds.partyId, buyer.partyId));
    buyerGstin = taxRows.find(t => t.taxType === 'GSTIN')?.taxValue || '';
  }

  // Fetch contract lines
  const lines = await db.select({
    brand: contractLines.brand,
    weight: contractLines.weightQuintals,
    rate: contractLines.rate,
    amount: contractLines.amount,
    numberOfLorries: contractLines.numberOfLorries,
    commodityName: commodities.name,
  })
    .from(contractLines)
    .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
    .where(eq(contractLines.contractId, data.id));

  const line = lines[0] || {};

  // Build payment term text
  let paymentTermText = '';
  if (data.paymentTermType === 'CREDIT') {
    paymentTermText = `Credit for ${data.paymentDays || 0} days without discount`;
  } else if (data.paymentPercent && data.paymentDays) {
    paymentTermText = `${data.paymentPercent}% discount within ${data.paymentDays} days`;
  }

  // Build a readable text-based PDF (mock — production would use puppeteer or @react-pdf)
  const contractText = [
    `CONTRACT NOTE - Sauda No: ${data.saudaNo}`,
    `Book: ${data.saudaBook}`,
    `Date: ${data.saudaDate ? new Date(data.saudaDate).toLocaleDateString('en-IN') : '-'}`,
    ``,
    `SELLER: ${seller?.name || '-'}`,
    sellerGstin ? `  GSTIN: ${sellerGstin}` : '',
    `BUYER: ${buyer?.name || '-'}`,
    buyerGstin ? `  GSTIN: ${buyerGstin}` : '',
    sellerBroker ? `SELLER BROKER: ${sellerBroker.name}` : '',
    buyerBroker ? `BUYER BROKER: ${buyerBroker.name}` : '',
    ``,
    `COMMODITY: ${line.commodityName || '-'}`,
    line.brand ? `BRAND: ${line.brand}` : '',
    `WEIGHT: ${line.weight || '0'} Quintals`,
    line.numberOfLorries ? `LORRIES: ${line.numberOfLorries}` : '',
    `RATE: Rs. ${line.rate || '0'}`,
    `AMOUNT: Rs. ${line.amount || '0'}`,
    ``,
    data.deliveryTerm ? `DELIVERY TERM: ${data.deliveryTerm}` : '',
    paymentTermText ? `PAYMENT TERM: ${paymentTermText}` : '',
    data.customRemarks ? `REMARKS: ${data.customRemarks}` : '',
  ].filter(Boolean).join('\n');

  // Generate a simple text-stream PDF (mock format — replace with real PDF library in production)
  const textLines = contractText.split('\n');
  const pdfTextCommands = textLines.map((line, i) => {
    const y = 700 - (i * 18);
    const escaped = line.replace(/[()\\]/g, '\\$&');
    const fontSize = i === 0 ? 16 : 11;
    return `${i === 0 ? '/F1 16 Tf' : '/F1 11 Tf'}\n100 ${y} Td\n(${escaped}) Tj\n0 0 Td`;
  }).join('\n');

  const streamContent = `BT\n${pdfTextCommands}\nET`;
  const streamLength = streamContent.length;

  const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000220 00000 n 
0000000500 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

  return new NextResponse(mockPdfContent.trim(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contract-${saudaNo}.pdf"`,
    },
  });
}
