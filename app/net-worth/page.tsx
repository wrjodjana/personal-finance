import Link from "next/link";
import { AccountItem, AccountLogo, AccountName, Icon } from "@/components/AccountParts";
import { HintBody, HintRow, InfoHint } from "@/components/InfoHint";
import { NetWorthBreakdown, type BreakdownSlice } from "@/components/NetWorthBreakdown";
import { NetWorthChart } from "@/components/NetWorthChart";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { formatCents } from "@/lib/months";
import { groupHoldings, loadHistory, loadHoldings } from "@/lib/netWorth";
import { plaidConfigured } from "@/lib/plaid";

export const dynamic = "force-dynamic";

const GROUP_ICONS: Record<string, React.ReactNode> = {
  depository: <path d="M3 7.5h14v8H3zM3 10h14M6.5 13h2" strokeLinecap="round" strokeLinejoin="round" />,
  investment: <path d="m3.5 14 4-4.5 3 2.5 6-6.5M12.5 5.5h4v4" strokeLinecap="round" strokeLinejoin="round" />,
  other: <path d="M10 3.5v13M3.5 10h13" strokeLinecap="round" />,
  credit: <path d="M3 5.5h14v9H3zM3 8.5h14M6 11.5h3" strokeLinecap="round" strokeLinejoin="round" />,
  loan: <path d="M4 16.5h12M5.5 16.5v-6m3 6v-6m3 6v-6m3 6v-6M3.5 8.5 10 4l6.5 4.5z" strokeLinecap="round" strokeLinejoin="round" />,
};

function Metric({ label, value, info, tone, icon }: { label: string; value: string; info: React.ReactNode; tone: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${tone}`}>
        <Icon>{icon}</Icon>
      </span>
      <div className="min-w-0">
        <p className="tabular truncate text-base font-medium tracking-tight">{value}</p>
        <p className="label flex items-center gap-1">
          {label}
          <InfoHint label={`About ${label}`}>{info}</InfoHint>
        </p>
      </div>
    </div>
  );
}

function utilizationGrade(percent: number) {
  if (percent < 10) return { label: "Excellent", tone: "text-positive", bar: "bg-positive" };
  if (percent < 30) return { label: "Good", tone: "text-positive", bar: "bg-positive" };
  if (percent < 50) return { label: "Fair", tone: "text-amber-700", bar: "bg-amber-500" };
  return { label: "High", tone: "text-negative", bar: "bg-negative" };
}

const percent = (value: number) => `${value < 10 && value > 0 ? value.toFixed(1) : Math.round(value)}%`;

export default async function NetWorthPage() {
  if (!plaidConfigured()) return <SetupNotice />;

  const holdings = await loadHoldings();
  if (holdings.length === 0) {
    return (
      <div className="card mx-auto mt-16 max-w-md px-8 py-10 text-center">
        <h1 className="text-lg font-medium">No balances yet</h1>
        <p className="mt-2 text-sm text-muted">
          Connect an account, or refresh to load balances for the accounts you already have.
        </p>
        <div className="mt-6 flex justify-center">
          <PlaidLinkButton label="Connect account" />
        </div>
      </div>
    );
  }

  const assets = holdings.filter((holding) => holding.kind === "asset");
  const liabilities = holdings.filter((holding) => holding.kind === "liability");
  const assetCents = assets.reduce((total, holding) => total + holding.cents, 0);
  const liabilityCents = liabilities.reduce((total, holding) => total + holding.cents, 0);
  const netCents = assetCents - liabilityCents;
  const cashCents = holdings.filter((holding) => holding.type === "depository").reduce((total, holding) => total + holding.cents, 0);
  const cards = holdings.filter((holding) => holding.type === "credit");
  const cardDebtCents = cards.reduce((total, holding) => total + holding.cents, 0);
  const debtRatio = assetCents > 0 ? (liabilityCents / assetCents) * 100 : null;

  const limited = cards.filter((card) => card.limitCents && card.limitCents > 0);
  const unlimited = cards.filter((card) => !card.limitCents || card.limitCents <= 0);
  const usedCents = limited.reduce((total, card) => total + Math.max(card.cents, 0), 0);
  const limitCents = limited.reduce((total, card) => total + card.limitCents!, 0);
  const utilization = limitCents > 0 ? (usedCents / limitCents) * 100 : null;
  const grade = utilization === null ? null : utilizationGrade(utilization);
  const payDown = limited
    .map((card) => ({ card, share: (Math.max(card.cents, 0) / card.limitCents!) * 100 }))
    .filter((entry) => entry.share >= 10)
    .sort((a, b) => b.share - a.share);

  const groups = groupHoldings(holdings);
  const largestAssets = [...assets].filter((holding) => holding.cents > 0).sort((a, b) => b.cents - a.cents).slice(0, 5);
  const slices: BreakdownSlice[] = groups.flatMap((group) =>
    group.subtypes.map((subtype) => ({ label: subtype.label, cents: subtype.totalCents, kind: group.kind })),
  );
  const history = await loadHistory(holdings, netCents);

  return (
    <div className="page-wide space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {holdings.length} {holdings.length === 1 ? "account" : "accounts"}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Net worth</h1>
        </div>
        <Link href="/accounts" className="control inline-flex h-9 items-center gap-2 px-3 text-sm hover:text-ink">
          <Icon className="size-4 text-muted">
            <path d="M8.5 4.5h-4v11h11v-4M11.5 3.5h5v5M16.5 3.5 9.5 10.5" strokeLinecap="round" strokeLinejoin="round" />
          </Icon>
          Manage accounts
        </Link>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <NetWorthChart points={history} />
          </section>

          {groups.map((group) => (
            <section key={group.type} className="card">
              <div className="flex items-center justify-between gap-4 border-b border-line/70 px-5 py-3">
                <h2 className="flex items-center gap-2.5 text-sm font-medium">
                  <Icon className="size-4 text-muted">{GROUP_ICONS[group.type]}</Icon>
                  {group.label}
                </h2>
                <span className="tabular text-sm font-medium">{formatCents(group.totalCents)}</span>
              </div>
              <div className="py-1.5">
                {group.subtypes.map((subtype) => (
                  <div key={subtype.label}>
                    {group.subtypes.length > 1 && (
                      <div className="flex items-center justify-between px-5 pt-3 pb-1">
                        <span className="eyebrow">{subtype.label}</span>
                        <span className="tabular label">{formatCents(subtype.totalCents)}</span>
                      </div>
                    )}
                    <ul>
                      {subtype.holdings.map((holding) => (
                        <AccountItem key={holding.id} holding={holding} className="flex items-center gap-3 px-5 py-2 text-sm">
                          <AccountLogo holding={holding} size={24} />
                          <span className="min-w-0 flex-1">
                            <AccountName holding={holding} />
                          </span>
                          <span className="tabular whitespace-nowrap font-medium">{formatCents(holding.cents)}</span>
                        </AccountItem>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="min-w-0 space-y-5">
          <section className="card grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5">
            <Metric
              label="Assets"
              value={formatCents(assetCents)}
              info={
                <HintBody
                  title="Total Assets"
                  text="Everything you own: bank accounts, investments and other assets. A higher number means more wealth to work with."
                >
                  <div className="space-y-1.5">
                    {groups
                      .filter((group) => group.kind === "asset")
                      .map((group) => (
                        <HintRow key={group.type} label={group.label} value={formatCents(group.totalCents)} />
                      ))}
                  </div>
                </HintBody>
              }
              tone="border-positive/20 bg-positive/10 text-positive"
              icon={<path d="m4 13.5 4-4 3 3 5-5.5M12.5 7h3.5v3.5" strokeLinecap="round" strokeLinejoin="round" />}
            />
            <Metric
              label="Liabilities"
              value={formatCents(liabilityCents)}
              info={
                <HintBody title="Total Liabilities" text="Everything you owe: credit card balances, loans and other debts.">
                  <div className="space-y-1.5">
                    {groups
                      .filter((group) => group.kind === "liability")
                      .map((group) => (
                        <HintRow key={group.type} label={group.label} value={formatCents(group.totalCents)} />
                      ))}
                  </div>
                </HintBody>
              }
              tone="border-amber-500/20 bg-amber-500/10 text-amber-700"
              icon={<path d="m4 6.5 4 4 3-3 5 5.5M12.5 13h3.5V9.5" strokeLinecap="round" strokeLinejoin="round" />}
            />
            <Metric
              label="Net cash"
              value={formatCents(cashCents - cardDebtCents)}
              info={
                <HintBody
                  title="What is Net Cash?"
                  text="Your bank balances minus credit card debt. This is what you could spend today without going further into debt."
                >
                  <div className="space-y-1.5">
                    <HintRow label="Cash" value={formatCents(cashCents)} />
                    <HintRow label="Credit cards" value={`-${formatCents(cardDebtCents)}`} tone="text-negative" />
                    <div className="border-t border-line pt-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span>Net Cash</span>
                        <span className="tabular">{formatCents(cashCents - cardDebtCents)}</span>
                      </div>
                    </div>
                  </div>
                </HintBody>
              }
              tone="border-sky-600/20 bg-sky-600/10 text-sky-700"
              icon={<path d="M4 6.5h11.5v9H4zM4 6.5l9-2.5v2.5M12.5 11h.01" strokeLinecap="round" strokeLinejoin="round" />}
            />
            <Metric
              label="Debt ratio"
              value={debtRatio === null ? "-" : `${debtRatio.toFixed(1)}%`}
              info={
                <HintBody
                  title="What is Debt Ratio?"
                  text="Your total liabilities divided by total assets. Shows what portion of your wealth is owed to others."
                >
                  <div className="space-y-1">
                    <div className="flex h-3 w-full overflow-hidden rounded-full">
                      <div className="h-full w-1/5 bg-positive/60" />
                      <div className="h-full w-1/5 bg-positive/30" />
                      <div className="h-full w-1/5 bg-amber-500/60" />
                      <div className="h-full w-2/5 bg-negative/60" />
                    </div>
                    <div className="tabular flex justify-between">
                      <span className="text-positive">0-20%</span>
                      <span className="text-positive">20-40%</span>
                      <span className="text-amber-700">40-60%</span>
                      <span className="text-negative">60%+</span>
                    </div>
                  </div>
                  <p className="text-faint">Below 20% is considered excellent financial health.</p>
                </HintBody>
              }
              tone="border-teal-600/20 bg-teal-600/10 text-teal-700"
              icon={<path d="M10 4v12M6 16h8M4.5 7h11M4.5 7 3 11h3zM15.5 7 14 11h3z" strokeLinecap="round" strokeLinejoin="round" />}
            />
          </section>

          {cards.length > 0 && (
            <section className="card px-5 py-5">
              <h2 className="flex items-center gap-1.5 text-sm font-medium">
                Credit utilization
                <InfoHint label="What is credit utilization?" plain>
                  <p>How much of your available credit you&apos;re using. Keeping it under 30% helps your credit score.</p>
                </InfoHint>
              </h2>
              {utilization === null || grade === null ? (
                <p className="mt-3 text-sm text-muted">Your card issuers did not report credit limits.</p>
              ) : (
                <>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className={`tabular text-3xl font-medium tracking-tight ${grade.tone}`}>{percent(utilization)}</span>
                    <span className={`text-sm font-medium ${grade.tone}`}>{grade.label}</span>
                  </p>
                  <p className="label tabular mt-1">
                    {formatCents(usedCents)} of {formatCents(limitCents)} used · {limited.length} of {cards.length}{" "}
                    {cards.length === 1 ? "card" : "cards"}
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line/80">
                    <div className={`h-full rounded-full ${grade.bar}`} style={{ width: `${Math.min(Math.max(utilization, 1.5), 100)}%` }} />
                  </div>
                  <p className="label mt-2">Keep it below 30% for a good credit score.</p>
                </>
              )}
              {payDown.length > 0 && (
                <div className="mt-4 border-t border-line/70 pt-4">
                  <p className="label">Cards to pay down</p>
                  <ul className="mt-2 space-y-2">
                    {payDown.map(({ card, share }) => (
                      <li key={card.id} className="flex items-center gap-3 text-xs">
                        <span className="min-w-0 flex-1">
                          <AccountName holding={card} />
                        </span>
                        <span className="tabular">{formatCents(card.cents)}</span>
                        <span className={`tabular w-9 text-right font-medium ${utilizationGrade(share).tone}`}>{percent(share)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {unlimited.length > 0 && utilization !== null && (
                <div className="mt-4 border-t border-line/70 pt-4">
                  <p className="label flex items-center gap-1">
                    Not included
                    <InfoHint label="Why are these cards excluded?" plain>
                      <p>
                        Cards without a known credit limit aren&apos;t part of the percentage. This includes charge cards with no
                        preset spending limit, such as the Amex Gold.
                      </p>
                    </InfoHint>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {unlimited.map((card) => (
                      <li key={card.id} className="flex items-center gap-3 text-xs">
                        <span className="min-w-0 flex-1">
                          <AccountName holding={card} />
                        </span>
                        <span className="tabular">{formatCents(card.cents)}</span>
                        <span className="text-faint">No limit</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {largestAssets.length > 0 && (
            <section className="card px-5 py-5">
              <h2 className="text-sm font-medium">Largest assets</h2>
              <ul className="-mx-5 mt-2">
                {largestAssets.map((holding) => (
                  <AccountItem key={holding.id} holding={holding} className="flex items-center gap-2.5 px-5 py-2 text-xs">
                    <AccountLogo holding={holding} size={20} />
                    <span className="min-w-0 flex-1">
                      <AccountName holding={holding} />
                    </span>
                    <span className="tabular">{formatCents(holding.cents)}</span>
                  </AccountItem>
                ))}
              </ul>
            </section>
          )}

          <section className="card px-5 py-5">
            <NetWorthBreakdown slices={slices} />
          </section>

          {holdings.some((holding) => holding.type === "investment") && (
            <Link href="/investments" className="card flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface">
              <Icon className="size-5 text-muted">
                <path d="m3.5 14 4-4.5 3 2.5 6-6.5M12.5 5.5h4v4" strokeLinecap="round" strokeLinejoin="round" />
              </Icon>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Investments</span>
                <span className="label block">Positions, allocation and activity</span>
              </span>
              <Icon className="size-4 text-faint">
                <path d="m8 4.5 5.5 5.5L8 15.5" strokeLinecap="round" strokeLinejoin="round" />
              </Icon>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
