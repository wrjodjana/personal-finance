import { desc, eq, inArray, sql } from "drizzle-orm";
import { automaticCategory, isSpendingCategory, normalizeCategory } from "./categories";
import { getDb } from "./db";
import { addMonths, currentMonth, monthEnd, monthStart } from "./months";
import { accounts, categoryOverrides, items, removedTransactions, rules, transactions } from "./schema";

export const SPENDING_ACCOUNT_TYPES = ["credit", "depository"];

export type CategorySource = "override" | "rule" | "plaid";

export type LedgerEntry = {
  id: string;
  date: string;
  month: string;
  amountCents: number;
  merchant: string;
  logoUrl: string | null;
  description: string;
  pending: boolean;
  accountId: string;
  accountLabel: string;
  category: string;
  categorySource: CategorySource;
  isSpending: boolean;
  removed: boolean;
  refundMatch: { role: "purchase" | "refund"; otherDate: string } | null;
};

const REFUND_WINDOW_DAYS = 180;

type Rule = typeof rules.$inferSelect;

export function listRules(): Rule[] {
  return getDb().select().from(rules).orderBy(desc(rules.id)).all();
}

function matchRule(ruleList: Rule[], merchant: string, description: string): Rule | undefined {
  const haystack = `${merchant}\n${description}`.toLowerCase();
  return ruleList.find((rule) => haystack.includes(rule.pattern.toLowerCase()));
}

export function accountLabel(institution: string, name: string, mask: string | null): string {
  return mask ? `${institution} ${name} ••${mask}` : `${institution} ${name}`;
}

export function loadLedger(fromMonth: string, toMonth: string): LedgerEntry[] {
  const ruleList = listRules();
  const rows = getDb()
    .select({
      tx: transactions,
      override: categoryOverrides.category,
      removedAt: removedTransactions.removedAt,
      accountName: accounts.name,
      accountMask: accounts.mask,
      institution: items.institutionName,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(items, eq(accounts.itemId, items.id))
    .leftJoin(categoryOverrides, eq(categoryOverrides.transactionId, transactions.id))
    .leftJoin(removedTransactions, eq(removedTransactions.transactionId, transactions.id))
    .where(inArray(accounts.type, SPENDING_ACCOUNT_TYPES))
    .orderBy(desc(transactions.date), desc(transactions.amountCents))
    .all();

  const entries: LedgerEntry[] = rows.map(({ tx, override, removedAt, accountName, accountMask, institution }) => {
    const merchant = tx.merchantName ?? tx.name;
    let category = automaticCategory(tx);
    let categorySource: CategorySource = "plaid";
    const rule = matchRule(ruleList, merchant, tx.name);
    if (override) {
      category = override;
      categorySource = "override";
    } else if (rule) {
      category = rule.category;
      categorySource = "rule";
    }
    category = normalizeCategory(category);
    return {
      id: tx.id,
      date: tx.date,
      month: tx.date.slice(0, 7),
      amountCents: tx.amountCents,
      merchant,
      logoUrl: tx.logoUrl,
      description: tx.name,
      pending: tx.pending,
      accountId: tx.accountId,
      accountLabel: accountLabel(institution, accountName, accountMask),
      category,
      categorySource,
      isSpending: !removedAt && isSpendingCategory(category),
      removed: Boolean(removedAt),
      refundMatch: null,
    };
  });

  matchRefunds(entries);
  const from = monthStart(fromMonth);
  const to = monthEnd(toMonth);
  return entries.filter((entry) => entry.date >= from && entry.date <= to);
}

function merchantKey(entry: LedgerEntry): string {
  return entry.merchant.toLowerCase().split("*")[0].replace(/[^a-z]+/g, " ").trim();
}

function daysBetween(earlier: string, later: string): number {
  return (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000;
}

function matchRefunds(entries: LedgerEntry[]) {
  const purchases = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    if (!entry.isSpending || entry.amountCents <= 0) continue;
    const key = `${entry.accountId}|${merchantKey(entry)}|${entry.amountCents}`;
    const list = purchases.get(key) ?? [];
    list.push(entry);
    purchases.set(key, list);
  }

  const refunds = entries
    .filter((entry) => entry.isSpending && entry.amountCents < 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const refund of refunds) {
    const candidates = purchases.get(`${refund.accountId}|${merchantKey(refund)}|${-refund.amountCents}`) ?? [];
    const purchase = candidates
      .filter((candidate) => {
        const age = daysBetween(candidate.date, refund.date);
        return candidate.refundMatch === null && age >= 0 && age <= REFUND_WINDOW_DAYS;
      })
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!purchase) continue;

    purchase.refundMatch = { role: "purchase", otherDate: refund.date };
    refund.refundMatch = { role: "refund", otherDate: purchase.date };
    purchase.isSpending = false;
    refund.isSpending = false;
  }
}

export type CategoryTotal = { category: string; cents: number; count: number };

export type MonthSummary = {
  month: string;
  totalCents: number;
  categories: CategoryTotal[];
};

export function summarize(entries: LedgerEntry[], month: string): MonthSummary {
  const byCategory = new Map<string, CategoryTotal>();
  for (const entry of entries) {
    if (entry.month !== month || !entry.isSpending) continue;
    const current = byCategory.get(entry.category) ?? { category: entry.category, cents: 0, count: 0 };
    current.cents += entry.amountCents;
    current.count += 1;
    byCategory.set(entry.category, current);
  }
  const categories = [...byCategory.values()].sort((a, b) => b.cents - a.cents);
  return {
    month,
    totalCents: categories.reduce((sum, item) => sum + item.cents, 0),
    categories,
  };
}

export function availableMonths(): string[] {
  const row = getDb()
    .select({ first: sql<string | null>`min(${transactions.date})` })
    .from(transactions)
    .get();
  const last = currentMonth();
  if (!row?.first) return [last];
  const months: string[] = [];
  for (let month = row.first.slice(0, 7); month <= last; month = addMonths(month, 1)) {
    months.push(month);
  }
  return months.reverse();
}

export function monthRange(endMonth: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addMonths(endMonth, index - count + 1));
}
