import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { items } from "@/lib/schema";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/institutions/[itemId]/logo">) {
  const { itemId } = await ctx.params;
  const item = getDb()
    .select({ logo: items.logo, logoType: items.logoType })
    .from(items)
    .where(eq(items.id, itemId))
    .get();
  if (!item?.logo || !item.logoType) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(item.logo), {
    headers: {
      "Content-Type": item.logoType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
