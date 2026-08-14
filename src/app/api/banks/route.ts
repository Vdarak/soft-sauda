/**
 * GET  /api/banks  — List all entries
 * POST /api/banks  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { banks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(banks).orderBy(desc(banks.id));
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
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
