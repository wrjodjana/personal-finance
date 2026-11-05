import Link from "next/link";
import { MonthPicker } from "@/components/MonthPicker";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { SpendingChart, type ChartRow, type ChartSeries } from "@/components/SpendingChart";
import { categoryMeta } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { availableMonths, loadLedger, monthRange, summarize } from "@/lib/ledger";
import { addMonths, formatCents, monthLabel, parseMonth } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { items } from "@/lib/schema";

export const dynamic = "force-dynamic";

const CHART_CATEGORY_LIMIT = 6;

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const connections = getDb().select().from(items).all();
  if (connections.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Connect your first card</h1>
        <p className="mt-2 text-sm text-stone-600">
          Connect a credit card or bank account to see where your money goes. Access is read-only.
        </p>
        <div className="mt-6 flex justify-center">
          <PlaidLinkButton label="Connect account" />
        </div>
      </div>
    );
  }

  const month = parseMonth((await searchParams).month);
  const months = availableMonths();
  const chartMonths = monthRange(month, 12);
  const ledger = loadLedger(chartMonths[0], month);
  const summary = summarize(ledger, month);
  const previous = summarize(ledger, addMonths(month, -1));
  const delta = summary.totalCents - previous.totalCents;
  const broken = connections.filter((item) => item.status !== "ok");
  const importing = connections.filter((item) => item.historyStatus !== "HISTORICAL_UPDATE_COMPLETE");

  const monthly = chartMonths.map((chartMonth) => summarize(ledger, chartMonth));
  const yearTotals = new Map<string, number>();
  for (const entry of monthly) {
    for (const item of entry.categories) {
      yearTotals.set(item.category, (yearTotals.get(item.category) ?? 0) + item.cents);
    }
  }
  const ranked = [...yearTotals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  const topKeys = ranked.slice(0, CHART_CATEGORY_LIMIT);
  const hasOther = ranked.length > CHART_CATEGORY_LIMIT;
  const series: ChartSeries[] = [
    ...(hasOther ? [{ key: "OTHER", label: "Everything else", color: "#d6d3d1" }] : []),
    ...[...topKeys].reverse().map((key) => ({ key, label: categoryMeta(key).label, color: categoryMeta(key).color })),
  ];
  const rows: ChartRow[] = monthly.map((entry) => {
    const row: ChartRow = { month: entry.month, label: monthLabel(entry.month, "short"), selected: entry.month === month };
    for (const key of topKeys) row[key] = 0;
    if (hasOther) row.OTHER = 0;
    for (const item of entry.categories) {
      const key = topKeys.includes(item.category) ? item.category : "OTHER";
      row[key] = Number(row[key]) + item.cents / 100;
    }
    return row;
  });

  const largest = Math.max(...summary.categories.map((item) => item.cents), 1);
  const purchasesCents = summary.categories.reduce((sum, item) => sum + Math.max(item.cents, 0), 0);
  const monthOptions = months.map((value) => ({ value, label: monthLabel(value) }));

  return (
    <div className="space-y-6">
      {broken.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            {broken.map((item) => item.institutionName).join(", ")} stopped syncing. Some data may be out of date.
          </span>
          <Link href="/accounts" className="font-medium underline underline-offset-2">
            Fix on Accounts
          </Link>
        </div>
      )}
      {importing.length > 0 && broken.length === 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Plaid is still importing your history. Click Refresh in a few minutes to load older months.
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">Spent in {monthLabel(month)}</p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatCents(summary.totalCents)}</p>
            {previous.totalCents !== 0 && (
              <p className="mt-1.5 text-sm text-stone-500">
                <span className={delta > 0 ? "text-red-600" : "text-emerald-600"}>
                  {delta > 0 ? "↑" : "↓"} {formatCents(Math.abs(delta))}
                </span>{" "}
                vs {monthLabel(addMonths(month, -1), "long").split(" ")[0]}
              </p>
            )}
          </div>
          <MonthPicker month={month} months={monthOptions} />
        </div>
        <div className="mt-6">
          <SpendingChart rows={rows} series={series} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-baseline justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="font-semibold">By category</h2>
          <Link href={`/transactions?month=${month}`} className="text-sm text-stone-500 hover:text-stone-900">
            All transactions →
          </Link>
        </div>
        {summary.categories.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No spending in {monthLabel(month)}.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {summary.categories.map((item) => {
              const meta = categoryMeta(item.category);
              const refund = item.cents < 0;
              const share = purchasesCents > 0 && !refund ? (item.cents / purchasesCents) * 100 : 0;
              return (
                <li key={item.category}>
                  <Link
                    href={`/transactions?month=${month}&category=${item.category}`}
                    className="grid grid-cols-[1fr_6.5rem_3.5rem] items-center gap-x-4 gap-y-2 px-6 py-3.5 transition hover:bg-stone-50 sm:grid-cols-[12rem_1fr_6.5rem_3.5rem]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                      <span className="truncate text-sm font-medium">{meta.label}</span>
                      <span className="text-xs text-stone-400">{item.count}</span>
                    </div>
                    {refund ? (
                      <span className="order-last col-span-3 text-xs font-medium text-emerald-600 sm:order-none sm:col-span-1">
                        Net refund
                      </span>
                    ) : (
                      <div className="order-last col-span-3 h-1.5 overflow-hidden rounded-full bg-stone-100 sm:order-none sm:col-span-1">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(item.cents / largest) * 100}%`, background: meta.color }}
                        />
                      </div>
                    )}
                    <span
                      className={`tabular whitespace-nowrap text-right text-sm font-medium ${refund ? "text-emerald-600" : ""}`}
                    >
                      {refund ? "+" : ""}
                      {formatCents(Math.abs(item.cents))}
                    </span>
                    <span className="tabular whitespace-nowrap text-right text-sm text-stone-400">
                      {refund ? "" : `${share.toFixed(1)}%`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
