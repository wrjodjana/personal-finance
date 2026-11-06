import { asc, eq, isNotNull } from "drizzle-orm";
import { institutionLogoUrl } from "./branding";
import { getDb } from "./db";
import { today } from "./months";
import { accounts, balanceSnapshots, items } from "./schema";

export type Kind = "asset" | "liability";

export type Holding = {
  id: string;
  itemId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  kind: Kind;
  cents: number;
  availableCents: number | null;
  limitCents: number | null;
  institutionName: string;
  logoUrl: string | null;
  color: string | null;
};

export type HistoryPoint = { date: string; cents: number };

const GROUPS: { type: string; label: string; kind: Kind }[] = [
  { type: "depository", label: "Cash", kind: "asset" },
  { type: "investment", label: "Investments", kind: "asset" },
  { type: "other", label: "Other", kind: "asset" },
  { type: "credit", label: "Credit cards", kind: "liability" },
  { type: "loan", label: "Loans", kind: "liability" },
];

export function groupOf(type: string) {
  return GROUPS.find((group) => group.type === type) ?? GROUPS[2];
}

export function subtypeLabel(holding: Pick<Holding, "type" | "subtype">): string {
  const value = holding.subtype ?? holding.type;
  if (value === "cd") return "CD";
  if (value === "hsa") return "HSA";
  if (value === "money market") return "Money market";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function groupHoldings(holdings: Holding[]) {
  return GROUPS.map((group) => {
    const members = holdings.filter((holding) => groupOf(holding.type) === group).sort((a, b) => b.cents - a.cents);
    const subtypes = new Map<string, Holding[]>();
    for (const holding of members) {
      const label = subtypeLabel(holding);
      subtypes.set(label, [...(subtypes.get(label) ?? []), holding]);
    }
    return {
      ...group,
      totalCents: members.reduce((total, holding) => total + holding.cents, 0),
      holdings: members,
      subtypes: [...subtypes.entries()]
        .map(([label, list]) => ({ label, holdings: list, totalCents: list.reduce((total, holding) => total + holding.cents, 0) }))
        .sort((a, b) => b.totalCents - a.totalCents),
    };
  }).filter((group) => group.holdings.length > 0);
}

export async function loadHoldings(): Promise<Holding[]> {
  const rows = await getDb()
    .select({ account: accounts, item: items })
    .from(accounts)
    .innerJoin(items, eq(accounts.itemId, items.id))
    .where(isNotNull(accounts.currentCents))
    .all();
  return rows.map(({ account, item }) => ({
    id: account.id,
    itemId: account.itemId,
    name: account.name,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    kind: groupOf(account.type).kind,
    cents: account.currentCents ?? 0,
    availableCents: account.availableCents,
    limitCents: account.limitCents,
    institutionName: item.institutionName,
    logoUrl: institutionLogoUrl(item),
    color: item.primaryColor,
  }));
}

function nextDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

export async function loadHistory(holdings: Holding[], netCents: number): Promise<HistoryPoint[]> {
  const end = today();
  const sign = new Map(holdings.map((holding) => [holding.id, holding.kind === "asset" ? 1 : -1]));
  const snapshots = await getDb().select().from(balanceSnapshots).orderBy(asc(balanceSnapshots.date)).all();
  const known = snapshots.filter((snapshot) => sign.has(snapshot.accountId));
  if (known.length === 0 || known[0].date >= end) return [{ date: end, cents: netCents }];

  const balances = new Map<string, number>();
  for (const snapshot of known) if (!balances.has(snapshot.accountId)) balances.set(snapshot.accountId, snapshot.cents);
  const points: HistoryPoint[] = [];
  let index = 0;
  for (let day = known[0].date; day < end; day = nextDay(day)) {
    for (; index < known.length && known[index].date === day; index++) {
      balances.set(known[index].accountId, known[index].cents);
    }
    let cents = 0;
    for (const [accountId, balance] of balances) cents += sign.get(accountId)! * balance;
    points.push({ date: day, cents });
  }
  points.push({ date: end, cents: netCents });
  return points;
}
