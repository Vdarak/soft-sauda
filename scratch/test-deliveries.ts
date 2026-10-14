import { db } from '../src/db';
import { deliveries, deliveryLines, parties, contractLines, contracts, commodities, contractParties } from '../src/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

async function test() {
  try {
    const companyId = 1;
    const fiscalYearId = 67;
    const limit = 2;
    const offset = 0;

    const rawDeliveries = await db.select({
      id: deliveries.id,
      dispatchDate: deliveries.dispatchDate,
      truckNo: deliveries.truckNo,
      billNo: deliveries.billNo,
      carrierBillDate: deliveries.carrierBillDate,
      transporterId: deliveries.transporterId,
      advancePaymentCollected: deliveries.advancePaymentCollected,
      status: deliveries.status,
      createdAt: deliveries.createdAt,
      updatedAt: deliveries.updatedAt,
      createdBy: deliveries.createdBy,
      updatedBy: deliveries.updatedBy,
      transporterName: parties.name,
    })
      .from(deliveries)
      .leftJoin(parties, eq(parties.id, deliveries.transporterId))
      .where(and(eq(deliveries.companyId, companyId), eq(deliveries.fiscalYearId, fiscalYearId)))
      .orderBy(desc(deliveries.id))
      .limit(limit)
      .offset(offset);

    console.log('rawDeliveries count:', rawDeliveries.length);

    const deliveryIds = rawDeliveries.map(d => d.id);
    let linesMap: Record<number, any[]> = {};
    let contractIds: number[] = [];

    if (deliveryIds.length > 0) {
      const allLines = await db.select({
        id: deliveryLines.id,
        deliveryId: deliveryLines.deliveryId,
        contractLineId: deliveryLines.contractLineId,
        dispatchedBags: deliveryLines.dispatchedBags,
        dispatchedWeight: deliveryLines.dispatchedWeight,
        commodityName: commodities.name,
        rate: contractLines.rate,
        amount: contractLines.amount,
        contractId: contractLines.contractId,
      })
        .from(deliveryLines)
        .leftJoin(contractLines, eq(contractLines.id, deliveryLines.contractLineId))
        .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
        .where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`);

      for (const line of allLines) {
        if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
        linesMap[line.deliveryId].push(line);
        if (line.contractId) contractIds.push(line.contractId);
      }
    }
    console.log('Lines fetched map keys:', Object.keys(linesMap).length);

    const allContractIds = [...new Set([...deliveryIds, ...contractIds])];
    console.log('allContractIds:', allContractIds);
    let contractMap: Record<number, any> = {};
    let partyMap: Record<number, any[]> = {};

    if (allContractIds.length > 0) {
      const [cRows, pRows] = await Promise.all([
        db.select({ id: contracts.id, saudaNo: contracts.saudaNo, saudaDate: contracts.saudaDate })
          .from(contracts).where(sql`${contracts.id} IN (${sql.join(allContractIds.map(id => sql`${id}`), sql`, `)})`),
        db.select({ contractId: contractParties.contractId, role: contractParties.role, name: parties.name })
          .from(contractParties)
          .leftJoin(parties, eq(parties.id, contractParties.partyId))
          .where(sql`${contractParties.contractId} IN (${sql.join(allContractIds.map(id => sql`${id}`), sql`, `)})`),
      ]);
      console.log('cRows count:', cRows.length, 'pRows count:', pRows.length);
    }
    console.log('SUCCESS!');
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
