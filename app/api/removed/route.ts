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
  if (!db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, transactionId)).get()) {
    return badRequest("Unknown transaction");
  }

  if (removed) {
    db.insert(removedTransactions).values({ transactionId }).onConflictDoNothing().run();
  } else {
    db.delete(removedTransactions).where(eq(removedTransactions.transactionId, transactionId)).run();
  }
  return NextResponse.json({ ok: true });
}
