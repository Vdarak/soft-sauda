import { NextRequest } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { ok, serverError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const tables = [
      'parties', 
      'commodities', 
      'contracts', 
      'deliveries', 
      'bills', 
      'payments', 
      'ledger'
    ];
    
    // Build a deterministic checksum from COUNT and MAX(id) of all core tables
    let hashString = '';
    
    for (const tbl of tables) {
      const res = await db.execute(sql.raw(`SELECT COUNT(id) as c, MAX(id) as m FROM ${tbl}`));
      const row = res.rows[0] as { c: string | number, m: string | number | null };
      hashString += `${tbl}:${row.c}-${row.m || 0}|`;
    }

    // A simple checksum string that will change if any item is created or deleted
    return ok({ checksum: hashString });
  } catch (err) {
    console.error('GET /api/status error:', err);
    return serverError('Failed to generate status checksum');
  }
}
