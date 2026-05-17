/**
 * GET /api/deliveries/export — Full-data export for deliveries
 */

import { db } from '@/db';
import { deliveries, deliveryLines, parties, contractLines, contracts, commodities } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawDeliveries = await db.select({
      id: deliveries.id,
      dispatchDate: deliveries.dispatchDate,
      truckNo: deliveries.truckNo,
      billNo: deliveries.billNo,
      status: deliveries.status,
      createdAt: deliveries.createdAt,
      transporterName: parties.name,
    })
      .from(deliveries)
      .leftJoin(parties, eq(parties.id, deliveries.transporterId))
      .orderBy(desc(deliveries.id));

    const deliveryIds = rawDeliveries.map(d => d.id);
    let linesMap: Record<number, any[]> = {};

    if (deliveryIds.length > 0) {
      const allLines = await db.select().from(deliveryLines)
        .where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`);
      for (const line of allLines) {
        if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
        linesMap[line.deliveryId].push(line);
      }
    }

    const exportData: any[] = [];
    for (const d of rawDeliveries) {
      const lines = linesMap[d.id] || [];
      for (const line of lines) {
        let saudaNo = '', saudaDate = '', commodityName = '', weight = '', rate = '';
        if (line.contractLineId) {
          const clRow = await db.select({
            contractId: contractLines.contractId,
            weight: contractLines.weightQuintals,
            rate: contractLines.rate,
            commodityId: contractLines.commodityId,
          }).from(contractLines).where(eq(contractLines.id, line.contractLineId)).limit(1);
          if (clRow.length > 0) {
            weight = clRow[0].weight;
            rate = clRow[0].rate;
            const cRow = await db.select({ saudaNo: contracts.saudaNo, saudaDate: contracts.saudaDate })
              .from(contracts).where(eq(contracts.id, clRow[0].contractId)).limit(1);
            if (cRow.length > 0) { saudaNo = String(cRow[0].saudaNo); saudaDate = String(cRow[0].saudaDate); }
            const comm = await db.select({ name: commodities.name }).from(commodities).where(eq(commodities.id, clRow[0].commodityId)).limit(1);
            if (comm.length > 0) commodityName = comm[0].name;
          }
        }
        const loadingDays = (saudaDate && d.dispatchDate)
          ? Math.ceil(Math.abs(new Date(d.dispatchDate).getTime() - new Date(saudaDate).getTime()) / (1000 * 60 * 60 * 24))
          : '';
        exportData.push({
          'Dispatch No': d.id,
          'Dispatch Date': d.dispatchDate,
          'Sauda No': saudaNo,
          'Lorry/Truck No': d.truckNo || '',
          'Bill No': d.billNo || '',
          'Transporter': d.transporterName || '',
          'Commodity': commodityName,
          'Dispatched Weight': line.dispatchedWeight || '',
          'Dispatched Bags': line.dispatchedBags || '',
          'Contract Weight': weight,
          'Contract Rate': rate,
          'Loading Days': loadingDays,
          'Status': d.status,
        });
      }
      if (lines.length === 0) {
        exportData.push({
          'Dispatch No': d.id,
          'Dispatch Date': d.dispatchDate,
          'Sauda No': '',
          'Lorry/Truck No': d.truckNo || '',
          'Bill No': d.billNo || '',
          'Transporter': d.transporterName || '',
          'Commodity': '',
          'Dispatched Weight': '',
          'Dispatched Bags': '',
          'Contract Weight': '',
          'Contract Rate': '',
          'Loading Days': '',
          'Status': d.status,
        });
      }
    }

    return ok(exportData);
  } catch (err) {
    console.error('GET /api/deliveries/export error:', err);
    return serverError('Failed to export deliveries');
  }
}
