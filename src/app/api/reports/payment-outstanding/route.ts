import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, parties, contracts, contractLines, contractParties, deliveryLines, commodities } from '@/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;

    // 1. Select all bills with an outstanding balance (> 0) for active company + fiscal year
    const outstandingBills = await db
      .select({
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
      .where(
        and(
          eq(bills.companyId, companyId),
          eq(bills.fiscalYearId, fiscalYearId),
          sql`balance_amount::numeric > 0`
        )
      )
      .orderBy(desc(bills.billDate));

    if (outstandingBills.length === 0) {
      return ok([]);
    }

    // 2. High-Performance Batch Resolution (Zero N+1 Query Loop)
    // Map deliveries to contractLineIds
    const deliveryRefIds = [
      ...new Set(
        outstandingBills
          .filter((b) => b.refType === 'DELIVERY' && b.refId)
          .map((b) => b.refId as number)
      ),
    ];

    const delToContractMap = new Map<number, number>();
    if (deliveryRefIds.length > 0) {
      const dRows = await db
        .select({
          deliveryId: deliveryLines.deliveryId,
          contractId: contractLines.contractId,
        })
        .from(deliveryLines)
        .innerJoin(contractLines, eq(contractLines.id, deliveryLines.contractLineId))
        .where(inArray(deliveryLines.deliveryId, deliveryRefIds));

      for (const r of dRows) {
        if (!delToContractMap.has(r.deliveryId)) {
          delToContractMap.set(r.deliveryId, r.contractId);
        }
      }
    }

    // Collect all unique contract IDs across CONTRACT and DELIVERY references
    const allContractIds = new Set<number>();
    for (const b of outstandingBills) {
      if (b.refType === 'CONTRACT' && b.refId) {
        allContractIds.add(b.refId);
      } else if (b.refType === 'DELIVERY' && b.refId) {
        const cId = delToContractMap.get(b.refId);
        if (cId) allContractIds.add(cId);
      }
    }

    // Batch fetch contract headers + commodity names
    const contractMetaMap = new Map<
      number,
      { saudaNo: number; commodityName: string }
    >();
    const contractPartiesMap = new Map<
      number,
      { role: string; name: string }[]
    >();

    const contractIdList = Array.from(allContractIds);
    if (contractIdList.length > 0) {
      const [cRows, pRows] = await Promise.all([
        db
          .select({
            contractId: contracts.id,
            saudaNo: contracts.saudaNo,
            commodityName: commodities.name,
          })
          .from(contracts)
          .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
          .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
          .where(inArray(contracts.id, contractIdList)),

        db
          .select({
            contractId: contractParties.contractId,
            role: contractParties.role,
            name: parties.name,
          })
          .from(contractParties)
          .innerJoin(parties, eq(parties.id, contractParties.partyId))
          .where(inArray(contractParties.contractId, contractIdList)),
      ]);

      for (const r of cRows) {
        if (!contractMetaMap.has(r.contractId)) {
          contractMetaMap.set(r.contractId, {
            saudaNo: r.saudaNo,
            commodityName: r.commodityName || '-',
          });
        }
      }

      for (const p of pRows) {
        if (!contractPartiesMap.has(p.contractId)) {
          contractPartiesMap.set(p.contractId, []);
        }
        contractPartiesMap.get(p.contractId)!.push({
          role: p.role,
          name: p.name,
        });
      }
    }

    // 3. Assemble and compute aging + due dates
    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const enriched = outstandingBills.map((b) => {
      let contractId: number | null = null;
      if (b.refType === 'CONTRACT' && b.refId) {
        contractId = b.refId;
      } else if (b.refType === 'DELIVERY' && b.refId) {
        contractId = delToContractMap.get(b.refId) || null;
      }

      const cMeta = contractId ? contractMetaMap.get(contractId) : null;
      const cParties = contractId ? contractPartiesMap.get(contractId) || [] : [];

      const buyerName = cParties.find((p) => p.role === 'BUYER')?.name || b.billedPartyName;
      const sellerName = cParties.find((p) => p.role === 'SELLER')?.name || 'Unknown';
      const sellerBrokerName = cParties.find((p) => p.role === 'SELLER_BROKER')?.name || '-';
      const buyerBrokerName = cParties.find((p) => p.role === 'BUYER_BROKER')?.name || '-';

      // Due date & Overdue days logic adhering to SP_outsrear:
      // Due Date = Bill Date + Credit Days. Overdue days only count AFTER credit days expire.
      const billTime = new Date(b.billDate).getTime();
      const creditDays = b.creditDays || 0;
      const dueTime = billTime + creditDays * MS_PER_DAY;
      const overDays = Math.max(0, Math.floor((now - dueTime) / MS_PER_DAY));

      const total = parseFloat(b.totalAmount || '0');
      const balance = parseFloat(b.balanceAmount || '0');
      const received = Math.max(0, total - balance);

      return {
        billId: b.id,
        billNo: b.billNo,
        billDate: b.billDate,
        dueDate: new Date(dueTime).toISOString(),
        basis: b.basis,
        billAmount: total,
        balanceAmount: balance,
        receivedAmount: received,
        deductions: 0,
        creditDays,
        overDays,
        billedPartyName: b.billedPartyName,
        creditLimit: b.creditLimit ? parseFloat(b.creditLimit) : 0,
        contractNo: cMeta?.saudaNo ? cMeta.saudaNo.toString() : '-',
        buyerName,
        sellerName,
        sellerBrokerName,
        buyerBrokerName,
        commodityName: cMeta?.commodityName || '-',
      };
    });

    return ok(enriched);
  } catch (err: any) {
    console.error('GET /api/reports/payment-outstanding error:', err);
    return serverError(`Failed to fetch payment outstanding report: ${err?.message || err}`);
  }
}
