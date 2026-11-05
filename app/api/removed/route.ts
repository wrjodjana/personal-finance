import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { removedTransactions, transactions } from "@/lib/schema";

export async function POST(request: Request) {
  const { transactionId, removed } = await readJson(request);
  if (typeof transactionId !== "string") return badRequest("Missing transactionId");
  if (typeof removed !== "boolean") return badRequest("Missing removed");

  const db = getDb();
  if (!(await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, transactionId)).get())) {
    return badRequest("Unknown transaction");
  }

  if (removed) {
    await db.insert(removedTransactions).values({ transactionId }).onConflictDoNothing();
  } else {
    await db.delete(removedTransactions).where(eq(removedTransactions.transactionId, transactionId));
  }
  return NextResponse.json({ ok: true });
}
