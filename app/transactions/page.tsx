import { eq, inArray } from "drizzle-orm";
import { CategoryCell } from "@/components/CategoryCell";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { MonthPicker } from "@/components/MonthPicker";
import { RemoveButton } from "@/components/RemoveButton";
import { Rules } from "@/components/Rules";
import { SetupNotice } from "@/components/SetupNotice";
import { TransactionFilters } from "@/components/TransactionFilters";
import { CATEGORIES, CATEGORY_KEYS, categoryMeta, normalizeCategory } from "@/lib/categories";
import { getDb } from "@/lib/db";
import {
  accountLabel,
  availableMonths,
  listRules,
  loadLedger,
  SPENDING_ACCOUNT_TYPES,
  type LedgerEntry,
} from "@/lib/ledger";
import { formatCents, formatDate, formatDay, monthLabel, parseMonth } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { accounts, items } from "@/lib/schema";

export const dynamic = "force-dynamic";

function ExcludedIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-3.5 shrink-0" aria-label="Not counted">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="m3 13 10-10" strokeLinecap="round" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-3.5 shrink-0" aria-label="Pending">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function groupByDay(entries: LedgerEntry[]) {
  const days: { date: string; entries: LedgerEntry[]; spentCents: number }[] = [];
  for (const entry of entries) {
    let day = days[days.length - 1];
    if (!day || day.date !== entry.date) {
      day = { date: entry.date, entries: [], spentCents: 0 };
      days.push(day);
    }
    day.entries.push(entry);
    if (entry.isSpending) day.spentCents += entry.amountCents;
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
  const category = typeof params.category === "string" ? params.category : "";
  const account = typeof params.account === "string" ? params.account : "";
  const query = typeof params.q === "string" ? params.q : "";
  const needle = query.toLowerCase();

  const entries = loadLedger(month, month).filter(
    (entry) =>
      (!category || entry.category === category) &&
      (!account || entry.accountId === account) &&
      (!needle || `${entry.merchant} ${entry.description}`.toLowerCase().includes(needle)),
  );
  const spendingCents = entries.filter((entry) => entry.isSpending).reduce((sum, entry) => sum + entry.amountCents, 0);
  const days = groupByDay(entries);

  const accountOptions = getDb()
    .select({ id: accounts.id, name: accounts.name, mask: accounts.mask, institution: items.institutionName })
    .from(accounts)
    .innerJoin(items, eq(accounts.itemId, items.id))
    .where(inArray(accounts.type, SPENDING_ACCOUNT_TYPES))
    .all()
    .map((row) => ({ value: row.id, label: accountLabel(row.institution, row.name, row.mask) }));

  const categoryOptions = CATEGORY_KEYS.map((key) => ({ value: key, label: CATEGORIES[key].label }));
  const monthOptions = availableMonths().map((value) => ({ value, label: monthLabel(value, "medium") }));
  const rules = listRules().map((rule) => ({
    id: rule.id,
    pattern: rule.pattern,
    categoryLabel: categoryMeta(normalizeCategory(rule.category)).label,
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{monthLabel(month)}</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Transactions</h1>
        </div>
        <MonthPicker month={month} months={monthOptions} />
      </header>

      <TransactionFilters
        categories={categoryOptions}
        accounts={accountOptions}
        category={category}
        account={account}
        query={query}
      />

      <section className="card overflow-hidden">
        <div className="flex items-baseline justify-between border-b border-line/70 px-5 py-3">
          <p className="text-sm">
            <span className="font-medium">{category ? categoryMeta(category).label : "All transactions"}</span>
            <span className="tabular ml-2 text-muted">{entries.length}</span>
          </p>
          <p className="label">
            Spent <span className="tabular text-sm font-medium text-ink">{formatCents(spendingCents)}</span>
          </p>
        </div>

        {days.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">No transactions match your filters.</p>
        ) : (
          days.map((day) => (
            <div key={day.date}>
              <div className="flex items-baseline justify-between bg-surface/70 px-5 py-1.5">
                <p className="label font-medium">{formatDay(day.date)}</p>
                <p className="label tabular">{day.spentCents !== 0 ? `Spent ${formatCents(day.spentCents)}` : ""}</p>
              </div>
              <ul>
                {day.entries.map((entry) => {
                  const moneyIn = entry.amountCents < 0;
                  const muted = !entry.isSpending;
                  return (
                    <li
                      key={entry.id}
                      className={`grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-1 border-t border-line/50 px-5 py-2.5 first:border-t-0 sm:grid-cols-[2rem_1fr_11rem_7rem_6rem] ${
                        entry.removed ? "opacity-60" : ""
                      }`}
                    >
                      <MerchantAvatar name={entry.merchant} logoUrl={entry.logoUrl} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`truncate text-sm ${muted ? "text-muted" : ""}`}>{entry.merchant}</span>
                          {entry.removed && (
                            <span className="text-faint" title="Not counted">
                              <ExcludedIcon />
                            </span>
                          )}
                          {entry.pending && (
                            <span className="text-faint" title="Pending">
                              <PendingIcon />
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-faint">
                          {entry.refundMatch
                            ? entry.refundMatch.role === "purchase"
                              ? `Refunded ${formatDate(entry.refundMatch.otherDate)} · `
                              : `Refund of ${formatDate(entry.refundMatch.otherDate)} purchase · `
                            : ""}
                          {entry.accountLabel}
                        </p>
                      </div>
                      <div className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto">
                        <CategoryCell
                          transactionId={entry.id}
                          merchant={entry.merchant}
                          category={entry.category}
                          source={entry.categorySource}
                          options={categoryOptions}
                        />
                      </div>
                      <span
                        className={`tabular col-start-3 row-start-1 whitespace-nowrap text-right text-sm ${
                          entry.removed
                            ? "text-faint line-through"
                            : moneyIn
                              ? "text-positive"
                              : muted
                                ? "text-muted"
                                : "font-medium"
                        } sm:col-start-auto sm:row-start-auto`}
                      >
                        {moneyIn ? "+" : ""}
                        {formatCents(Math.abs(entry.amountCents))}
                      </span>
                      <div className="col-start-3 row-start-2 text-right sm:col-start-auto sm:row-start-auto">
                        <RemoveButton transactionId={entry.id} removed={entry.removed} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      <Rules rules={rules} options={categoryOptions} />
    </div>
  );
}
