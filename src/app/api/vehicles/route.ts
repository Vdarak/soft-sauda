/**
 * GET  /api/vehicles  — List all entries
 * POST /api/vehicles  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(vehicles).orderBy(desc(vehicles.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.vehicleType) {
      return badRequest("Missing required field 'vehicleType'");
    }
    const [inserted] = await db.insert(vehicles).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
