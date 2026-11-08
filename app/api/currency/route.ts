import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency";
import { badRequest, readJson } from "@/lib/http";
import { loadRate, saveCurrency } from "@/lib/money";

export async function POST(request: Request) {
  const { currency } = await readJson(request);
  if (!isCurrency(currency)) return badRequest("Unknown currency");
  if ((await loadRate(currency)) === null) {
    return NextResponse.json({ error: "Could not get the exchange rate. Try again later." }, { status: 502 });
  }
  await saveCurrency(currency);
  return NextResponse.json({ ok: true });
}
