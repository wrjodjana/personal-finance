import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { isFrequency } from "@/lib/recurring";
import { loadRecurring } from "@/lib/recurringData";
import { recurringEdits } from "@/lib/schema";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export async function POST(request: Request) {
  const { streamId, name, category, amountCents, frequency, nextDate, hidden, reset } = await readJson(request);
  if (typeof streamId !== "string") return badRequest("Missing streamId");

  const db = getDb();
  const { streams } = await loadRecurring({ withoutEdits: true });
  const baseline = streams.find((stream) => stream.id === streamId);
  if (!baseline) return badRequest("Unknown recurring stream");

  if (reset === true) {
    await db
      .update(recurringEdits)
      .set({ name: null, category: null, amountCents: null, frequency: null, nextDate: null })
      .where(eq(recurringEdits.streamId, streamId));
    return NextResponse.json({ ok: true });
  }

  if (typeof hidden === "boolean" && name === undefined) {
    await db
      .insert(recurringEdits)
      .values({ streamId, hidden })
      .onConflictDoUpdate({ target: recurringEdits.streamId, set: { hidden } });
    return NextResponse.json({ ok: true });
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 200) return badRequest("Enter a name");
  if (typeof category !== "string" || !CATEGORY_KEYS.includes(category)) return badRequest("Pick a category");
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return badRequest("Enter an amount above zero");
  }
  if (!isFrequency(frequency)) return badRequest("Pick how often it repeats");
  if (nextDate !== null && (typeof nextDate !== "string" || !validDate(nextDate))) return badRequest("Enter a valid date");

  const trimmed = name.trim();
  const edit = {
    name: trimmed === baseline.name ? null : trimmed,
    category: category === baseline.category ? null : category,
    amountCents: amountCents === baseline.amountCents ? null : amountCents,
    frequency: frequency === baseline.frequency ? null : frequency,
    nextDate: nextDate === null || nextDate === baseline.nextDate ? null : nextDate,
  };
  await db
    .insert(recurringEdits)
    .values({ streamId, ...edit })
    .onConflictDoUpdate({ target: recurringEdits.streamId, set: edit });
  return NextResponse.json({ ok: true });
}
