/**
 * GET  /api/couriers  — List all entries
 * POST /api/couriers  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { couriers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(couriers).orderBy(desc(couriers.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.name) {
      return badRequest("Missing required field 'name'");
    }
    const [inserted] = await db.insert(couriers).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
