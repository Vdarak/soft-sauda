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
  parties, partyTaxIds, partyBankDetails, partyContacts, partyDeliveryAddresses, partyRoles,
  commodities, commodityPackaging, commoditySpecifications,
  contracts, contractParties, contractLines,
  deliveries, deliveryLines, deliveryCharges,
  bills, billLines, payments, paymentAllocations, ledger,
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
        const rawParties = await db.select().from(parties).orderBy(desc(parties.id));
        const partyIds = rawParties.map(p => p.id);

        let taxMap: Record<number, any[]> = {};
        let bankMap: Record<number, any[]> = {};
        let contactsMap: Record<number, any[]> = {};
        let addressesMap: Record<number, any[]> = {};
        let rolesMap: Record<number, any[]> = {};

        if (partyIds.length > 0) {
          const [taxRows, bankRows, contactRows, addressRows, roleRows] = await Promise.all([
            db.select().from(partyTaxIds).where(sql`${partyTaxIds.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(partyBankDetails).where(sql`${partyBankDetails.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(partyContacts).where(sql`${partyContacts.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(partyDeliveryAddresses).where(sql`${partyDeliveryAddresses.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(partyRoles).where(sql`${partyRoles.partyId} IN (${sql.join(partyIds.map(id => sql`${id}`), sql`, `)})`),
          ]);

          for (const row of taxRows) {
            if (!taxMap[row.partyId]) taxMap[row.partyId] = [];
            taxMap[row.partyId].push(row);
          }
          for (const row of bankRows) {
            if (!bankMap[row.partyId]) bankMap[row.partyId] = [];
            bankMap[row.partyId].push(row);
          }
          for (const row of contactRows) {
            if (!contactsMap[row.partyId]) contactsMap[row.partyId] = [];
            contactsMap[row.partyId].push(row);
          }
          for (const row of addressRows) {
            if (!addressesMap[row.partyId]) addressesMap[row.partyId] = [];
            addressesMap[row.partyId].push(row);
          }
          for (const row of roleRows) {
            if (!rolesMap[row.partyId]) rolesMap[row.partyId] = [];
            rolesMap[row.partyId].push(row);
          }
        }

        const all = rawParties.map(p => {
          const detail = {
            ...p,
            taxIds: taxMap[p.id] || [],
            bankDetails: bankMap[p.id] || [],
            contacts: contactsMap[p.id] || [],
            deliveryAddresses: addressesMap[p.id] || [],
            roles: rolesMap[p.id] || [],
          };
          cacheSet(`parties:${p.id}`, detail, TTL);
          return detail;
        });

        cacheSet('parties:all', all, TTL);
        paginateIntoCache('parties', all, TTL);
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
        const rawCommodities = await db.select().from(commodities).orderBy(desc(commodities.id));
        const commIds = rawCommodities.map(c => c.id);

        let packagingMap: Record<number, any[]> = {};
        let specsMap: Record<number, any[]> = {};

        if (commIds.length > 0) {
          const [packRows, specRows] = await Promise.all([
            db.select().from(commodityPackaging).where(sql`${commodityPackaging.commodityId} IN (${sql.join(commIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(commoditySpecifications).where(sql`${commoditySpecifications.commodityId} IN (${sql.join(commIds.map(id => sql`${id}`), sql`, `)})`),
          ]);

          for (const row of packRows) {
            if (!packagingMap[row.commodityId]) packagingMap[row.commodityId] = [];
            packagingMap[row.commodityId].push(row);
          }
          for (const row of specRows) {
            if (!specsMap[row.commodityId]) specsMap[row.commodityId] = [];
            specsMap[row.commodityId].push(row);
          }
        }

        const all = rawCommodities.map(c => {
          const detail = {
            ...c,
            packaging: packagingMap[c.id] || [],
            specifications: specsMap[c.id] || [],
          };
          cacheSet(`commodities:${c.id}`, detail, TTL);
          return detail;
        });

        cacheSet('commodities:all', all, TTL);
        paginateIntoCache('commodities', all, TTL);
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
          id: contracts.id,
          saudaNo: contracts.saudaNo,
          saudaBook: contracts.saudaBook,
          saudaPrefix: contracts.saudaPrefix,
          saudaDate: contracts.saudaDate,
          deliveryTerm: contracts.deliveryTerm,
          paymentTermType: contracts.paymentTermType,
          paymentPercent: contracts.paymentPercent,
          paymentDays: contracts.paymentDays,
          deliveryDeadlineDate: contracts.deliveryDeadlineDate,
          approxWeight: contracts.approxWeight,
          quantityTolerance: contracts.quantityTolerance,
          originStation: contracts.originStation,
          destinationStation: contracts.destinationStation,
          taxFormRequired: contracts.taxFormRequired,
          poNumber: contracts.poNumber,
          poDate: contracts.poDate,
          termsAndConditions: contracts.termsAndConditions,
          customRemarks: contracts.customRemarks,
          createdAt: contracts.createdAt,
          updatedAt: contracts.updatedAt,
          contractLineId: contractLines.id,
          commodityId: contractLines.commodityId,
          brand: contractLines.brand,
          numberOfLorries: contractLines.numberOfLorries,
          quantityBags: contractLines.quantityBags,
          weightQuintals: contractLines.weightQuintals,
          rate: contractLines.rate,
          amount: contractLines.amount,
          commodityName: commodities.name,
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

        const contractMap = new Map<number, any>();
        for (const c of rawContracts) {
          if (!contractMap.has(c.id)) {
            const cParties = partyMap[c.id] || [];
            contractMap.set(c.id, {
              id: c.id,
              saudaNo: c.saudaNo,
              saudaBook: c.saudaBook,
              saudaPrefix: c.saudaPrefix,
              saudaDate: c.saudaDate,
              deliveryTerm: c.deliveryTerm,
              paymentTermType: c.paymentTermType,
              paymentPercent: c.paymentPercent,
              paymentDays: c.paymentDays,
              deliveryDeadlineDate: c.deliveryDeadlineDate,
              approxWeight: c.approxWeight,
              quantityTolerance: c.quantityTolerance,
              originStation: c.originStation,
              destinationStation: c.destinationStation,
              taxFormRequired: c.taxFormRequired,
              poNumber: c.poNumber,
              poDate: c.poDate,
              termsAndConditions: c.termsAndConditions,
              customRemarks: c.customRemarks,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
              sellerName: cParties.find(p => p.role === 'SELLER')?.name || null,
              buyerName: cParties.find(p => p.role === 'BUYER')?.name || null,
              sellerBroker: cParties.find(p => p.role === 'SELLER_BROKER')?.name || null,
              buyerBroker: cParties.find(p => p.role === 'BUYER_BROKER')?.name || null,
              parties: cParties,
              lines: [],
            });
          }
          const item = contractMap.get(c.id);
          if (c.commodityName) {
            item.lines.push({
              id: c.contractLineId,
              commodityId: c.commodityId,
              commodityName: c.commodityName,
              brand: c.brand,
              numberOfLorries: c.numberOfLorries,
              quantityBags: c.quantityBags,
              weightQuintals: c.weightQuintals,
              rate: c.rate,
              amount: c.amount,
            });
          }
        }

        const enriched = Array.from(contractMap.values());
        enriched.forEach(item => {
          if (item.lines.length > 0) {
            item.commodityName = item.lines[0].commodityName;
            item.amount = item.lines[0].amount;
            item.weight = item.lines[0].weightQuintals;
            item.rate = item.lines[0].rate;
          } else {
            item.commodityName = 'Unknown';
            item.amount = '0';
            item.weight = '0';
            item.rate = '0';
          }
          cacheSet(`contracts:${item.id}`, item, TTL);
        });
        cacheSet('contracts:all', enriched, TTL);
        paginateIntoCache('contracts', enriched, TTL);
        paginateIntoPayload('contracts', enriched, payload);
        payload['/contracts'] = enriched;
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('contracts:all') || [];
        paginateIntoPayload('contracts', all, payload);
        payload['/contracts'] = all;
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
        payload['/bills'] = data;
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('bills:all') || [];
        paginateIntoPayload('bills', all, payload);
        payload['/bills'] = all;
      },
    },

    // ── Deliveries — ALL records (with JOIN + lines) ──
    {
      key: 'deliveries:all',
      fn: async () => {
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
          transporterName: parties.name,
        })
          .from(deliveries)
          .leftJoin(parties, eq(parties.id, deliveries.transporterId))
          .orderBy(desc(deliveries.id));

        const deliveryIds = rawDeliveries.map(d => d.id);
        let linesMap: Record<number, any[]> = {};
        let chargesMap: Record<number, any[]> = {};

        if (deliveryIds.length > 0) {
          const [allLines, allCharges] = await Promise.all([
            db.select().from(deliveryLines).where(sql`${deliveryLines.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`),
            db.select().from(deliveryCharges).where(sql`${deliveryCharges.deliveryId} IN (${sql.join(deliveryIds.map(id => sql`${id}`), sql`, `)})`),
          ]);

          // Enrich lines with commodityName, saudaNo, saudaDate, rate in memory
          const contractLineIds = [...new Set(allLines.map(l => l.contractLineId))];
          let contractLineMap: Record<number, any> = {};
          if (contractLineIds.length > 0) {
            const clRows = await db.select({
              id: contractLines.id,
              contractId: contractLines.contractId,
              commodityId: contractLines.commodityId,
              rate: contractLines.rate,
              saudaNo: contracts.saudaNo,
              saudaDate: contracts.saudaDate,
              commodityName: commodities.name,
            })
              .from(contractLines)
              .leftJoin(contracts, eq(contracts.id, contractLines.contractId))
              .leftJoin(commodities, eq(commodities.id, contractLines.commodityId))
              .where(sql`${contractLines.id} IN (${sql.join(contractLineIds.map(id => sql`${id}`), sql`, `)})`);
            
            for (const cl of clRows) {
              contractLineMap[cl.id] = cl;
            }
          }

          for (const line of allLines) {
            const cl = contractLineMap[line.contractLineId];
            if (cl) {
              (line as any).commodityName = cl.commodityName || 'Unknown';
              (line as any).rate = cl.rate;
              (line as any).saudaNo = cl.saudaNo;
              (line as any).saudaDate = cl.saudaDate;
            }
            if (!linesMap[line.deliveryId]) linesMap[line.deliveryId] = [];
            linesMap[line.deliveryId].push(line);
          }

          for (const charge of allCharges) {
            if (!chargesMap[charge.deliveryId]) chargesMap[charge.deliveryId] = [];
            chargesMap[charge.deliveryId].push(charge);
          }
        }

        const enriched = rawDeliveries.map(d => {
          const lines = linesMap[d.id] || [];
          const charges = chargesMap[d.id] || [];
          const firstLine = lines[0] || {};
          const detail = {
            ...d,
            lines,
            charges,
            saudaNo: firstLine.saudaNo || null,
            saudaDate: firstLine.saudaDate || null,
            dispatchNo: d.id,
          };
          cacheSet(`deliveries:${d.id}`, detail, TTL);
          return detail;
        });

        cacheSet('deliveries:all', enriched, TTL);
        paginateIntoCache('deliveries', enriched, TTL);
        paginateIntoPayload('deliveries', enriched, payload);
        payload['/deliveries'] = enriched;
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('deliveries:all') || [];
        paginateIntoPayload('deliveries', all, payload);
        payload['/deliveries'] = all;
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
        payload['/payments'] = enriched;
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('payments:all') || [];
        paginateIntoPayload('payments', all, payload);
        payload['/payments'] = all;
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
        payload['/ledger'] = data;
      },
      payloadFn: () => {
        const all = cacheGet<any[]>('ledger:all') || [];
        paginateIntoPayload('ledger', all, payload);
        payload['/ledger'] = all;
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

    // ── Report: Bill Register (sortBy=date) ──
    {
      key: 'reports:bill-register:date',
      fn: async () => {
        const rows = await db.select({
          id: bills.id,
          billNo: bills.billNo,
          billDate: bills.billDate,
          basis: bills.basis,
          totalAmount: bills.totalAmount,
          balanceAmount: bills.balanceAmount,
          partyName: parties.name,
          place: parties.place,
          stateName: parties.stateName,
          designation: parties.designation,
        })
        .from(bills)
        .innerJoin(parties, eq(parties.id, bills.partyId))
        .orderBy(desc(bills.billDate));
        cacheSet('reports:bill-register:date', rows, TTL);
        payload['/reports/bill-register?sortBy=date'] = rows;
      },
      payloadFn: () => { payload['/reports/bill-register?sortBy=date'] = cacheGet<any[]>('reports:bill-register:date') || []; },
    },

    // ── Report: Payment Outstanding ──
    {
      key: 'reports:payment-outstanding',
      fn: async () => {
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
        .where(sql`balance_amount::numeric > 0`)
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
        cacheSet('reports:payment-outstanding', enriched, TTL);
        payload['/reports/payment-outstanding'] = enriched;
      },
      payloadFn: () => { payload['/reports/payment-outstanding'] = cacheGet<any[]>('reports:payment-outstanding') || []; },
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
