import Link from "next/link";
import { AccountItem, AccountLogo, AccountName, Icon } from "@/components/AccountParts";
import { AllocationMap, ASSET_COLORS } from "@/components/AllocationMap";
import { HoldingsList, type HoldingRow } from "@/components/HoldingsList";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { NetWorthChart } from "@/components/NetWorthChart";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SecurityLogo } from "@/components/SecurityLogo";
import { SetupNotice } from "@/components/SetupNotice";
import { getDb } from "@/lib/db";
import { formatCents, formatDate } from "@/lib/months";
import { loadHistory, loadHoldings } from "@/lib/netWorth";
import { plaidConfigured } from "@/lib/plaid";
import { assetClassLabel, loadPortfolio, typeLabel } from "@/lib/portfolio";
import { items, type investmentTransactions } from "@/lib/schema";

export const dynamic = "force-dynamic";

type Activity = typeof investmentTransactions.$inferSelect;

const YEAR_ROWS = [
  {
    key: "dividendsCents",
    label: "Dividends",
    tone: "border-sky-600/20 bg-sky-600/10 text-sky-700",
    icon: <path d="M10 4.5v11M13 7c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.2 2.2-3 2.2-1.4 0-2.6-.6-3-1.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    key: "interestCents",
    label: "Interest",
    tone: "border-violet-600/20 bg-violet-600/10 text-violet-700",
    icon: <path d="m5.5 14.5 9-9M6.5 7.5h.01M13.5 12.5h.01" strokeLinecap="round" strokeWidth="2" />,
  },
  {
    key: "feesCents",
    label: "Fees",
    tone: "border-edge bg-surface text-muted",
    icon: <path d="M6 3.5h8v13l-2-1.25-2 1.25-2-1.25-2 1.25zM8.5 7.5h3M8.5 10.5h3" strokeLinecap="round" strokeLinejoin="round" />,
  },
] as const;

function ActivityRow({ entry, compact, equities }: { entry: Activity; compact: boolean; equities: Set<string> }) {
  const credit = entry.amountCents < 0;
  const kind = entry.subtype.charAt(0).toUpperCase() + entry.subtype.slice(1);
  return (
    <li className={`flex items-center gap-3 ${compact ? "py-1.5" : "px-5 py-2.5"}`}>
      {entry.ticker && equities.has(entry.ticker) ? (
        <SecurityLogo ticker={entry.ticker} name={entry.name} size={compact ? 20 : 28} />
      ) : (
        <MerchantAvatar name={entry.ticker ?? entry.name} logoUrl={null} size={compact ? 20 : 28} shape="square" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate ${compact ? "text-xs" : "text-sm"}`}>{entry.name}</p>
        <p className="label">
          {formatDate(entry.date)} · {kind}
        </p>
      </div>
      <span className={`tabular whitespace-nowrap ${compact ? "text-xs" : "text-sm font-medium"} ${credit ? "text-positive" : ""}`}>
        {credit ? "+" : ""}
        {formatCents(Math.abs(entry.amountCents))}
      </span>
    </li>
  );
}

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const view = (await searchParams).view === "activity" ? "activity" : "holdings";
  const [allHoldings, connections] = await Promise.all([loadHoldings(), getDb().select().from(items).all()]);
  const accounts = allHoldings.filter((holding) => holding.type === "investment").sort((a, b) => b.cents - a.cents);

  if (accounts.length === 0) {
    return (
      <div className="card mx-auto mt-16 max-w-md px-8 py-10 text-center">
        <h1 className="text-lg font-medium">No investment accounts</h1>
        <p className="mt-2 text-sm text-muted">Connect a brokerage or retirement account to see your positions.</p>
        <div className="mt-6 flex justify-center">
          <PlaidLinkButton label="Connect account" />
        </div>
      </div>
    );
  }

  const totalCents = accounts.reduce((total, account) => total + account.cents, 0);
  const [history, portfolio] = await Promise.all([loadHistory(accounts, totalCents), loadPortfolio(accounts)]);
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const rows: HoldingRow[] = portfolio.positions.map((position) => ({
    key: `${position.accountId}:${position.securityId}`,
    ticker: position.ticker,
    name: position.name,
    assetClass: assetClassLabel(position.securityType),
    typeLabel: typeLabel(position.securityType),
    accountName: accountNames.get(position.accountId) ?? "",
    quantity: position.quantity,
    priceCents: position.priceCents,
    valueCents: position.valueCents,
    costBasisCents: position.costBasisCents,
  }));
  const equities = new Set(
    rows.filter((row) => row.assetClass === "Equities" && row.ticker).map((row) => row.ticker!),
  );
  const positionsCents = rows.reduce((total, row) => total + row.valueCents, 0);
  const brokers = connections.filter(
    (item) => item.investmentsError && accounts.some((account) => account.itemId === item.id),
  );

  return (
    <div className="page-wide space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">Investments</h1>
        <nav className="flex rounded-full border border-edge bg-surface p-0.5" aria-label="Investments view">
          {(["holdings", "activity"] as const).map((option) => (
            <Link
              key={option}
              href={option === "holdings" ? "/investments" : "/investments?view=activity"}
              aria-current={view === option ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                view === option ? "bg-ink text-canvas" : "text-muted hover:text-ink"
              }`}
            >
              {option === "holdings" ? "Holdings" : "Activity"}
            </Link>
          ))}
        </nav>
      </header>

      {brokers.map((item) =>
        item.investmentsError === "ADDITIONAL_CONSENT_REQUIRED" ? (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge bg-surface px-4 py-3 text-sm"
          >
            <span>{item.institutionName} has not shared your positions yet. Reconnect once to allow it.</span>
            <PlaidLinkButton itemId={item.id} label="Share positions" variant="secondary" addInvestments />
          </div>
        ) : (
          <div key={item.id} className="rounded-xl border border-negative/20 bg-negative/5 px-4 py-3 text-sm">
            Could not load positions from {item.institutionName}: {item.investmentsError}
          </div>
        ),
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <NetWorthChart points={history} title="Portfolio" />
          </section>

          {view === "holdings" ? (
            <HoldingsList rows={rows} totalCents={positionsCents} />
          ) : (
            <section className="card">
              <h2 className="px-5 pt-4 pb-2 text-sm font-medium">Activity</h2>
              {portfolio.activity.length === 0 ? (
                <p className="px-5 pt-4 pb-8 text-center text-sm text-muted">No activity yet.</p>
              ) : (
                <ul className="pb-2">
                  {portfolio.activity.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} compact={false} equities={equities} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="card px-5 py-5">
            <h2 className="text-sm font-medium">By account</h2>
            <ul className="-mx-5 mt-2">
              {accounts.map((account) => (
                <AccountItem key={account.id} holding={account} className="flex items-center gap-2.5 px-5 py-2.5 text-sm">
                  <AccountLogo holding={account} size={20} />
                  <span className="min-w-0 flex-1">
                    <AccountName holding={account} />
                  </span>
                  <span className="tabular">{formatCents(account.cents)}</span>
                </AccountItem>
              ))}
            </ul>
          </section>

          <section className="card px-5 py-5">
            <h2 className="text-sm font-medium">This year</h2>
            <dl className="mt-3 space-y-1">
              {YEAR_ROWS.map((row) => (
                <div key={row.key} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border ${row.tone}`}>
                    <Icon className="size-3.5">{row.icon}</Icon>
                  </span>
                  <dt className="flex-1">{row.label}</dt>
                  <dd className="tabular">{formatCents(portfolio.yearToDate[row.key])}</dd>
                </div>
              ))}
            </dl>
          </section>

          {portfolio.allocation.length > 0 && (
            <section className="card px-5 py-5">
              <h2 className="text-sm font-medium">Allocation</h2>
              <AllocationMap items={portfolio.allocation} colors={ASSET_COLORS} empty="No positions." />
            </section>
          )}

          {portfolio.activity.length > 0 && (
            <section className="card px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">Recent activity</h2>
                {view === "holdings" && portfolio.activity.length > 3 && (
                  <Link href="/investments?view=activity" className="label hover:text-ink">
                    View all →
                  </Link>
                )}
              </div>
              <ul className="mt-2">
                {portfolio.activity.slice(0, 3).map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} compact equities={equities} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
