import Link from "next/link";
import { CategoryPie, type PieSlice } from "@/components/CategoryPie";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { MonthPicker } from "@/components/MonthPicker";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { SpendingChart, type ChartRow, type ChartSeries } from "@/components/SpendingChart";
import { categoryMeta } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { availableMonths, inMonths, loadActiveEntries, monthRange, rankCategories, summarize, type LedgerEntry } from "@/lib/ledger";
import { addMonths, currentMonth, daysInMonth, formatCents, formatDate, monthLabel, parseMonth } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { items } from "@/lib/schema";

export const dynamic = "force-dynamic";

function topMerchants(entries: LedgerEntry[]) {
  const byMerchant = new Map<string, { name: string; logoUrl: string | null; cents: number; count: number }>();
  for (const entry of entries) {
    if (!entry.isSpending || entry.amountCents <= 0) continue;
    const current = byMerchant.get(entry.merchant) ?? { name: entry.merchant, logoUrl: entry.logoUrl, cents: 0, count: 0 };
    current.cents += entry.amountCents;
    current.count += 1;
    current.logoUrl ??= entry.logoUrl;
    byMerchant.set(entry.merchant, current);
  }
  return [...byMerchant.values()].sort((a, b) => b.count - a.count || b.cents - a.cents).slice(0, 5);
}

function Stat({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="label">{label}</p>
      <p className="tabular mt-1 text-2xl font-medium tracking-tight">{value}</p>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const connections = await getDb().select().from(items).all();
  if (connections.length === 0) {
    return (
      <div className="card mx-auto mt-16 max-w-md px-8 py-10 text-center">
        <h1 className="text-lg font-medium">Connect your first card</h1>
        <p className="mt-2 text-sm text-muted">
          Connect a credit card or bank account to see where your money goes. Access is read-only.
        </p>
        <div className="mt-6 flex justify-center">
          <PlaidLinkButton label="Connect account" />
        </div>
      </div>
    );
  }

  const month = parseMonth((await searchParams).month);
  const previousMonth = addMonths(month, -1);
  const chartMonths = monthRange(month, 12);
  const allEntries = await loadActiveEntries();
  const ledger = inMonths(allEntries, chartMonths[0], month);
  const summary = summarize(ledger, month);
  const previous = summarize(ledger, previousMonth);
  const delta = summary.totalCents - previous.totalCents;
  const deltaShare = previous.totalCents > 0 ? (Math.abs(delta) / previous.totalCents) * 100 : null;
  const broken = connections.filter((item) => item.status !== "ok");
  const importing = connections.filter((item) => item.historyStatus !== "HISTORICAL_UPDATE_COMPLETE");

  const monthEntries = ledger.filter((entry) => entry.month === month);
  const spendingEntries = monthEntries.filter((entry) => entry.isSpending);
  const isCurrent = month === currentMonth();
  const daysCounted = isCurrent ? new Date().getDate() : daysInMonth(month);
  const dailyCents = Math.round(summary.totalCents / daysCounted);
  const merchants = topMerchants(monthEntries);
  const largest = [...spendingEntries].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5);

  const monthSummaries = chartMonths.map((chartMonth) => summarize(ledger, chartMonth));
  const yearTotals = new Map<string, number>();
  for (const monthSummary of monthSummaries) {
    for (const item of monthSummary.categories) {
      if (item.cents > 0) yearTotals.set(item.category, (yearTotals.get(item.category) ?? 0) + item.cents);
    }
  }
  const series: ChartSeries[] = rankCategories(allEntries)
    .filter((category) => yearTotals.has(category))
    .map((category) => ({ key: category, label: categoryMeta(category).label, color: categoryMeta(category).color }));
  const rows: ChartRow[] = chartMonths.map((chartMonth, index) => ({
    month: chartMonth,
    label: monthLabel(chartMonth, "short").split(" ")[0],
    longLabel: monthLabel(chartMonth),
    total: monthSummaries[index].totalCents / 100,
    selected: chartMonth === month,
    values: Object.fromEntries(
      monthSummaries[index].categories.filter((item) => item.cents > 0).map((item) => [item.category, item.cents / 100]),
    ),
  }));

  const purchasesCents = summary.categories.reduce((sum, item) => sum + Math.max(item.cents, 0), 0);
  const slices: PieSlice[] = summary.categories
    .filter((item) => item.cents > 0)
    .map((item) => {
      const meta = categoryMeta(item.category);
      return {
        category: item.category,
        label: meta.label,
        color: meta.color,
        cents: item.cents,
        href: `/transactions?month=${month}&category=${item.category}`,
      };
    });
  const monthOptions = (await availableMonths()).map((value) => ({ value, label: monthLabel(value, "medium") }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{monthLabel(month)}</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Spending</h1>
        </div>
        <MonthPicker month={month} months={monthOptions} />
      </header>

      {broken.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-negative/20 bg-negative/5 px-4 py-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-negative" />
            {broken.map((item) => item.institutionName).join(", ")} needs attention. Some data may be out of date.
          </span>
          <Link href="/accounts" className="font-medium underline underline-offset-2">
            Reconnect
          </Link>
        </div>
      )}
      {importing.length > 0 && broken.length === 0 && (
        <div className="rounded-xl border border-edge bg-surface px-4 py-3 text-sm text-muted">
          Plaid is still importing your history. Refresh in a few minutes to load older months.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Spent"
          value={formatCents(summary.totalCents)}
          note={
            previous.totalCents !== 0 ? (
              <span>
                <span className={delta > 0 ? "text-negative" : "text-positive"}>
                  {delta > 0 ? "▲" : "▼"} {formatCents(Math.abs(delta))}
                  {deltaShare !== null && ` (${deltaShare.toFixed(1)}%)`}
                </span>{" "}
                vs {monthLabel(previousMonth, "medium").split(" ")[0]}
              </span>
            ) : (
              "No spending last month"
            )
          }
        />
        <Stat
          label="Daily average"
          value={formatCents(dailyCents)}
          note={`Over ${daysCounted} ${daysCounted === 1 ? "day" : "days"}${isCurrent ? " so far" : ""}`}
        />
        <Stat
          label="Transactions"
          value={String(spendingEntries.length)}
          note={`In ${summary.categories.length} ${summary.categories.length === 1 ? "category" : "categories"}`}
        />
      </div>

      <section className="card px-4 pt-4 pb-3">
        <SpendingChart rows={rows} series={series} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="card">
          <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-2">
            <h2 className="text-sm font-medium">Categories</h2>
            <Link href={`/transactions?month=${month}`} className="label hover:text-ink">
              View all transactions →
            </Link>
          </div>
          {summary.categories.length === 0 ? (
            <p className="px-5 pt-6 pb-8 text-center text-sm text-muted">No spending in {monthLabel(month)}.</p>
          ) : (
            <ul className="pb-2">
              {summary.categories.map((item) => {
                const meta = categoryMeta(item.category);
                const refund = item.cents < 0;
                const share = purchasesCents > 0 && !refund ? (item.cents / purchasesCents) * 100 : 0;
                return (
                  <li key={item.category}>
                    <Link
                      href={`/transactions?month=${month}&category=${item.category}`}
                      className="grid grid-cols-[minmax(0,1fr)_5rem_2.75rem] items-center gap-x-3 px-5 py-2.5 transition sm:grid-cols-[minmax(0,1fr)_6.5rem_3.5rem] sm:gap-x-4 hover:bg-surface"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <span className="truncate text-sm">{meta.label}</span>
                        <span className="tabular text-xs text-faint">{item.count}</span>
                      </div>
                      <span
                        className={`tabular whitespace-nowrap text-right text-sm font-medium ${refund ? "text-positive" : ""}`}
                      >
                        {refund ? "+" : ""}
                        {formatCents(Math.abs(item.cents))}
                      </span>
                      <span className={`tabular whitespace-nowrap text-right text-xs ${refund ? "text-positive" : "text-muted"}`}>
                        {refund ? "Refund" : `${share.toFixed(1)}%`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card px-5 pt-4 pb-5">
          <h2 className="text-sm font-medium">Share of spending</h2>
          {slices.length === 0 ? (
            <p className="pt-6 pb-3 text-center text-sm text-muted">Nothing to show.</p>
          ) : (
            <div className="mt-4">
              <CategoryPie slices={slices} />
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="px-5 pt-4 pb-2 text-sm font-medium">Frequent merchants</h2>
          {merchants.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted">No purchases yet.</p>
          ) : (
            <ul className="pb-2">
              {merchants.map((merchant) => (
                <li key={merchant.name} className="flex items-center gap-3 px-5 py-2">
                  <MerchantAvatar name={merchant.name} logoUrl={merchant.logoUrl} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{merchant.name}</p>
                    <p className="label">
                      {merchant.count} {merchant.count === 1 ? "purchase" : "purchases"}
                    </p>
                  </div>
                  <span className="tabular text-sm font-medium">{formatCents(merchant.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="px-5 pt-4 pb-2 text-sm font-medium">Largest transactions</h2>
          {largest.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted">No purchases yet.</p>
          ) : (
            <ul className="pb-2">
              {largest.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-5 py-2">
                  <MerchantAvatar name={entry.merchant} logoUrl={entry.logoUrl} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{entry.merchant}</p>
                    <p className="label">
                      {formatDate(entry.date)} · {categoryMeta(entry.category).label}
                    </p>
                  </div>
                  <span className="tabular text-sm font-medium">{formatCents(entry.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
