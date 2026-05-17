/**
 * GET /api/contracts/export — Full-data export (all contracts, no pagination)
 * Returns flat array with all columns for Excel export
 */

import { db } from '@/db';
import { contracts, contractParties, contractLines, parties, commodities, deliveries, deliveryLines } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawContracts = await db.select({
      id: contracts.id,
      saudaNo: contracts.saudaNo,
      saudaBook: contracts.saudaBook,
      saudaDate: contracts.saudaDate,
      status: contracts.status,
      deliveryTerm: contracts.deliveryTerm,
      paymentTermType: contracts.paymentTermType,
      paymentPercent: contracts.paymentPercent,
      paymentDays: contracts.paymentDays,
      customRemarks: contracts.customRemarks,
      createdAt: contracts.createdAt,
      // Line data
      contractLineId: contractLines.id,
      brand: contractLines.brand,
      numberOfLorries: contractLines.numberOfLorries,
      quantityBags: contractLines.quantityBags,
      amount: contractLines.amount,
      weight: contractLines.weightQuintals,
      rate: contractLines.rate,
      // Commodity name
      commodityName: commodities.name,
    })
      .from(contracts)
      .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
      .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
      .orderBy(desc(contracts.saudaNo));

    // Batch fetch all party associations
    const contractIds = [...new Set(rawContracts.map(c => c.id))];
    let partyMap: Record<number, { role: string; name: string | null }[]> = {};
    if (contractIds.length > 0) {
      const allPartyRows = await db.select({
        contractId: contractParties.contractId,
        role: contractParties.role,
        name: parties.name,
      })
        .from(contractParties)
        .leftJoin(parties, eq(contractParties.partyId, parties.id))
        .where(sql`${contractParties.contractId} IN (${sql.join(contractIds.map(id => sql`${id}`), sql`, `)})`);
      for (const row of allPartyRows) {
        if (!partyMap[row.contractId]) partyMap[row.contractId] = [];
        partyMap[row.contractId].push({ role: row.role, name: row.name });
      }
    }

    // Delivery counts
    const contractLineIds = rawContracts.map(c => c.contractLineId).filter(Boolean) as number[];
    let deliveryCountMap: Record<number, { dispatched: number; delivered: number }> = {};
    if (contractLineIds.length > 0) {
      const deliveryCounts = await db.select({
        contractLineId: deliveryLines.contractLineId,
        status: deliveries.status,
        count: sql<number>`count(*)`,
      })
        .from(deliveryLines)
        .leftJoin(deliveries, eq(deliveries.id, deliveryLines.deliveryId))
        .where(sql`${deliveryLines.contractLineId} IN (${sql.join(contractLineIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(deliveryLines.contractLineId, deliveries.status);

      for (const row of deliveryCounts) {
        if (!deliveryCountMap[row.contractLineId]) deliveryCountMap[row.contractLineId] = { dispatched: 0, delivered: 0 };
        const cnt = Number(row.count);
        if (row.status === 'DISPATCHED') deliveryCountMap[row.contractLineId].dispatched += cnt;
        else if (row.status === 'DELIVERED') deliveryCountMap[row.contractLineId].delivered += cnt;
      }
    }

    const exportData = rawContracts.map(c => {
      const cParties = partyMap[c.id] || [];
      const dCounts = c.contractLineId ? deliveryCountMap[c.contractLineId] : null;
      return {
        'Sauda No': c.saudaNo,
        'Sauda Book': c.saudaBook,
        'Sauda Date': c.saudaDate,
        'Status': c.status,
        'Seller': cParties.find(p => p.role === 'SELLER')?.name || '',
        'Buyer': cParties.find(p => p.role === 'BUYER')?.name || '',
        'Seller Broker': cParties.find(p => p.role === 'SELLER_BROKER')?.name || '',
        'Buyer Broker': cParties.find(p => p.role === 'BUYER_BROKER')?.name || '',
        'Commodity': c.commodityName || '',
        'Brand': c.brand || '',
        'No. of Lorries': c.numberOfLorries || '',
        'Quantity (Bags)': c.quantityBags || '',
        'Weight (Qtls)': c.weight || '',
        'Rate': c.rate || '',
        'Amount': c.amount || '',
        'Delivery Term': c.deliveryTerm || '',
        'Payment Type': c.paymentTermType || '',
        'Payment %': c.paymentPercent || '',
        'Payment Days': c.paymentDays || '',
        'Dispatched': dCounts?.dispatched || 0,
        'Delivered': dCounts?.delivered || 0,
        'Pending': (c.numberOfLorries || 0) > 0 ? Math.max(0, (c.numberOfLorries || 0) - ((dCounts?.dispatched || 0) + (dCounts?.delivered || 0))) : '',
        'Remarks': c.customRemarks || '',
      };
    });

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/contracts/export error:', err);
    return serverError('Failed to export contracts');
  }
}
