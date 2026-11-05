import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { badRequest, readJson } from "@/lib/http";
import { rules } from "@/lib/schema";

export async function POST(request: Request) {
  const { pattern, category } = await readJson(request);
  const trimmed = typeof pattern === "string" ? pattern.trim() : "";
  if (trimmed.length < 2 || trimmed.length > 100) {
    return badRequest("Merchant text must be 2 to 100 characters");
  }
  if (typeof category !== "string" || !CATEGORY_KEYS.includes(category)) {
    return badRequest("Unknown category");
  }
  getDb().insert(rules).values({ pattern: trimmed, category }).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { id } = await readJson(request);
  if (typeof id !== "number") return badRequest("Missing id");
  getDb().delete(rules).where(eq(rules.id, id)).run();
  return NextResponse.json({ ok: true });
}
