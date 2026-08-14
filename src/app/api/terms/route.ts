/**
 * GET  /api/terms  — List all entries
 * POST /api/terms  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { termsConditions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(termsConditions).orderBy(desc(termsConditions.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.termText) {
      return badRequest("Missing required field 'termText'");
    }
    const [inserted] = await db.insert(termsConditions).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
