/**
 * Cache Warmup — Pre-fetches ALL data in parallel for every navigation section.
 *
 * Called on login (awaited) and via GET /api/warmup.
 * Returns a unified `payload` object that is sent to the client and stored in
 * sessionStorage + clientCache, making every subsequent page navigation instant
 * (zero network requests — all data is already in the browser's RAM).
 *
 * Each entity is fetched without a row limit so that pagination through the
 * full dataset (parties, contracts, etc.) is always served from cache.
 * The `paginateIntoPayload` helper pre-slices the full array into 50-row
 * page keys that match exactly what the list views request.
 */

import { db } from '@/db';
import {
  parties, commodities, contracts, contractParties, contractLines,
  deliveries, deliveryLines, bills, billLines, payments, paymentAllocations, ledger,
  cities, districts, states,
} from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { cacheSet, cacheHas, cacheGet, DEFAULT_TTL } from '@/lib/cache';

const PAGE_SIZE = 50;

/**
 * Slice `all` into PAGE_SIZE chunks and write each chunk into the payload
 * under the exact URL key the list views use: `/<entity>?page=N&limit=50`.
 */
function paginateIntoPayload(entity: string, all: any[], payload: Record<string, any>): void {
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  for (let p = 1; p <= totalPages; p++) {
    payload[`/${entity}?page=${p}&limit=${PAGE_SIZE}`] = all.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  }
}

/**
 * Populate server-side cache with paginated slices (useful in long-lived processes / dev).
 * `keySuffix` is appended after the page/limit, e.g. ':all' for ledger.
 */
function paginateIntoCache(entity: string, all: any[], ttl: number, keySuffix = ''): void {
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  for (let p = 1; p <= totalPages; p++) {
    cacheSet(`${entity}:list:${p}:${PAGE_SIZE}${keySuffix}`, all.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), ttl);
  }
}

/** Run all warmup queries in parallel. Safe to call multiple times. */
export async function warmCache(): Promise<{ payload: Record<string, any>, warmed: string[]; skipped: string[] }> {
  const warmed: string[] = [];
  const skipped: string[] = [];
  const payload: Record<string, any> = {};
  const TTL = DEFAULT_TTL;

  type Task = { key: string; fn: () => Promise<void>; payloadFn: () => void };

  const tasks: Task[] = [
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
        const metrics = {
          parties: Number(partyCount.count),
          contracts: Number(contractCount.count),
          deliveries: Number(deliveryCount.count),
          bills: Number(billCount.count),
          payments: Number(paymentCount.count),
          outstandingBalance: parseFloat(outstanding.total as string) || 0,
        };
        cacheSet('dashboard:metrics', metrics, TTL);
        payload['/dashboard'] = metrics;
      },
      payloadFn: () => { payload['/dashboard'] = cacheGet('dashboard:metrics'); },
    },

    // ── Parties — ALL records, pre-paginated ──
    {
      key: 'parties:all',
      fn: async () => {
        const all = await db.select().from(parties).orderBy(desc(parties.id));
        cacheSet('parties:all', all, TTL);
        paginateIntoCache('parties', all, TTL);
        all.forEach(p => cacheSet(`parties:${p.id}`, p, TTL));
        paginateIntoPayload('parties', all, payload);
        payload['/parties'] = all; // full list — used by autocomplete local filtering
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('parties:all') || [];
        paginateIntoPayload('parties', all, payload);
        payload['/parties'] = all;
      },
    },

    // ── Commodities — ALL records ──
    {
      key: 'commodities:all',
      fn: async () => {
        const all = await db.select().from(commodities).orderBy(desc(commodities.id));
        cacheSet('commodities:all', all, TTL);
        paginateIntoCache('commodities', all, TTL);
        all.forEach(c => cacheSet(`commodities:${c.id}`, c, TTL));
        paginateIntoPayload('commodities', all, payload);
        payload['/commodities'] = all; // full list — used by autocomplete local filtering
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('commodities:all') || [];
        paginateIntoPayload('commodities', all, payload);
        payload['/commodities'] = all;
      },
    },

    // ── Contracts — ALL records (with JOINs) ──
    {
      key: 'contracts:all',
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
          .orderBy(desc(contracts.saudaNo));

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
          const item = {
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
            lines: [{ commodityName: c.commodityName || 'Unknown', amount: c.amount, weightQuintals: c.weight, rate: c.rate }],
          };
          cacheSet(`contracts:${c.id}`, item, TTL);
          return item;
        });
        cacheSet('contracts:all', enriched, TTL);
        paginateIntoCache('contracts', enriched, TTL);
        paginateIntoPayload('contracts', enriched, payload);
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('contracts:all') || [];
        paginateIntoPayload('contracts', all, payload);
      },
    },

    // ── Bills — ALL records (with JOIN + lines) ──
    {
      key: 'bills:all',
      fn: async () => {
        const data = await db.select({
          id: bills.id, billNo: bills.billNo, billDate: bills.billDate,
          partyId: bills.partyId, basis: bills.basis, totalAmount: bills.totalAmount,
          balanceAmount: bills.balanceAmount, creditDays: bills.creditDays,
          createdAt: bills.createdAt, partyName: parties.name,
        })
          .from(bills)
          .leftJoin(parties, eq(parties.id, bills.partyId))
          .orderBy(desc(bills.id));

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
        data.forEach(b => { cacheSet(`bills:${b.id}`, { ...b, lines: bLinesMap[b.id] || [] }, TTL); });
        cacheSet('bills:all', data, TTL);
        paginateIntoCache('bills', data, TTL);
        paginateIntoPayload('bills', data, payload);
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('bills:all') || [];
        paginateIntoPayload('bills', all, payload);
      },
    },

    // ── Deliveries — ALL records (with JOIN + lines) ──
    {
      key: 'deliveries:all',
      fn: async () => {
        const rawDeliveries = await db.select({
          id: deliveries.id, dispatchDate: deliveries.dispatchDate,
          truckNo: deliveries.truckNo, transporterId: deliveries.transporterId,
          status: deliveries.status, createdAt: deliveries.createdAt,
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
        const enriched = rawDeliveries.map(d => {
          const detail = { ...d, lines: linesMap[d.id] || [] };
          cacheSet(`deliveries:${d.id}`, detail, TTL);
          return detail;
        });
        cacheSet('deliveries:all', enriched, TTL);
        paginateIntoCache('deliveries', enriched, TTL);
        paginateIntoPayload('deliveries', enriched, payload);
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('deliveries:all') || [];
        paginateIntoPayload('deliveries', all, payload);
      },
    },

    // ── Payments — ALL records (with JOIN + allocations) ──
    {
      key: 'payments:all',
      fn: async () => {
        const rawPayments = await db.select({
          id: payments.id, partyId: payments.partyId, paymentDate: payments.paymentDate,
          instrumentType: payments.instrumentType, instrumentNo: payments.instrumentNo,
          amount: payments.amount, depositedBank: payments.depositedBank,
          createdAt: payments.createdAt, partyName: parties.name,
        })
          .from(payments)
          .leftJoin(parties, eq(parties.id, payments.partyId))
          .orderBy(desc(payments.id));

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
        cacheSet('payments:all', enriched, TTL);
        paginateIntoCache('payments', enriched, TTL);
        paginateIntoPayload('payments', enriched, payload);
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('payments:all') || [];
        paginateIntoPayload('payments', all, payload);
      },
    },

    // ── Ledger — ALL records (with account JOIN) ──
    {
      key: 'ledger:all',
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
          .orderBy(desc(ledger.id));

        // Pre-populate per-account cache slices (for ledger filtered by party)
        const byAccount: Record<number, any[]> = {};
        for (const entry of data) {
          if (entry.accountId) {
            if (!byAccount[entry.accountId]) byAccount[entry.accountId] = [];
            byAccount[entry.accountId].push(entry);
          }
        }
        for (const [accountId, entries] of Object.entries(byAccount)) {
          cacheSet(`ledger:list:1:${PAGE_SIZE}:${accountId}`, entries.slice(0, PAGE_SIZE), TTL);
        }

        cacheSet('ledger:all', data, TTL);
        // Ledger route cache key has ':all' suffix when no accountId filter
        paginateIntoCache('ledger', data, TTL, ':all');
        paginateIntoPayload('ledger', data, payload);
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('ledger:all') || [];
        paginateIntoPayload('ledger', all, payload);
      },
    },

    // ── Cities — full list (with district + state JOIN) ──
    {
      key: 'cities:all',
      fn: async () => {
        const data = await db.select({
          id: cities.id,
          name: cities.name,
          pincode: cities.pincode,
          districtId: cities.districtId,
          districtName: districts.name,
          stateId: districts.stateId,
          stateName: states.name,
        })
          .from(cities)
          .leftJoin(districts, eq(districts.id, cities.districtId))
          .leftJoin(states, eq(states.id, districts.stateId))
          .orderBy(cities.name);
        cacheSet('cities:all', data, TTL);
        payload['/cities'] = data;
      },
      payloadFn: () => { payload['/cities'] = cacheGet<any[]>('cities:all') || []; },
    },
  ];

  // Run all queries in parallel. Skip tasks whose primary key is already in the
  // server-side cache (warm server process in dev). For skipped tasks, rebuild
  // the payload from the cached data so the client still gets a complete payload.
  const promises = tasks.map(async (task) => {
    if (!cacheHas(task.key)) {
      try {
        await task.fn();
        warmed.push(task.key);
      } catch (err) {
        console.error(`Warmup failed for ${task.key}:`, err);
      }
    } else {
      skipped.push(task.key);
      task.payloadFn();
    }
  });

  await Promise.all(promises);
  return { payload, warmed, skipped };
}
