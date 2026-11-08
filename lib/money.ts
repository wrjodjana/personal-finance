import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";
import { BASE_CURRENCY, BASE_MONEY, isCurrency, type Money } from "./currency";
import { getDb } from "./db";
import { exchangeRates, settings } from "./schema";

const RATES_URL = "https://api.frankfurter.dev/v1/latest";
const FRESH_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

type FrankfurterLatest = { date: string; rates: Record<string, number> };

async function fetchRate(code: string): Promise<{ rate: number; rateDate: string } | null> {
  try {
    const response = await fetch(`${RATES_URL}?base=${BASE_CURRENCY}&symbols=${code}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as FrankfurterLatest;
    const rate = body.rates?.[code];
    if (typeof rate !== "number" || !(rate > 0)) throw new Error("no rate in response");
    return { rate, rateDate: body.date };
  } catch (error) {
    console.error(`[currency] could not fetch the ${code} rate: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

export async function loadRate(code: string): Promise<number | null> {
  if (code === BASE_CURRENCY) return 1;
  const db = getDb();
  const stored = await db.select().from(exchangeRates).where(eq(exchangeRates.currency, code)).get();
  if (stored && Date.now() - Date.parse(stored.fetchedAt) < FRESH_MS) return stored.rate;

  const fetched = await fetchRate(code);
  if (!fetched) return stored?.rate ?? null;
  const row = { currency: code, ...fetched, fetchedAt: new Date().toISOString() };
  await db.insert(exchangeRates).values(row).onConflictDoUpdate({ target: exchangeRates.currency, set: row });
  return fetched.rate;
}

export const getMoney = cache(async (): Promise<Money> => {
  await connection();
  const row = await getDb().select().from(settings).where(eq(settings.key, "currency")).get();
  const code = isCurrency(row?.value) ? row.value : BASE_CURRENCY;
  if (code === BASE_CURRENCY) return BASE_MONEY;
  const rate = await loadRate(code);
  return rate === null ? BASE_MONEY : { code, rate };
});

export async function saveCurrency(code: string): Promise<void> {
  await getDb()
    .insert(settings)
    .values({ key: "currency", value: code })
    .onConflictDoUpdate({ target: settings.key, set: { value: code } });
}
