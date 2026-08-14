/**
 * GET    /api/account-groups/[id] — Get single entry
 * PUT    /api/account-groups/[id] — Update entry
 * DELETE /api/account-groups/[id] — Delete entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { accountGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, badRequest, notFound, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return badRequest("Invalid ID");
    const [record] = await db.select().from(accountGroups).where(eq(accountGroups.id, numId)).limit(1);
    if (!record) return notFound("account-groups entry not found");
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
    const [updated] = await db.update(accountGroups).set(body).where(eq(accountGroups.id, numId)).returning();
    if (!updated) return notFound("account-groups entry not found");
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
    const [deleted] = await db.delete(accountGroups).where(eq(accountGroups.id, numId)).returning();
    if (!deleted) return notFound("account-groups entry not found");
    return ok({ success: true, deletedId: numId });
  } catch (err: any) {
    return serverError(err.message);
  }
}
