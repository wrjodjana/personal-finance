import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { deletedTransactions, transactions } from "@/lib/schema";

export async function POST(request: Request) {
  const { transactionId, deleted } = await readJson(request);
  if (typeof transactionId !== "string") return badRequest("Missing transactionId");
  if (typeof deleted !== "boolean") return badRequest("Missing deleted");

  const db = getDb();
  if (!(await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, transactionId)).get())) {
    return badRequest("Unknown transaction");
  }

  if (deleted) {
    await db.insert(deletedTransactions).values({ transactionId }).onConflictDoNothing();
  } else {
    await db.delete(deletedTransactions).where(eq(deletedTransactions.transactionId, transactionId));
  }
  return NextResponse.json({ ok: true });
}
