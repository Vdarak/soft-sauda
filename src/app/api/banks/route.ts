/**
 * GET  /api/banks  — List all entries (cached, optimized for 49k records)
 * POST /api/banks  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { banks } from "@/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const all = searchParams.get('all') === 'true' || searchParams.get('limit') === 'all';
    const forceRefresh = searchParams.get('fresh') === '1' || searchParams.get('forceRefresh') === 'true';

    // If requesting all banks for Bank Master view
    if (all && !q) {
      const cacheKey = 'banks:list:all';
      if (!forceRefresh) {
        const cached = cacheGet<any[]>(cacheKey);
        if (cached) return ok(cached);
      }

      // Select lightweight list payload (id, bankName, branch, ifscCode, center)
      const records = await db.select({
        id: banks.id,
        bankName: banks.bankName,
        branch: banks.branch,
        ifscCode: banks.ifscCode,
        center: banks.center
      }).from(banks).orderBy(banks.bankName);

      cacheSet(cacheKey, records, 600);
      return ok(records);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    if (q) {
      const searchPattern = `%${q}%`;
      const records = await db.select().from(banks)
        .where(
          or(
            ilike(banks.bankName, searchPattern),
            ilike(banks.branch, searchPattern),
            ilike(banks.ifscCode, searchPattern),
            ilike(banks.center, searchPattern)
          )
        )
        .orderBy(desc(banks.id))
        .limit(limit)
        .offset(offset);
      return ok(records);
    }

    const records = await db.select().from(banks).orderBy(desc(banks.id)).limit(limit).offset(offset);
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.bankName) {
      return badRequest("Missing required field 'bankName'");
    }
    const [inserted] = await db.insert(banks).values(body).returning();
    cacheInvalidate('banks');
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
