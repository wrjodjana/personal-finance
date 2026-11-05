import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/http";
import { syncItemById } from "@/lib/sync";

export async function POST(request: Request) {
  const { itemId } = await readJson(request);
  if (typeof itemId !== "string") return badRequest("Missing itemId");
  const result = await syncItemById(itemId);
  if (!result) return badRequest("Unknown connection");
  return NextResponse.json({ result });
}
