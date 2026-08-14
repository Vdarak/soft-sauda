/**
 * GET  /api/narrations  — List all entries
 * POST /api/narrations  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { narrationTemplates } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(narrationTemplates).orderBy(desc(narrationTemplates.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.templateText) {
      return badRequest("Missing required field 'templateText'");
    }
    const [inserted] = await db.insert(narrationTemplates).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
