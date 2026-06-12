import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { ok, serverError, unauthorized } from '@/lib/api-helpers';
import { getRequestContext } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  try {
    const ctx = await getRequestContext(req);
    if (!ctx) return unauthorized();

    const { companyId, fiscalYearId } = ctx;

    // Scoped checksum generation: parties and commodities are global, other transactional tables are scoped
    const rows = await db.execute(sql`
      SELECT 'parties'     AS t, COUNT(id)::text AS c, COALESCE(MAX(id),0)::text AS m FROM parties
      UNION ALL SELECT 'commodities',  COUNT(id)::text, COALESCE(MAX(id),0)::text FROM commodities
      UNION ALL SELECT 'contracts',    COUNT(id)::text, COALESCE(MAX(id),0)::text FROM contracts WHERE company_id = ${companyId} AND fiscal_year_id = ${fiscalYearId}
      UNION ALL SELECT 'deliveries',   COUNT(id)::text, COALESCE(MAX(id),0)::text FROM deliveries WHERE company_id = ${companyId} AND fiscal_year_id = ${fiscalYearId}
      UNION ALL SELECT 'bills',        COUNT(id)::text, COALESCE(MAX(id),0)::text FROM bills WHERE company_id = ${companyId} AND fiscal_year_id = ${fiscalYearId}
      UNION ALL SELECT 'payments',     COUNT(id)::text, COALESCE(MAX(id),0)::text FROM payments WHERE company_id = ${companyId} AND fiscal_year_id = ${fiscalYearId}
      UNION ALL SELECT 'ledger',       COUNT(id)::text, COALESCE(MAX(id),0)::text FROM ledger WHERE company_id = ${companyId} AND fiscal_year_id = ${fiscalYearId}
    `) as { t: string; c: string; m: string }[];

    const checksum = rows.map(r => `${r.t}:${r.c}-${r.m}`).join('|');
    return ok({ checksum });
  } catch (err) {
    console.error('GET /api/status error:', err);
    return serverError('Failed to generate status checksum');
  }
}
