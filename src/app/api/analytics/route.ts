import { NextRequest } from 'next/server';
import { db } from '@/db';
import { bills, contracts, contractLines, contractParties, parties, commodities, fiscalYears } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;

    // 1. Monthly Revenue (total amount of bills per month in the FY)
    const monthlyRevRows = await db.select({
      monthNum: sql<number>`EXTRACT(MONTH FROM ${bills.billDate})`,
      yearNum: sql<number>`EXTRACT(YEAR FROM ${bills.billDate})`,
      total: sql<string>`SUM(${bills.totalAmount}::numeric)`,
    })
      .from(bills)
      .where(and(eq(bills.companyId, companyId), eq(bills.fiscalYearId, fiscalYearId)))
      .groupBy(sql`EXTRACT(MONTH FROM ${bills.billDate})`, sql`EXTRACT(YEAR FROM ${bills.billDate})`);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Map and sort monthly revenue by date
    const monthlyRevenue = monthlyRevRows.map(row => {
      const mIdx = Math.floor(row.monthNum) - 1;
      return {
        label: `${months[mIdx]} ${row.yearNum}`,
        amount: parseFloat(row.total) || 0,
        sortKey: Number(row.yearNum) * 100 + Number(row.monthNum),
      };
    }).sort((a, b) => a.sortKey - b.sortKey);

    // 2. Commodity Volume (weight & amount per commodity)
    const commodityVolRows = await db.select({
      name: commodities.name,
      weight: sql<string>`SUM(${contractLines.weightQuintals}::numeric)`,
      amount: sql<string>`SUM(${contractLines.amount}::numeric)`,
    })
      .from(contractLines)
      .leftJoin(contracts, eq(contractLines.contractId, contracts.id))
      .leftJoin(commodities, eq(contractLines.commodityId, commodities.id))
      .where(and(eq(contracts.companyId, companyId), eq(contracts.fiscalYearId, fiscalYearId)))
      .groupBy(commodities.name);

    const commodityVolume = commodityVolRows.map(row => ({
      commodity: row.name || 'Unknown',
      weight: parseFloat(row.weight) || 0,
      amount: parseFloat(row.amount) || 0,
    })).sort((a, b) => b.amount - a.amount);

    // 3. Top Buyers (parties mapped as BUYER in contracts)
    const topBuyerRows = await db.select({
      name: parties.name,
      amount: sql<string>`SUM(${contractLines.amount}::numeric)`,
    })
      .from(contractParties)
      .leftJoin(contracts, eq(contractParties.contractId, contracts.id))
      .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
      .leftJoin(parties, eq(contractParties.partyId, parties.id))
      .where(
        and(
          eq(contracts.companyId, companyId),
          eq(contracts.fiscalYearId, fiscalYearId),
          eq(contractParties.role, 'BUYER')
        )
      )
      .groupBy(parties.name)
      .orderBy(desc(sql`SUM(${contractLines.amount}::numeric)`))
      .limit(5);

    // 4. Top Sellers
    const topSellerRows = await db.select({
      name: parties.name,
      amount: sql<string>`SUM(${contractLines.amount}::numeric)`,
    })
      .from(contractParties)
      .leftJoin(contracts, eq(contractParties.contractId, contracts.id))
      .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
      .leftJoin(parties, eq(contractParties.partyId, parties.id))
      .where(
        and(
          eq(contracts.companyId, companyId),
          eq(contracts.fiscalYearId, fiscalYearId),
          eq(contractParties.role, 'SELLER')
        )
      )
      .groupBy(parties.name)
      .orderBy(desc(sql`SUM(${contractLines.amount}::numeric)`))
      .limit(5);

    // 5. Outstanding Aging (based on current date 2026-06-11)
    const referenceDate = new Date('2026-06-11');
    const outstandingBills = await db.select({
      id: bills.id,
      billNo: bills.billNo,
      billDate: bills.billDate,
      balanceAmount: bills.balanceAmount,
      partyName: parties.name,
    })
      .from(bills)
      .leftJoin(parties, eq(bills.partyId, parties.id))
      .where(
        and(
          eq(bills.companyId, companyId),
          eq(bills.fiscalYearId, fiscalYearId),
          sql`${bills.balanceAmount}::numeric > 0`
        )
      );

    const aging = {
      bracket30: 0, // 0-30 days
      bracket60: 0, // 31-60 days
      bracket90: 0, // 61-90 days
      bracketOver: 0, // 90+ days
    };

    outstandingBills.forEach(b => {
      const bDate = new Date(b.billDate);
      const diffTime = Math.abs(referenceDate.getTime() - bDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const bal = parseFloat(b.balanceAmount) || 0;

      if (diffDays <= 30) aging.bracket30 += bal;
      else if (diffDays <= 60) aging.bracket60 += bal;
      else if (diffDays <= 90) aging.bracket90 += bal;
      else aging.bracketOver += bal;
    });

    // 6. Year-over-Year comparison (totals by FY for this company)
    const fyCompareRows = await db.select({
      fyLabel: fiscalYears.label,
      contractsTotal: sql<string>`COALESCE(SUM(${contractLines.amount}::numeric), 0)`,
      billsTotal: sql<string>`COALESCE(SUM(${bills.totalAmount}::numeric), 0)`,
    })
      .from(fiscalYears)
      .leftJoin(contracts, eq(contracts.fiscalYearId, fiscalYears.id))
      .leftJoin(contractLines, eq(contractLines.contractId, contracts.id))
      .leftJoin(bills, eq(bills.fiscalYearId, fiscalYears.id))
      .where(eq(fiscalYears.companyId, companyId))
      .groupBy(fiscalYears.label)
      .orderBy(fiscalYears.label);

    const fyCompare = fyCompareRows.map(row => ({
      fy: row.fyLabel,
      contracts: parseFloat(row.contractsTotal) || 0,
      bills: parseFloat(row.billsTotal) || 0,
    }));

    return ok({
      monthlyRevenue,
      commodityVolume,
      topBuyers: topBuyerRows.map(r => ({ name: r.name || 'Unknown', amount: parseFloat(r.amount) || 0 })),
      topSellers: topSellerRows.map(r => ({ name: r.name || 'Unknown', amount: parseFloat(r.amount) || 0 })),
      aging,
      fyCompare,
    });
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return serverError('Failed to generate business analytics');
  }
}
