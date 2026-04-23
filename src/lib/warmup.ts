/**
 * Cache Warmup — Pre-fetches ALL list data in parallel.
 * 
 * Called on login (fire-and-forget) and via GET /api/warmup.
 * This ensures the first navigation after login is instant because
 * all data is already sitting in the in-memory cache.
 * 
 * Each query populates the same cache keys used by the regular API routes,
 * so when the user navigates to e.g. /contracts, the route handler
 * finds a cache hit and returns immediately without touching the DB.
 */

import { db } from '@/db';
import {
  parties, commodities, contracts, contractParties, contractLines,
  deliveries, deliveryLines, bills, payments, paymentAllocations, ledger,
} from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { cacheSet, cacheHas, DEFAULT_TTL } from '@/lib/cache';

/** Run all warmup queries in parallel. Safe to call multiple times. */
export async function warmCache(): Promise<{ warmed: string[]; skipped: string[] }> {
  const warmed: string[] = [];
  const skipped: string[] = [];
  const TTL = DEFAULT_TTL;

  const tasks: Array<{ key: string; fn: () => Promise<void> }> = [
    // ── Dashboard metrics ──
    {
      key: 'dashboard:metrics',
      fn: async () => {
        const [partyCount] = await db.select({ count: sql<number>`count(*)` }).from(parties);
        const [contractCount] = await db.select({ count: sql<number>`count(*)` }).from(contracts);
        const [deliveryCount] = await db.select({ count: sql<number>`count(*)` }).from(deliveries);
        const [billCount] = await db.select({ count: sql<number>`count(*)` }).from(bills);
        const [paymentCount] = await db.select({ count: sql<number>`count(*)` }).from(payments);
        const [outstanding] = await db.select({ total: sql<string>`COALESCE(SUM(balance_amount::numeric), 0)` }).from(bills);
        cacheSet('dashboard:metrics', {
          parties: Number(partyCount.count),
          contracts: Number(contractCount.count),
          deliveries: Number(deliveryCount.count),
          bills: Number(billCount.count),
          payments: Number(paymentCount.count),
          outstandingBalance: parseFloat(outstanding.total as string) || 0,
        }, TTL);
      },
    },
    // ── Parties list ──
    {
      key: 'parties:list:1:50',
      fn: async () => {
        const data = await db.select().from(parties).orderBy(desc(parties.id)).limit(50);
        cacheSet('parties:list:1:50', data, TTL);
        data.forEach(p => cacheSet(`parties:${p.id}`, p, TTL));
      },
    },
    // ── Commodities list ──
    {
      key: 'commodities:list:1:50',
      fn: async () => {
        const data = await db.select().from(commodities).orderBy(desc(commodities.id)).limit(50);
        cacheSet('commodities:list:1:50', data, TTL);
        data.forEach(c => cacheSet(`commodities:${c.id}`, c, TTL));
      },
    },
    // ── Contracts list (with JOINs) ──
    {
      key: 'contracts:list:1:50',
      fn: async () => {
        const rawContracts = await db.select({
          id: contracts.id, saudaNo: contracts.saudaNo, saudaBook: contracts.saudaBook,
          saudaDate: contracts.saudaDate, status: contracts.status,
          deliveryTerm: contracts.deliveryTerm, customRemarks: contracts.customRemarks,
          createdAt: contracts.createdAt,
          amount: contractLines.amount, weight: contractLines.weightQuintals,
          rate: contractLines.rate, commodityName: commodities.name,
        })
          .from(contracts)
          .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
          .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
          .orderBy(desc(contracts.saudaNo)).limit(50);

        const contractIds = [...new Set(rawContracts.map(c => c.id))];
        let partyMap: Record<number, { role: string; name: string | null }[]> = {};
        if (contractIds.length > 0) {
          const allPartyRows = await db.select({
            contractId: contractParties.contractId, role: contractParties.role, name: parties.name,
          })
            .from(contractParties)
            .leftJoin(parties, eq(contractParties.partyId, parties.id))
            .where(sql`${contractParties.contractId} IN (${sql.join(contractIds.map(id => sql`${id}`), sql`, `)})`);
          for (const row of allPartyRows) {
            if (!partyMap[row.contractId]) partyMap[row.contractId] = [];
            partyMap[row.contractId].push({ role: row.role, name: row.name });
          }
        }

        const enriched = rawContracts.map(c => {
          const cParties = partyMap[c.id] || [];
          const detailItem = {
            id: c.id, saudaNo: c.saudaNo, saudaBook: c.saudaBook, saudaDate: c.saudaDate,
            status: c.status, deliveryTerm: c.deliveryTerm, customRemarks: c.customRemarks,
            createdAt: c.createdAt,
            sellerName: cParties.find(p => p.role === 'SELLER')?.name || null,
            buyerName: cParties.find(p => p.role === 'BUYER')?.name || null,
            sellerBroker: cParties.find(p => p.role === 'SELLER_BROKER')?.name || null,
            buyerBroker: cParties.find(p => p.role === 'BUYER_BROKER')?.name || null,
            commodityName: c.commodityName || 'Unknown',
            amount: c.amount || '0', weight: c.weight || '0', rate: c.rate || '0',
            parties: cParties,
            lines: [{ commodityName: c.commodityName || 'Unknown', amount: c.amount, weightQuintals: c.weight, rate: c.rate }]
          };
          cacheSet(`contracts:${c.id}`, detailItem, TTL);
          return detailItem;
        });
        cacheSet('contracts:list:1:50', enriched, TTL);
      },
    },
    // ── Bills list (with JOIN) ──
    {
      key: 'bills:list:1:50',
      fn: async () => {
        const data = await db.select({
          id: bills.id, billNo: bills.billNo, billDate: bills.billDate,
          partyId: bills.partyId, basis: bills.basis, totalAmount: bills.totalAmount,
          balanceAmount: bills.balanceAmount, creditDays: bills.creditDays,
          createdAt: bills.createdAt, partyName: parties.name,
        })
          .from(bills)
          .leftJoin(parties, eq(parties.id, bills.partyId))
          .orderBy(desc(bills.id)).limit(50);
        
        const billIds = data.map(b => b.id);
        let bLinesMap: Record<number, any[]> = {};
        if (billIds.length > 0) {
          const allLines = await db.select().from(billLines)
            .where(sql`${billLines.billId} IN (${sql.join(billIds.map(id => sql`${id}`), sql`, `)})`);
          for (const line of allLines) {
            if (!bLinesMap[line.billId]) bLinesMap[line.billId] = [];
            bLinesMap[line.billId].push(line);
          }
        }
        
        data.forEach(b => {
           cacheSet(`bills:${b.id}`, { ...b, lines: bLinesMap[b.id] || [] }, TTL);
        });
        cacheSet('bills:list:1:50', data, TTL);
      },
    },
    // ── Deliveries list (with JOIN) ──
    {
      key: 'deliveries:list:1:50',
      fn: async () => {
        const rawDeliveries = await db.select({
          id: deliveries.id, dispatchDate: deliveries.dispatchDate,
          truckNo: deliveries.truckNo, transporterId: deliveries.transporterId,
          status: deliveries.status, createdAt: deliveries.createdAt,
          transporterName: parties.name,
        })
          .from(deliveries)
          .leftJoin(parties, eq(parties.id, deliveries.transporterId))
          .orderBy(desc(deliveries.id)).limit(50);

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
        const enriched = rawDeliveries.map(d => {
          const detail = { ...d, lines: linesMap[d.id] || [] };
          cacheSet(`deliveries:${d.id}`, detail, TTL);
          return detail;
        });
        cacheSet('deliveries:list:1:50', enriched, TTL);
      },
    },
    // ── Payments list (with JOIN) ──
    {
      key: 'payments:list:1:50',
      fn: async () => {
        const rawPayments = await db.select({
          id: payments.id, partyId: payments.partyId, paymentDate: payments.paymentDate,
          instrumentType: payments.instrumentType, instrumentNo: payments.instrumentNo,
          amount: payments.amount, depositedBank: payments.depositedBank,
          createdAt: payments.createdAt, partyName: parties.name,
        })
          .from(payments)
          .leftJoin(parties, eq(parties.id, payments.partyId))
          .orderBy(desc(payments.id)).limit(50);

        const paymentIds = rawPayments.map(p => p.id);
        let allocMap: Record<number, any[]> = {};
        if (paymentIds.length > 0) {
          const allAllocs = await db.select().from(paymentAllocations)
            .where(sql`${paymentAllocations.paymentId} IN (${sql.join(paymentIds.map(id => sql`${id}`), sql`, `)})`);
          for (const alloc of allAllocs) {
            if (!allocMap[alloc.paymentId]) allocMap[alloc.paymentId] = [];
            allocMap[alloc.paymentId].push(alloc);
          }
        }
        const enriched = rawPayments.map(p => {
          const detail = { ...p, allocations: allocMap[p.id] || [] };
          cacheSet(`payments:${p.id}`, detail, TTL);
          return detail;
        });
        cacheSet('payments:list:1:50', enriched, TTL);
      },
    },
    // ── Ledger list (with JOIN) ──
    {
      key: 'ledger:list:1:50:all',
      fn: async () => {
        const data = await db.select({
          id: ledger.id, transactionDate: ledger.transactionDate,
          accountId: ledger.accountId, sourceType: ledger.sourceType,
          sourceId: ledger.sourceId, debit: ledger.debit, credit: ledger.credit,
          narration: ledger.narration, createdAt: ledger.createdAt,
          accountName: parties.name,
        })
          .from(ledger)
          .leftJoin(parties, eq(parties.id, ledger.accountId))
          .orderBy(desc(ledger.id)).limit(50);
        cacheSet('ledger:list:1:50:all', data, TTL);
      },
    },
  ];

  // Run all queries in parallel, skip any already cached
  const promises = tasks.map(async (task) => {
    if (cacheHas(task.key)) {
      skipped.push(task.key);
      return;
    }
    try {
      await task.fn();
      warmed.push(task.key);
    } catch (err) {
      console.error(`Warmup failed for ${task.key}:`, err);
    }
  });

  await Promise.all(promises);
  return { warmed, skipped };
}
