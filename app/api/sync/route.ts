import { NextResponse } from "next/server";
import { syncAll } from "@/lib/sync";

export async function POST() {
  const results = await syncAll();
  return NextResponse.json({ results });
}
