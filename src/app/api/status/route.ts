import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    // Single round-trip: all table counts via one UNION ALL
    const rows = await db.execute(sql`
      SELECT 'parties'     AS t, COUNT(id)::text AS c, COALESCE(MAX(id),0)::text AS m FROM parties
      UNION ALL SELECT 'commodities',  COUNT(id)::text, COALESCE(MAX(id),0)::text FROM commodities
      UNION ALL SELECT 'contracts',    COUNT(id)::text, COALESCE(MAX(id),0)::text FROM contracts
      UNION ALL SELECT 'deliveries',   COUNT(id)::text, COALESCE(MAX(id),0)::text FROM deliveries
      UNION ALL SELECT 'bills',        COUNT(id)::text, COALESCE(MAX(id),0)::text FROM bills
      UNION ALL SELECT 'payments',     COUNT(id)::text, COALESCE(MAX(id),0)::text FROM payments
      UNION ALL SELECT 'ledger',       COUNT(id)::text, COALESCE(MAX(id),0)::text FROM ledger
    `) as { t: string; c: string; m: string }[];

    const checksum = rows.map(r => `${r.t}:${r.c}-${r.m}`).join('|');
    return ok({ checksum });
  } catch (err) {
    console.error('GET /api/status error:', err);
    return serverError('Failed to generate status checksum');
  }
}
