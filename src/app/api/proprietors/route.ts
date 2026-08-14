/**
 * GET  /api/proprietors  — List all entries
 * POST /api/proprietors  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { proprietors } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(proprietors).orderBy(desc(proprietors.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.firmName) {
      return badRequest("Missing required field 'firmName'");
    }
    const [inserted] = await db.insert(proprietors).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
