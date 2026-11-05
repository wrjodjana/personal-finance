import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getDb } from "@/lib/db";
import { badRequest, plaidErrorResponse, readJson } from "@/lib/http";
import { plaid } from "@/lib/plaid";
import { items } from "@/lib/schema";

export async function POST(request: Request) {
  const { itemId } = await readJson(request);
  const base = {
    client_name: "Personal Finance",
    country_codes: [CountryCode.Us],
    language: "en",
    user: { client_user_id: "local-user" },
  };

  try {
    if (typeof itemId === "string") {
      const item = getDb().select().from(items).where(eq(items.id, itemId)).get();
      if (!item) return badRequest("Unknown connection");
      const { data } = await plaid().linkTokenCreate({ ...base, access_token: item.accessToken });
      return NextResponse.json({ linkToken: data.link_token });
    }

    const { data } = await plaid().linkTokenCreate({
      ...base,
      products: [Products.Transactions],
      transactions: { days_requested: 730 },
    });
    return NextResponse.json({ linkToken: data.link_token });
  } catch (error) {
    return plaidErrorResponse(error);
  }
}
