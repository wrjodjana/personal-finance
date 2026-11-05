import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { categoryOverrides, transactionEdits, transactions } from "@/lib/schema";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export async function POST(request: Request) {
  const { transactionId, name, date, amountCents, reset } = await readJson(request);
  if (typeof transactionId !== "string") return badRequest("Missing transactionId");

  const db = getDb();
  const tx = db.select().from(transactions).where(eq(transactions.id, transactionId)).get();
  if (!tx) return badRequest("Unknown transaction");

  if (reset === true) {
    db.transaction((trx) => {
      trx.delete(transactionEdits).where(eq(transactionEdits.transactionId, transactionId)).run();
      trx.delete(categoryOverrides).where(eq(categoryOverrides.transactionId, transactionId)).run();
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) return badRequest("Enter a name");
  if (typeof date !== "string" || !validDate(date)) return badRequest("Enter a valid date");
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents)) return badRequest("Enter a valid amount");

  const trimmed = name.trim();
  const edit = {
    name: trimmed === (tx.merchantName ?? tx.name) ? null : trimmed,
    date: date === tx.date ? null : date,
    amountCents: amountCents === tx.amountCents ? null : amountCents,
  };

  if (edit.name === null && edit.date === null && edit.amountCents === null) {
    db.delete(transactionEdits).where(eq(transactionEdits.transactionId, transactionId)).run();
  } else {
    db.insert(transactionEdits)
      .values({ transactionId, ...edit })
      .onConflictDoUpdate({ target: transactionEdits.transactionId, set: edit })
      .run();
  }
  return NextResponse.json({ ok: true });
}
