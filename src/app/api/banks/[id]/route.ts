/**
 * GET    /api/banks/[id] — Get single entry
 * PUT    /api/banks/[id] — Update entry
 * DELETE /api/banks/[id] — Delete entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { banks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, badRequest, notFound, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return badRequest("Invalid ID");
    const [record] = await db.select().from(banks).where(eq(banks.id, numId)).limit(1);
    if (!record) return notFound("banks entry not found");
    return ok(record);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return badRequest("Invalid ID");
    const body: any = await parseBody(req);
    if (!body) return badRequest("Missing request body");
    const [updated] = await db.update(banks).set(body).where(eq(banks.id, numId)).returning();
    if (!updated) return notFound("banks entry not found");
    return ok(updated);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return badRequest("Invalid ID");
    const [deleted] = await db.delete(banks).where(eq(banks.id, numId)).returning();
    if (!deleted) return notFound("banks entry not found");
    return ok({ success: true, deletedId: numId });
  } catch (err: any) {
    return serverError(err.message);
  }
}
