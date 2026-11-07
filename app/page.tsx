import Link from "next/link";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { PendingIcon } from "@/components/PendingIcon";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { TodayLabel } from "@/components/TodayLabel";
import { getDb } from "@/lib/db";
import { loadActiveEntries, summarize, type LedgerEntry } from "@/lib/ledger";
import { addMonths, currentMonth, daysBefore, formatCents, formatDate, monthLabel } from "@/lib/months";
import { loadHistory, loadHoldings, type HistoryPoint } from "@/lib/netWorth";
import { plaidConfigured } from "@/lib/plaid";
import { items } from "@/lib/schema";

export const dynamic = "force-dynamic";

const INCOME_CATEGORIES = ["SALARY", "OTHER_INCOME"];
const RECENT_COUNT = 5;

function pastMonth(points: HistoryPoint[]): HistoryPoint[] {
  const from = daysBefore(points[points.length - 1].date, 30);
  const visible = points.filter((point) => point.date >= from);
  return visible.length > 1 ? visible : points.slice(-2);
}

function Sparkline({ points, rising }: { points: HistoryPoint[]; rising: boolean }) {
  const values = points.map((point) => point.cents);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const line = points
    .map((point, index) => {
      const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
      const y = 28 - ((point.cents - low) / span) * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const color = rising ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className="mt-auto block h-16 w-full">
      <polygon points={`0,32 ${line} 100,32`} fill={color} fillOpacity={0.08} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

async function NetWorthCard() {
  const holdings = await loadHoldings();
  if (holdings.length === 0) {
    return (
      <Link href="/net-worth" className="card row-wash flex flex-col px-4 py-4">
        <p className="label">Net Worth</p>
        <p className="mt-3 text-sm text-muted">No balances yet. Refresh to load your accounts.</p>
      </Link>
    );
  }
  const netCents = holdings.reduce((total, holding) => total + (holding.kind === "asset" ? holding.cents : -holding.cents), 0);
  const points = pastMonth(await loadHistory(holdings, netCents));
  const change = netCents - points[0].cents;
  const share = points[0].cents !== 0 ? (Math.abs(change) / Math.abs(points[0].cents)) * 100 : 0;
  const tone = change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted";

  return (
    <Link href="/net-worth" className="card row-wash flex min-h-54 flex-col overflow-hidden">
      <div className="px-4 pt-4">
        <p className="label">Net Worth</p>
        <p className="tabular mt-1 text-xl font-medium tracking-tight sm:text-2xl">{formatCents(netCents)}</p>
        <p className="tabular mt-1 text-xs">
          <span className={tone}>
            {change > 0 ? "▲" : change < 0 ? "▼" : ""} {formatCents(Math.abs(change))} ({share.toFixed(1)}%)
          </span>{" "}
          <span className="text-faint">Past month</span>
        </p>
      </div>
      <Sparkline points={points} rising={change >= 0} />
    </Link>
  );
}

type MonthTotals = { incomeCents: number; spendingCents: number; savingsCents: number };

function monthTotals(entries: LedgerEntry[], month: string): MonthTotals {
  let incomeCents = 0;
  let savingsCents = 0;
  for (const entry of entries) {
    if (entry.month !== month || entry.removed) continue;
    if (INCOME_CATEGORIES.includes(entry.category)) incomeCents -= entry.amountCents;
    if (entry.category === "SAVINGS") savingsCents += entry.amountCents;
  }
  return { incomeCents, spendingCents: summarize(entries, month).totalCents, savingsCents };
}

function Meter({
  label,
  cents,
  previousCents,
  previousLabel,
  fill,
}: {
  label: string;
  cents: number;
  previousCents: number;
  previousLabel: string;
  fill: string;
}) {
  const ratio = previousCents > 0 ? Math.max(cents, 0) / previousCents : cents > 0 ? 1 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className="tabular flex min-w-0 flex-wrap items-baseline justify-end gap-x-1 text-sm">
          {formatCents(cents)}
          <span className="label hidden whitespace-nowrap sm:inline">
            / {formatCents(previousCents)} in {previousLabel}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
    </div>
  );
}

function MonthCard({ entries }: { entries: LedgerEntry[] }) {
  const month = currentMonth();
  const previousMonth = addMonths(month, -1);
  const current = monthTotals(entries, month);
  const previous = monthTotals(entries, previousMonth);
  const previousLabel = monthLabel(previousMonth, "medium").split(" ")[0];
  const overspent = previous.spendingCents > 0 && current.spendingCents > previous.spendingCents;

  return (
    <Link href="/spending" className="card row-wash flex min-h-54 flex-col px-4 py-4">
      <p className="label">{monthLabel(month)}</p>
      <div className="mt-4 space-y-5">
        <Meter
          label="Income"
          cents={current.incomeCents}
          previousCents={previous.incomeCents}
          previousLabel={previousLabel}
          fill="bg-positive"
        />
        <Meter
          label="Spending"
          cents={current.spendingCents}
          previousCents={previous.spendingCents}
          previousLabel={previousLabel}
          fill={overspent ? "bg-negative" : "bg-ink/70"}
        />
        <Meter
          label="Savings"
          cents={current.savingsCents}
          previousCents={previous.savingsCents}
          previousLabel={previousLabel}
          fill="bg-positive"
        />
      </div>
    </Link>
  );
}

function RecentCard({ entries }: { entries: LedgerEntry[] }) {
  const recent = entries.slice(0, RECENT_COUNT);
  return (
    <Link href="/transactions" className="card row-wash col-span-2 block px-4 py-4">
      <p className="label">Recent</p>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No transactions yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {recent.map((entry) => {
            const moneyIn = entry.amountCents < 0;
            return (
              <li key={entry.id} className={`flex items-center gap-3 ${entry.removed ? "opacity-60" : ""}`}>
                <MerchantAvatar name={entry.merchant} logoUrl={entry.logoUrl} size={20} shape="square" />
                <span className="min-w-0 flex-1 truncate text-sm" title={entry.description}>
                  {entry.merchant}
                </span>
                <span className="tabular shrink-0 text-xs text-faint">{formatDate(entry.date)}</span>
                <span className="flex w-28 shrink-0 items-center justify-end gap-1.5">
                  {entry.pending && (
                    <span className="text-faint" title="Pending">
                      <PendingIcon />
                    </span>
                  )}
                  <span className={`tabular whitespace-nowrap text-sm ${moneyIn ? "text-positive" : ""}`}>
                    {moneyIn ? "+" : ""}
                    {formatCents(Math.abs(entry.amountCents))}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}

export default async function HomePage() {
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

  const entries = await loadActiveEntries();
  const broken = connections.filter((item) => item.status !== "ok");

  return (
    <div className="mx-auto max-w-2xl space-y-8 md:pt-17.5">
      <header>
        <TodayLabel />
        <h1 className="sr-only">Home</h1>
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

      <div className="grid grid-cols-2 gap-4">
        <NetWorthCard />
        <MonthCard entries={entries} />
        <RecentCard entries={entries} />
      </div>
    </div>
  );
}
