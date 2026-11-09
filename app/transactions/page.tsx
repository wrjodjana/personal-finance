import { count, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Money } from "@/components/MoneyProvider";
import { MonthPicker } from "@/components/MonthPicker";
import { SetupNotice } from "@/components/SetupNotice";
import { TransactionFilters } from "@/components/TransactionFilters";
import { TransactionRow } from "@/components/TransactionRow";
import { CATEGORIES } from "@/lib/categories";
import { institutionLogoUrl } from "@/lib/branding";
import { getDb } from "@/lib/db";
import {
  availableMonths,
  inMonths,
  loadActiveEntries,
  rankCategories,
  SPENDING_ACCOUNT_TYPES,
  type LedgerEntry,
} from "@/lib/ledger";
import { getMoney } from "@/lib/money";
import { formatDay, monthLabel, parseMonth } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { accounts, deletedTransactions, items } from "@/lib/schema";
import { matchesFilters, parseFilters, sortEntries } from "@/lib/transactionFilters";

export const dynamic = "force-dynamic";

function groupByDay(entries: LedgerEntry[]) {
  const days: { date: string; entries: LedgerEntry[]; netCents: number }[] = [];
  for (const entry of entries) {
    let day = days[days.length - 1];
    if (!day || day.date !== entry.date) {
      day = { date: entry.date, entries: [], netCents: 0 };
      days.push(day);
    }
    day.entries.push(entry);
    if (!entry.removed) day.netCents -= entry.amountCents;
  }
  return days;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const params = await searchParams;
  const month = parseMonth(params.month);
  const filters = parseFilters(params);
  const [allEntries, money] = await Promise.all([loadActiveEntries(), getMoney()]);
  const entries = sortEntries(
    inMonths(allEntries, month, month).filter((entry) => matchesFilters(entry, filters)),
    filters,
  );
  const days = filters.sort === "date" ? groupByDay(entries) : [];

  const accountRows = await getDb()
    .select({
      id: accounts.id,
      name: accounts.name,
      mask: accounts.mask,
      institution: items.institutionName,
      item: { id: items.id, logoType: items.logoType, brandingFetchedAt: items.brandingFetchedAt, primaryColor: items.primaryColor },
    })
    .from(accounts)
    .innerJoin(items, eq(accounts.itemId, items.id))
    .where(inArray(accounts.type, SPENDING_ACCOUNT_TYPES))
    .orderBy(items.institutionName, accounts.name)
    .all();
  const accountOptions = accountRows.map((row) => ({
    value: row.id,
    name: row.name,
    mask: row.mask,
    institution: row.institution,
    logoUrl: institutionLogoUrl(row.item),
    color: row.item.primaryColor,
  }));

  const trashCount = (await getDb().select({ total: count() }).from(deletedTransactions).get())?.total ?? 0;

  const categoryKeys = rankCategories(allEntries);
  const categoryOptions = categoryKeys.map((key) => ({ value: key, label: CATEGORIES[key].label }));
  const categoryFilterOptions = categoryKeys.map((key) => ({ value: key, label: CATEGORIES[key].label, color: CATEGORIES[key].color }));
  const monthOptions = (await availableMonths()).map((value) => ({ value, label: monthLabel(value, "medium") }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-medium tracking-tight">Transactions</h1>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} months={monthOptions} />
          <Link
            href="/transactions/refunds"
            aria-label="Refunds"
            title="Refunds"
            className="control grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
              <path
                d="M5 3.5h10v13l-1.67-1.25-1.66 1.25L10 15.25 8.33 16.5l-1.66-1.25L5 16.5v-13ZM7.75 7.5h4.5m-4.5 3h4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/transactions/trash"
            aria-label={trashCount > 0 ? `Trash, ${trashCount} deleted` : "Trash"}
            title="Trash"
            className="control relative grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
              <path
                d="M3.5 5.5h13M8 5.5V4h4v1.5m-7 0 .75 10.1a1.25 1.25 0 0 0 1.25 1.15h6a1.25 1.25 0 0 0 1.25-1.15L15 5.5M8.5 8.5v5m3-5v5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {trashCount > 0 && (
              <span className="tabular absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-medium text-canvas">
                {trashCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <TransactionFilters filters={filters} categories={categoryFilterOptions} accounts={accountOptions} />

      {entries.length === 0 ? (
        <section className="card px-5 py-12 text-center text-sm text-muted">No transactions match your filters.</section>
      ) : filters.sort !== "date" ? (
        <section className="card">
          <ul className="divide-y divide-line/60">
            {entries.map((entry) => (
              <TransactionRow key={entry.id} entry={entry} options={categoryOptions} money={money} showDate />
            ))}
          </ul>
        </section>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.date} className="card">
              <div className="flex items-baseline justify-between rounded-t-[calc(0.875rem-1px)] border-b border-line/70 bg-surface/60 px-4 py-2">
                <h2 className="text-xs font-medium">{formatDay(day.date)}</h2>
                <p className="label tabular">
                  Net{" "}
                  <span className={`font-medium ${day.netCents > 0 ? "text-positive" : "text-ink"}`}>
                    {day.netCents > 0 ? "+" : ""}
                    <Money cents={Math.abs(day.netCents)} />
                  </span>
                </p>
              </div>
              <ul className="divide-y divide-line/60">
                {day.entries.map((entry) => (
                  <TransactionRow key={entry.id} entry={entry} options={categoryOptions} money={money} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
