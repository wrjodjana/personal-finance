import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, plaidErrorResponse, readJson } from "@/lib/http";
import { plaid } from "@/lib/plaid";
import { accounts, items } from "@/lib/schema";
import { saveAccounts, syncItemById } from "@/lib/sync";

export async function POST(request: Request) {
  const { publicToken, institutionId, institutionName } = await readJson(request);
  if (typeof publicToken !== "string") return badRequest("Missing publicToken");

  try {
    const { data: exchange } = await plaid().itemPublicTokenExchange({ public_token: publicToken });
    const { data: accountData } = await plaid().accountsGet({ access_token: exchange.access_token });

    const db = getDb();
    if (typeof institutionId === "string") {
      const newMasks = new Set(accountData.accounts.map((account) => account.mask).filter(Boolean));
      const sameBank = await db
        .select({ itemId: items.id, mask: accounts.mask })
        .from(items)
        .innerJoin(accounts, eq(accounts.itemId, items.id))
        .where(eq(items.institutionId, institutionId))
        .all();
      const existing = sameBank.find((row) => row.mask && newMasks.has(row.mask));
      if (existing) {
        await plaid().itemRemove({ access_token: exchange.access_token });
        return NextResponse.json(
          { error: "These accounts are already connected", existingItemId: existing.itemId },
          { status: 409 },
        );
      }
    }

    await db.insert(items)
      .values({
        id: exchange.item_id,
        accessToken: exchange.access_token,
        institutionId: typeof institutionId === "string" ? institutionId : null,
        institutionName: typeof institutionName === "string" ? institutionName : "Bank",
      });
    await saveAccounts(exchange.item_id, accountData.accounts);

    const result = await syncItemById(exchange.item_id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return plaidErrorResponse(error);
  }
}
