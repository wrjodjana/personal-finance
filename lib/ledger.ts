import { desc, eq, inArray, sql } from "drizzle-orm";
import { automaticCategory, isSpendingCategory, normalizeCategory } from "./categories";
import { institutionLogoUrl } from "./branding";
import { getDb } from "./db";
import { addMonths, currentMonth, monthEnd, monthStart } from "./months";
import {
  accounts,
  categoryOverrides,
  deletedTransactions,
  items,
  removedTransactions,
  rules,
  transactionEdits,
  transactions,
} from "./schema";

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
  account: { name: string; mask: string | null; institution: string; logoUrl: string | null; color: string | null };
  category: string;
  categorySource: CategorySource;
  isSpending: boolean;
  removed: boolean;
  edited: boolean;
  bank: { name: string; date: string; amountCents: number };
  deletedAt: string | null;
  refundMatch: { role: "purchase" | "refund"; otherDate: string } | null;
};

const REFUND_WINDOW_DAYS = 180;

type Rule = typeof rules.$inferSelect;

export function listRules(): Promise<Rule[]> {
  return getDb().select().from(rules).orderBy(desc(rules.id)).all();
}

function matchRule(ruleList: Rule[], merchant: string, description: string): Rule | undefined {
  const haystack = `${merchant}\n${description}`.toLowerCase();
  return ruleList.find((rule) => haystack.includes(rule.pattern.toLowerCase()));
}

export function accountLabel(institution: string, name: string, mask: string | null): string {
  return mask ? `${institution} ${name} ••${mask}` : `${institution} ${name}`;
}

async function loadEntries(): Promise<LedgerEntry[]> {
  const ruleList = await listRules();
  const rows = await getDb()
    .select({
      tx: transactions,
      override: categoryOverrides.category,
      removedAt: removedTransactions.removedAt,
      deletedAt: deletedTransactions.deletedAt,
      edit: {
        name: transactionEdits.name,
        date: transactionEdits.date,
        amountCents: transactionEdits.amountCents,
      },
      accountName: accounts.name,
      accountMask: accounts.mask,
      institution: items.institutionName,
      item: { id: items.id, logoType: items.logoType, brandingFetchedAt: items.brandingFetchedAt, primaryColor: items.primaryColor },
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(items, eq(accounts.itemId, items.id))
    .leftJoin(categoryOverrides, eq(categoryOverrides.transactionId, transactions.id))
    .leftJoin(removedTransactions, eq(removedTransactions.transactionId, transactions.id))
    .leftJoin(deletedTransactions, eq(deletedTransactions.transactionId, transactions.id))
    .leftJoin(transactionEdits, eq(transactionEdits.transactionId, transactions.id))
    .where(inArray(accounts.type, SPENDING_ACCOUNT_TYPES))
    .all();

  const entries = rows.map(({ tx, override, removedAt, deletedAt, edit, accountName, accountMask, institution, item }) => {
    const bankMerchant = tx.merchantName ?? tx.name;
    const merchant = edit?.name ?? bankMerchant;
    const date = edit?.date ?? tx.date;
    const amountCents = edit?.amountCents ?? tx.amountCents;
    let category = automaticCategory({ ...tx, amountCents });
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
      date,
      month: date.slice(0, 7),
      amountCents,
      merchant,
      logoUrl: tx.logoUrl,
      description: tx.name,
      pending: tx.pending,
      accountId: tx.accountId,
      account: {
        name: accountName,
        mask: accountMask,
        institution,
        logoUrl: institutionLogoUrl(item),
        color: item.primaryColor,
      },
      category,
      categorySource,
      isSpending: !removedAt && !deletedAt && isSpendingCategory(category),
      removed: Boolean(removedAt),
      edited: Boolean(edit && (edit.name !== null || edit.date !== null || edit.amountCents !== null)),
      bank: { name: bankMerchant, date: tx.date, amountCents: tx.amountCents },
      deletedAt: deletedAt ?? null,
      refundMatch: null,
    };
  });

  return entries.sort((a, b) => b.date.localeCompare(a.date) || b.amountCents - a.amountCents);
}

export async function loadLedger(fromMonth: string, toMonth: string): Promise<LedgerEntry[]> {
  const entries = (await loadEntries()).filter((entry) => !entry.deletedAt);
  matchRefunds(entries);
  const from = monthStart(fromMonth);
  const to = monthEnd(toMonth);
  return entries.filter((entry) => entry.date >= from && entry.date <= to);
}

export async function loadTrash(): Promise<LedgerEntry[]> {
  return (await loadEntries())
    .filter((entry) => entry.deletedAt)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
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

export async function availableMonths(): Promise<string[]> {
  const row = await getDb()
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
