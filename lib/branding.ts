import { CountryCode } from "plaid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plaid } from "@/lib/plaid";
import { items } from "@/lib/schema";

type Item = typeof items.$inferSelect;
type Logo = { bytes: Buffer; type: string };

const TIMEOUT_MS = 8000;
const MAX_LOGO_BYTES = 256 * 1024;
const HEADERS = { "User-Agent": "Mozilla/5.0 (personal-finance)" };

async function fetchImage(url: URL): Promise<Logo | null> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const type = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!response.ok || !type.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length > 0 && bytes.length <= MAX_LOGO_BYTES ? { bytes, type } : null;
}

function iconCandidates(html: string, base: URL): URL[] {
  const ranked: { url: URL; score: number }[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel=["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase() ?? "";
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || !rel.split(/\s+/).some((part) => part.endsWith("icon"))) continue;
    const size = Number(/\bsizes=["'](\d+)x\d+/i.exec(tag)?.[1] ?? 0);
    const score = (rel.includes("apple-touch-icon") ? 1000 : 0) + size;
    try {
      ranked.push({ url: new URL(href, base), score });
    } catch {}
  }
  return ranked.sort((a, b) => b.score - a.score).map((entry) => entry.url);
}

async function fetchSiteIcon(siteUrl: string): Promise<Logo | null> {
  const page = await fetch(siteUrl, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const base = new URL(page.url || siteUrl);
  const html = page.ok ? await page.text() : "";
  for (const url of [...iconCandidates(html, base), new URL("/favicon.ico", base)]) {
    const logo = await fetchImage(url).catch(() => null);
    if (logo) return logo;
  }
  return null;
}

export async function refreshBranding(item: Item): Promise<void> {
  if (!item.institutionId) return;
  const { data } = await plaid().institutionsGetById({
    institution_id: item.institutionId,
    country_codes: [CountryCode.Us],
    options: { include_optional_metadata: true },
  });
  const institution = data.institution;
  let logo: Logo | null = institution.logo ? { bytes: Buffer.from(institution.logo, "base64"), type: "image/png" } : null;
  if (!logo && institution.url) logo = await fetchSiteIcon(institution.url).catch(() => null);
  getDb()
    .update(items)
    .set({
      logo: logo?.bytes ?? null,
      logoType: logo?.type ?? null,
      primaryColor: institution.primary_color ?? null,
      brandingFetchedAt: new Date().toISOString(),
    })
    .where(eq(items.id, item.id))
    .run();
}

export function institutionLogoUrl(item: Pick<Item, "id" | "logoType" | "brandingFetchedAt">): string | null {
  return item.logoType ? `/api/institutions/${item.id}/logo?v=${encodeURIComponent(item.brandingFetchedAt ?? "")}` : null;
}
