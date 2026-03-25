import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  // For prototype purposes: Generate a literal text stream claiming to be a PDF. 
  // In production, we'd use puppeteer or @react-pdf/renderer mapped to the actual PDF templates
  // e.g., 'Contract FormGCC-1035.pdf'
  
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
<< /Length 205 >>
stream
BT
/F1 24 Tf
100 700 Td
(GCC ERP - Contract Generation Mock) Tj
0 -30 Td
/F1 12 Tf
(Sauda No: ${data.saudaNo}) Tj
0 -20 Td
(Seller: Verified Party) Tj
0 -20 Td
(Buyer: Verified Party) Tj
0 -20 Td
(Item: Master Commodity) Tj
0 -20 Td
(Amount: Rs. TBD) Tj
ET
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
