import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { categoryOverrides, transactions } from "@/lib/schema";

export async function POST(request: Request) {
  const { transactionId, category } = await readJson(request);
  if (typeof transactionId !== "string") return badRequest("Missing transactionId");

  const db = getDb();
  if (!(await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, transactionId)).get())) {
    return badRequest("Unknown transaction");
  }

  if (category === null) {
    await db.delete(categoryOverrides).where(eq(categoryOverrides.transactionId, transactionId));
    return NextResponse.json({ ok: true });
  }
  if (typeof category !== "string" || !CATEGORY_KEYS.includes(category)) {
    return badRequest("Unknown category");
  }
  await db.insert(categoryOverrides)
    .values({ transactionId, category })
    .onConflictDoUpdate({ target: categoryOverrides.transactionId, set: { category } });
  return NextResponse.json({ ok: true });
}
