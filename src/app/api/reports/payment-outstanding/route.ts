import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, parties, contracts, contractLines, contractParties, deliveryLines, commodities } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;

    // Select all bills that have an outstanding balance (balanceAmount > 0)
    // and belong to this company + FY
    const outstandingBills = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      basis: bills.basis,
      totalAmount: bills.totalAmount,
      balanceAmount: bills.balanceAmount,
      creditDays: bills.creditDays,
      billedPartyId: bills.partyId,
      billedPartyName: parties.name,
      creditLimit: parties.creditLimit,
      refType: billLines.referenceType,
      refId: billLines.referenceId,
    })
    .from(bills)
    .innerJoin(parties, eq(parties.id, bills.partyId))
    .leftJoin(billLines, eq(billLines.billId, bills.id))
    .where(and(
      eq(bills.companyId, companyId),
      eq(bills.fiscalYearId, fiscalYearId),
      sql`balance_amount::numeric > 0`
    ))
    .orderBy(desc(bills.billDate));

    const enriched = [];

    for (const b of outstandingBills) {
      let contractId: number | null = null;
      let saudaNo: number | null = null;
      let commodityName: string | null = null;

      if (b.refType === 'CONTRACT' && b.refId) {
        contractId = b.refId;
      } else if (b.refType === 'DELIVERY' && b.refId) {
        const delLines = await db
          .select({ contractLineId: deliveryLines.contractLineId })
          .from(deliveryLines)
          .where(eq(deliveryLines.deliveryId, b.refId))
          .limit(1);

        if (delLines.length > 0) {
          const conLines = await db
            .select({ contractId: contractLines.contractId })
            .from(contractLines)
            .where(eq(contractLines.id, delLines[0].contractLineId))
            .limit(1);

          if (conLines.length > 0) {
            contractId = conLines[0].contractId;
          }
        }
      }

      let buyerName = 'Unknown';
      let sellerName = 'Unknown';
      let sellerBrokerName = '-';
      let buyerBrokerName = '-';

      if (contractId) {
        const con = await db
          .select({ saudaNo: contracts.saudaNo })
          .from(contracts)
          .where(eq(contracts.id, contractId))
          .limit(1);

        if (con.length > 0) {
          saudaNo = con[0].saudaNo;
        }

        const cParties = await db
          .select({ role: contractParties.role, name: parties.name })
          .from(contractParties)
          .innerJoin(parties, eq(parties.id, contractParties.partyId))
          .where(eq(contractParties.contractId, contractId));

        buyerName = cParties.find(p => p.role === 'BUYER')?.name || 'Unknown';
        sellerName = cParties.find(p => p.role === 'SELLER')?.name || 'Unknown';
        sellerBrokerName = cParties.find(p => p.role === 'SELLER_BROKER')?.name || '-';
        buyerBrokerName = cParties.find(p => p.role === 'BUYER_BROKER')?.name || '-';

        const conLine = await db
          .select({ name: commodities.name })
          .from(contractLines)
          .innerJoin(commodities, eq(commodities.id, contractLines.commodityId))
          .where(eq(contractLines.contractId, contractId))
          .limit(1);

        if (conLine.length > 0) {
          commodityName = conLine[0].name;
        }
      }

      const overDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(b.billDate).getTime()) / (1000 * 60 * 60 * 24))
      );

      const total = parseFloat(b.totalAmount);
      const balance = parseFloat(b.balanceAmount);
      const received = total - balance;

      enriched.push({
        billId: b.id,
        billNo: b.billNo,
        billDate: b.billDate,
        basis: b.basis,
        billAmount: total,
        balanceAmount: balance,
        receivedAmount: received,
        deductions: 0,
        creditDays: b.creditDays,
        overDays,
        billedPartyName: b.billedPartyName,
        creditLimit: b.creditLimit ? parseFloat(b.creditLimit) : 0,
        contractNo: saudaNo || '-',
        buyerName,
        sellerName,
        sellerBrokerName,
        buyerBrokerName,
        commodityName: commodityName || '-',
      });
    }

    return ok(enriched);
  } catch (err) {
    console.error('GET /api/reports/payment-outstanding error:', err);
    return serverError('Failed to fetch payment outstanding report');
  }
}
