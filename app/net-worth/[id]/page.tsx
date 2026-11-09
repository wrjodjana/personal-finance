import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountFlowChart, type FlowRow } from "@/components/AccountFlowChart";
import { AccountLogo, Icon } from "@/components/AccountParts";
import { HoldingsList, type HoldingRow } from "@/components/HoldingsList";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { FittedMoney, Money } from "@/components/MoneyProvider";
import { SetupNotice } from "@/components/SetupNotice";
import { TransactionRow } from "@/components/TransactionRow";
import { CATEGORIES, categoryMeta } from "@/lib/categories";
import { loadActiveEntries, monthRange, rankCategories, type LedgerEntry } from "@/lib/ledger";
import { getMoney } from "@/lib/money";
import { currentMonth, monthLabel } from "@/lib/months";
import { groupOf, loadHoldings, subtypeLabel, type Holding } from "@/lib/netWorth";
import { plaidConfigured } from "@/lib/plaid";
import { assetClassLabel, loadPortfolio, typeLabel } from "@/lib/portfolio";
import { frequencyMeta, isCounted } from "@/lib/recurring";
import { loadRecurring } from "@/lib/recurringData";

export const dynamic = "force-dynamic";

const RECENT_ROWS = 10;
const TOP_CATEGORIES = 5;
const RECURRING_ROWS = 5;

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="card @container px-4 py-3.5">
      <p className="label">{label}</p>
      <p className="tabular mt-1 text-2xl font-medium tracking-tight [--fit-max:var(--text-2xl)]">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

function balanceStats(holding: Holding, pendingCents: number) {
  const group = groupOf(holding.type);
  if (group.kind === "liability") {
    const limited = holding.limitCents !== null && holding.limitCents > 0;
    return [
      { label: "Balance owed", value: <FittedMoney cents={holding.cents} />, note: "What you owe now" },
      ...(holding.availableCents !== null && limited
        ? [{ label: "Available credit", value: <FittedMoney cents={holding.availableCents} />, note: "Left to spend" }]
        : []),
      ...(limited
        ? [
            { label: "Credit limit", value: <FittedMoney cents={holding.limitCents!} />, note: "Set by your bank" },
            {
              label: "Used",
              value: `${((Math.max(holding.cents, 0) / holding.limitCents!) * 100).toFixed(1)}%`,
              note: "Keep it below 30%",
            },
          ]
        : [{ label: "Credit limit", value: "None", note: "No preset spending limit" }]),
    ];
  }
  return [
    { label: "Current balance", value: <FittedMoney cents={holding.cents} />, note: "Total funds" },
    ...(holding.availableCents !== null
      ? [
          holding.type === "investment"
            ? { label: "Cash", value: <FittedMoney cents={holding.availableCents} />, note: "Not invested" }
            : { label: "Available balance", value: <FittedMoney cents={holding.availableCents} />, note: "Available to withdraw" },
        ]
      : []),
    ...(pendingCents !== 0 ? [{ label: "Pending", value: <FittedMoney cents={Math.abs(pendingCents)} />, note: "Funds on hold" }] : []),
  ];
}

function flowRows(entries: LedgerEntry[]): FlowRow[] {
  return monthRange(currentMonth(), 12).map((month) => {
    let inCents = 0;
    let outCents = 0;
    for (const entry of entries) {
      if (entry.month !== month) continue;
      if (entry.amountCents < 0) inCents -= entry.amountCents;
      else outCents += entry.amountCents;
    }
    return { month, label: monthLabel(month, "short").split(" ")[0], longLabel: monthLabel(month), inCents, outCents };
  });
}

function topCategories(entries: LedgerEntry[]) {
  const byCategory = new Map<string, { cents: number; count: number }>();
  for (const entry of entries) {
    const current = byCategory.get(entry.category) ?? { cents: 0, count: 0 };
    current.cents += Math.abs(entry.amountCents);
    current.count += 1;
    byCategory.set(entry.category, current);
  }
  return [...byCategory.entries()]
    .map(([category, total]) => ({ category, ...total }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, TOP_CATEGORIES);
}

export default async function AccountPage({ params }: PageProps<"/net-worth/[id]">) {
  if (!plaidConfigured()) return <SetupNotice />;
  const { id } = await params;
  const holding = (await loadHoldings()).find((item) => item.id === id);
  if (!holding) notFound();

  const investment = holding.type === "investment";
  const [allEntries, money, recurring, portfolio] = await Promise.all([
    loadActiveEntries(),
    getMoney(),
    loadRecurring(),
    investment ? loadPortfolio([holding]) : null,
  ]);
  const entries = allEntries.filter((entry) => entry.accountId === holding.id);
  const pendingCents = entries.filter((entry) => entry.pending).reduce((sum, entry) => sum + entry.amountCents, 0);
  const firstMonth = monthRange(currentMonth(), 12)[0];
  const yearEntries = entries.filter((entry) => entry.month >= firstMonth);
  const categories = topCategories(yearEntries);
  const streams = recurring.streams.filter((stream) => stream.accountId === holding.id && isCounted(stream));
  const categoryOptions = rankCategories(allEntries).map((key) => ({ value: key, label: CATEGORIES[key].label }));
  const stats = balanceStats(holding, pendingCents);
  const group = groupOf(holding.type);
  const holdingRows: HoldingRow[] = (portfolio?.positions ?? []).map((position) => ({
    key: `${position.accountId}:${position.securityId}`,
    ticker: position.ticker,
    name: position.name,
    assetClass: assetClassLabel(position.securityType),
    typeLabel: typeLabel(position.securityType),
    accountName: holding.name,
    quantity: position.quantity,
    priceCents: position.priceCents,
    valueCents: position.valueCents,
    costBasisCents: position.costBasisCents,
  }));

  return (
    <div className="page-wide space-y-5">
      <Link href="/net-worth" className="label inline-flex items-center gap-1 hover:text-ink">
        <Icon className="size-3.5">
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </Icon>
        Net Worth
      </Link>

      <header className="flex min-w-0 items-center gap-3.5">
        <span className="shrink-0 rounded-lg shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
          <AccountLogo holding={holding} size={44} />
        </span>
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-baseline gap-2 text-2xl font-medium tracking-tight">
            <span className="truncate">{holding.name}</span>
            {holding.mask && <span className="tabular shrink-0 text-base font-normal text-faint">{holding.mask}</span>}
          </h1>
          <p className="label mt-0.5 truncate">
            {group.label} · {subtypeLabel(holding)} · {holding.institutionName}
          </p>
        </div>
      </header>

      <div className={`grid grid-cols-2 gap-3 ${stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : ""}`}>
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      {investment ? (
        holdingRows.length > 0 ? (
          <HoldingsList rows={holdingRows} totalCents={holdingRows.reduce((sum, row) => sum + row.valueCents, 0)} />
        ) : (
          <section className="card px-5 py-10 text-center text-sm text-muted">No positions in this account.</section>
        )
      ) : (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="card min-w-0 px-4 pt-4 pb-3">
              <AccountFlowChart rows={flowRows(entries)} />
            </section>

            <div className="min-w-0 space-y-5">
              <section className="card">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
                  <h2 className="text-sm font-medium">Top categories</h2>
                  <span className="label">Past 12 months</span>
                </div>
                {categories.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">No transactions yet.</p>
                ) : (
                  <ol className="pb-2">
                    {categories.map((item, index) => {
                      const meta = categoryMeta(item.category);
                      return (
                        <li key={item.category}>
                          <Link
                            href={`/transactions?account=${holding.id}&category=${item.category}`}
                            className="row-wash flex items-center gap-2.5 px-4 py-2 sm:px-5"
                          >
                            <span className="tabular w-4 text-xs text-faint">{index + 1}</span>
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                            <span className="min-w-0 flex-1 truncate text-sm">{meta.label}</span>
                            <span className="tabular text-xs text-faint">×{item.count}</span>
                            <span className="tabular text-sm font-medium">
                              <Money cents={item.cents} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              <section className="card">
                <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
                  <h2 className="text-sm font-medium">Recurring</h2>
                  <Link href="/recurring" className="label hover:text-ink">
                    View all →
                  </Link>
                </div>
                {streams.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">No recurring payments on this account.</p>
                ) : (
                  <ul className="pb-2">
                    {streams.slice(0, RECURRING_ROWS).map((stream) => {
                      const inflow = stream.direction === "inflow";
                      return (
                        <li key={stream.id}>
                          <Link href={`/recurring/${stream.id}`} className="row-wash flex items-center gap-3 px-4 py-2 sm:px-5">
                            <MerchantAvatar name={stream.name} logoUrl={stream.logoUrl} size={28} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{stream.name}</p>
                              <p className="label">{frequencyMeta(stream.frequency).label}</p>
                            </div>
                            <span className={`tabular shrink-0 text-sm font-medium ${inflow ? "text-positive" : ""}`}>
                              {inflow ? "+" : ""}
                              <Money cents={stream.amountCents} />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                    {streams.length > RECURRING_ROWS && (
                      <li className="label px-4 pt-1 pb-2 sm:px-5">+{streams.length - RECURRING_ROWS} more</li>
                    )}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <section className="card">
            <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
              <h2 className="text-sm font-medium">Transactions</h2>
              {entries.length > 0 && (
                <Link href={`/transactions?account=${holding.id}`} className="label hover:text-ink">
                  View all {entries.length} →
                </Link>
              )}
            </div>
            {entries.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-muted">No transactions on this account yet.</p>
            ) : (
              <ul className="divide-y divide-line/60 border-t border-line/60">
                {entries.slice(0, RECENT_ROWS).map((entry) => (
                  <TransactionRow key={entry.id} entry={entry} options={categoryOptions} money={money} showDate />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
