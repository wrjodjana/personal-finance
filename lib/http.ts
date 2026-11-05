import { NextResponse } from "next/server";
import { toPlaidFailure } from "./plaid";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function plaidErrorResponse(error: unknown) {
  const failure = toPlaidFailure(error);
  console.error(
    `[plaid] ${failure.code} ${failure.message}` +
      (failure.requestId ? ` (request_id ${failure.requestId})` : ""),
  );
  return NextResponse.json({ error: failure.message, code: failure.code }, { status: 502 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
