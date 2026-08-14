import fs from 'fs';
import path from 'path';

const masters = [
  { folder: "banks", table: "banks", nameField: "bankName" },
  { folder: "brands", table: "brands", nameField: "name" },
  { folder: "expense-heads", table: "expenseHeads", nameField: "name" },
  { folder: "account-groups", table: "accountGroups", nameField: "name" },
  { folder: "narrations", table: "narrationTemplates", nameField: "templateText" },
  { folder: "terms", table: "termsConditions", nameField: "termText" },
  { folder: "transporters", table: "transporters", nameField: "name" },
  { folder: "vehicles", table: "vehicles", nameField: "vehicleType" },
  { folder: "couriers", table: "couriers", nameField: "name" },
  { folder: "proprietors", table: "proprietors", nameField: "firmName" }
];

masters.forEach(m => {
  const dir = path.join(process.cwd(), "src/app/api", m.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const routeContent = `/**
 * GET  /api/${m.folder}  — List all entries
 * POST /api/${m.folder}  — Create entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { ${m.table} } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ok, created, badRequest, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const records = await db.select().from(${m.table}).orderBy(desc(${m.table}.id));
    return ok(records);
  } catch (err: any) {
    return serverError(err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await parseBody(req);
    if (!body || !body.${m.nameField}) {
      return badRequest("Missing required field '${m.nameField}'");
    }
    const [inserted] = await db.insert(${m.table}).values(body).returning();
    return created(inserted);
  } catch (err: any) {
    return serverError(err.message);
  }
}
`;
  fs.writeFileSync(path.join(dir, "route.ts"), routeContent);

  const idDir = path.join(dir, "[id]");
  if (!fs.existsSync(idDir)) fs.mkdirSync(idDir, { recursive: true });

  const idRouteContent = `/**
 * GET    /api/${m.folder}/[id] — Get single entry
 * PUT    /api/${m.folder}/[id] — Update entry
 * DELETE /api/${m.folder}/[id] — Delete entry
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { ${m.table} } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, badRequest, notFound, serverError, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return badRequest("Invalid ID");
    const [record] = await db.select().from(${m.table}).where(eq(${m.table}.id, numId)).limit(1);
    if (!record) return notFound("${m.folder} entry not found");
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
    const [updated] = await db.update(${m.table}).set(body).where(eq(${m.table}.id, numId)).returning();
    if (!updated) return notFound("${m.folder} entry not found");
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
    const [deleted] = await db.delete(${m.table}).where(eq(${m.table}.id, numId)).returning();
    if (!deleted) return notFound("${m.folder} entry not found");
    return ok({ success: true, deletedId: numId });
  } catch (err: any) {
    return serverError(err.message);
  }
}
`;
  fs.writeFileSync(path.join(idDir, "route.ts"), idRouteContent);
});

console.log("Updated generator script with type assertion.");
