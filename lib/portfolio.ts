import { desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { today } from "./months";
import type { Holding } from "./netWorth";
import { holdings, investmentTransactions } from "./schema";

const CLASSES: { label: string; types: string[] }[] = [
  { label: "Equities", types: ["equity", "etf", "mutual fund"] },
  { label: "Fixed income", types: ["fixed income"] },
  { label: "Cash", types: ["cash"] },
  { label: "Crypto", types: ["cryptocurrency"] },
  { label: "Options", types: ["derivative"] },
];

const TYPE_LABELS: Record<string, string> = {
  equity: "Equity",
  etf: "ETF",
  "mutual fund": "Mutual fund",
  "fixed income": "Fixed income",
  cash: "Cash",
  cryptocurrency: "Crypto",
  derivative: "Options",
};

export function typeLabel(type: string | null): string {
  return (type && TYPE_LABELS[type]) ?? "Other";
}

export function assetClassLabel(type: string | null): string {
  return CLASSES.find((assetClass) => assetClass.types.includes(type ?? ""))?.label ?? "Other";
}

export async function loadPortfolio(accounts: Holding[]) {
  const accountIds = accounts.map((account) => account.id);
  const db = getDb();
  const yearStart = `${today().slice(0, 4)}-01-01`;
  const [positions, activity] = await Promise.all([
    db.select().from(holdings).where(inArray(holdings.accountId, accountIds)).all(),
    db
      .select()
      .from(investmentTransactions)
      .where(inArray(investmentTransactions.accountId, accountIds))
      .orderBy(desc(investmentTransactions.date))
      .all(),
  ]);

  const byType = new Map<string, number>();
  for (const position of positions) {
    const label = typeLabel(position.securityType);
    byType.set(label, (byType.get(label) ?? 0) + position.valueCents);
  }
  const allocation = [...byType.entries()].map(([label, cents]) => ({ label, cents }));

  const thisYear = activity.filter((entry) => entry.date >= yearStart);
  const cashIn = (match: string) =>
    thisYear
      .filter((entry) => entry.type === "cash" && entry.subtype.includes(match))
      .reduce((total, entry) => total - entry.amountCents, 0);
  const yearToDate = {
    dividendsCents: cashIn("dividend"),
    interestCents: cashIn("interest"),
    feesCents: thisYear.reduce(
      (total, entry) => total + (entry.type === "fee" ? entry.amountCents : (entry.feesCents ?? 0)),
      0,
    ),
  };

  return { positions, allocation, activity, yearToDate };
}
