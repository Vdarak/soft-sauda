import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, billLines, ledger, parties, deliveries, deliveryLines, contracts, contractLines, contractParties, commodities } from '@/db/schema';
import { eq, and, desc, sql, notExists, inArray } from 'drizzle-orm';
import { ok, badRequest, serverError, parseBody } from '@/lib/api-helpers';
import { cacheInvalidate } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const basis = searchParams.get('basis') || 'DELIVERY'; // DELIVERY or CONTRACT
    const fromDateStr = searchParams.get('fromDate');
    const toDateStr = searchParams.get('toDate');
    const partiesFilter = searchParams.get('parties'); // comma-separated or empty/ALL
    const commoditiesFilter = searchParams.get('commodities'); // comma-separated or empty/ALL

    const fromDate = fromDateStr ? new Date(fromDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = toDateStr ? new Date(toDateStr) : new Date();
    // Set to end of day to include the whole day
    toDate.setHours(23, 59, 59, 999);

    if (basis === 'DELIVERY') {
      // Find all deliveries in date range not billed yet
      let query = db
        .select({
          deliveryId: deliveries.id,
          dispatchDate: deliveries.dispatchDate,
          truckNo: deliveries.truckNo,
          billNo: deliveries.billNo,
          dispatchedWeight: deliveryLines.dispatchedWeight,
          dispatchedBags: deliveryLines.dispatchedBags,
          contractLineId: deliveryLines.contractLineId,
          saudaNo: contracts.saudaNo,
          saudaBook: contracts.saudaBook,
          buyerId: sql<number>`(SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'BUYER' LIMIT 1)`,
          sellerId: sql<number>`(SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'SELLER' LIMIT 1)`,
          buyerName: sql<string>`(SELECT name FROM parties WHERE id = (SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'BUYER' LIMIT 1))`,
          sellerName: sql<string>`(SELECT name FROM parties WHERE id = (SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'SELLER' LIMIT 1))`,
          commodityId: contractLines.commodityId,
          commodityName: commodities.name,
          rate: contractLines.rate,
        })
        .from(deliveries)
        .innerJoin(deliveryLines, eq(deliveryLines.deliveryId, deliveries.id))
        .innerJoin(contractLines, eq(contractLines.id, deliveryLines.contractLineId))
        .innerJoin(contracts, eq(contracts.id, contractLines.contractId))
        .innerJoin(commodities, eq(commodities.id, contractLines.commodityId))
        .where(
          and(
            sql`${deliveries.dispatchDate} >= ${fromDate.toISOString()}`,
            sql`${deliveries.dispatchDate} <= ${toDate.toISOString()}`,
            notExists(
              db.select({ id: billLines.id })
                .from(billLines)
                .where(
                  and(
                    eq(billLines.referenceType, 'DELIVERY'),
                    eq(billLines.referenceId, deliveries.id)
                  )
                )
            )
          )
        );

      const rows = await query;

      // Filter by parties & commodities in-memory for simpler SQL structure
      let filtered = rows;
      if (partiesFilter && partiesFilter !== 'ALL') {
        const partyIds = partiesFilter.split(',').map(id => parseInt(id, 10));
        filtered = filtered.filter(r => partyIds.includes(r.buyerId) || partyIds.includes(r.sellerId));
      }
      if (commoditiesFilter && commoditiesFilter !== 'ALL') {
        const commodityIds = commoditiesFilter.split(',').map(id => parseInt(id, 10));
        filtered = filtered.filter(r => commodityIds.includes(r.commodityId));
      }

      return ok(filtered);
    } else {
      // CONTRACT based
      let query = db
        .select({
          contractId: contracts.id,
          saudaNo: contracts.saudaNo,
          saudaBook: contracts.saudaBook,
          saudaDate: contracts.saudaDate,
          buyerId: sql<number>`(SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'BUYER' LIMIT 1)`,
          sellerId: sql<number>`(SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'SELLER' LIMIT 1)`,
          buyerName: sql<string>`(SELECT name FROM parties WHERE id = (SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'BUYER' LIMIT 1))`,
          sellerName: sql<string>`(SELECT name FROM parties WHERE id = (SELECT party_id FROM contract_parties WHERE contract_id = ${contracts.id} AND role = 'SELLER' LIMIT 1))`,
          commodityId: contractLines.commodityId,
          commodityName: commodities.name,
          weightQuintals: contractLines.weightQuintals,
          quantityBags: contractLines.quantityBags,
          rate: contractLines.rate,
          amount: contractLines.amount,
        })
        .from(contracts)
        .innerJoin(contractLines, eq(contractLines.contractId, contracts.id))
        .innerJoin(commodities, eq(commodities.id, contractLines.commodityId))
        .where(
          and(
            sql`${contracts.saudaDate} >= ${fromDate.toISOString()}`,
            sql`${contracts.saudaDate} <= ${toDate.toISOString()}`,
            notExists(
              db.select({ id: billLines.id })
                .from(billLines)
                .where(
                  and(
                    eq(billLines.referenceType, 'CONTRACT'),
                    eq(billLines.referenceId, contracts.id)
                  )
                )
            )
          )
        );

      const rows = await query;

      let filtered = rows;
      if (partiesFilter && partiesFilter !== 'ALL') {
        const partyIds = partiesFilter.split(',').map(id => parseInt(id, 10));
        filtered = filtered.filter(r => partyIds.includes(r.buyerId) || partyIds.includes(r.sellerId));
      }
      if (commoditiesFilter && commoditiesFilter !== 'ALL') {
        const commodityIds = commoditiesFilter.split(',').map(id => parseInt(id, 10));
        filtered = filtered.filter(r => commodityIds.includes(r.commodityId));
      }

      return ok(filtered);
    }
  } catch (err) {
    console.error('GET /api/utilities/batch-billing error:', err);
    return serverError('Failed to fetch unbilled transactions');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<Record<string, any>>(req);
    if (!body || !body.selectedIds || !Array.isArray(body.selectedIds) || body.selectedIds.length === 0) {
      return badRequest('No transactions selected for billing');
    }

    const basis = body.basis || 'DELIVERY'; // DELIVERY or CONTRACT
    const billDate = body.billDate ? new Date(body.billDate) : new Date();
    const scope = body.scope || 'BUYER_WISE'; // BUYER_WISE or SELLER_WISE
    const creditDays = body.creditDays ? parseInt(body.creditDays, 10) : null;

    const generatedBills: any[] = [];

    await db.transaction(async (tx) => {
      // Get the next bill number sequence starting point
      const lastBill = await tx.select({ billNo: bills.billNo }).from(bills).orderBy(desc(bills.id)).limit(1);
      let nextNum = 1;
      if (lastBill.length > 0) {
        const match = lastBill[0].billNo.match(/\d+$/);
        if (match) nextNum = parseInt(match[0], 10) + 1;
      }

      for (const refId of body.selectedIds) {
        // Double-billing safeguard
        const billedCheck = await tx
          .select({ id: billLines.id })
          .from(billLines)
          .where(and(eq(billLines.referenceType, basis), eq(billLines.referenceId, refId)))
          .limit(1);

        if (billedCheck.length > 0) continue; // Skip if already billed

        let partyId: number | null = null;
        let totalAmount = 0;
        let description = '';

        if (basis === 'DELIVERY') {
          // Fetch delivery details
          const delData = await tx
            .select({
              id: deliveries.id,
              truckNo: deliveries.truckNo,
              weight: deliveryLines.dispatchedWeight,
              bags: deliveryLines.dispatchedBags,
              rate: contractLines.rate,
              commodityName: commodities.name,
              contractId: contractLines.contractId,
            })
            .from(deliveries)
            .innerJoin(deliveryLines, eq(deliveryLines.deliveryId, deliveries.id))
            .innerJoin(contractLines, eq(contractLines.id, deliveryLines.contractLineId))
            .innerJoin(commodities, eq(commodities.id, contractLines.commodityId))
            .where(eq(deliveries.id, refId))
            .limit(1);

          if (delData.length === 0) continue;
          const d = delData[0];

          // Determine party based on scope
          const role = scope === 'SELLER_WISE' ? 'SELLER' : 'BUYER';
          const pRow = await tx
            .select({ partyId: contractParties.partyId })
            .from(contractParties)
            .where(and(eq(contractParties.contractId, d.contractId), eq(contractParties.role, role)))
            .limit(1);

          if (pRow.length === 0) continue;
          partyId = pRow[0].partyId;

          totalAmount = parseFloat(d.weight) * parseFloat(d.rate);
          description = `${d.commodityName} dispatch against Sauda: Lorry/Truck #${d.truckNo || '-'}, Wt: ${d.weight} Qtl, Rate: ₹${d.rate}`;
        } else {
          // CONTRACT based
          const conData = await tx
            .select({
              id: contracts.id,
              saudaNo: contracts.saudaNo,
              weight: contractLines.weightQuintals,
              rate: contractLines.rate,
              commodityName: commodities.name,
            })
            .from(contracts)
            .innerJoin(contractLines, eq(contractLines.contractId, contracts.id))
            .innerJoin(commodities, eq(commodities.id, contractLines.commodityId))
            .where(eq(contracts.id, refId))
            .limit(1);

          if (conData.length === 0) continue;
          const c = conData[0];

          const role = scope === 'SELLER_WISE' ? 'SELLER' : 'BUYER';
          const pRow = await tx
            .select({ partyId: contractParties.partyId })
            .from(contractParties)
            .where(and(eq(contractParties.contractId, c.id), eq(contractParties.role, role)))
            .limit(1);

          if (pRow.length === 0) continue;
          partyId = pRow[0].partyId;

          totalAmount = parseFloat(c.weight) * parseFloat(c.rate);
          description = `${c.commodityName} Sauda Contract #${c.saudaNo}, Wt: ${c.weight} Qtl, Rate: ₹${c.rate}`;
        }

        if (!partyId || totalAmount <= 0) continue;

        const billNo = `B-${String(nextNum++).padStart(5, '0')}`;

        // Insert Bill
        const [bill] = await tx.insert(bills).values({
          billNo,
          billDate,
          partyId,
          basis,
          totalAmount: totalAmount.toFixed(2),
          balanceAmount: totalAmount.toFixed(2),
          creditDays,
        }).returning();

        // Insert Bill Line
        await tx.insert(billLines).values({
          billId: bill.id,
          description,
          amount: totalAmount.toFixed(2),
          referenceType: basis,
          referenceId: refId,
        });

        // Post to Ledger
        const isBuyer = scope !== 'SELLER_WISE';
        await tx.insert(ledger).values({
          transactionDate: billDate,
          accountId: partyId,
          sourceType: 'BILL',
          sourceId: bill.id,
          debit: isBuyer ? totalAmount.toFixed(2) : '0.00',
          credit: isBuyer ? '0.00' : totalAmount.toFixed(2),
          narration: `Batch Invoiced: #${billNo} Basis: ${basis} (${description})`,
        });

        generatedBills.push(bill);
      }
    });

    cacheInvalidate('bills');
    cacheInvalidate('ledger');

    return ok({ success: true, count: generatedBills.length, bills: generatedBills });
  } catch (err: any) {
    console.error('POST /api/utilities/batch-billing error:', err);
    return serverError(`Batch billing generation failed: ${err.message}`);
  }
}
