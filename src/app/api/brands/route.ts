/**
 * GET  /api/brands  — List all entries
 * POST /api/brands  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(brands).orderBy(desc(brands.id));
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
    const [inserted] = await db.insert(brands).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
