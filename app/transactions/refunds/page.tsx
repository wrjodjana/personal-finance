import Link from "next/link";
import { IncludeRefundButton } from "@/components/IncludeRefundButton";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { SetupNotice } from "@/components/SetupNotice";
import { loadRefunds, type RefundPair } from "@/lib/ledger";
import { formatCents, formatDate, monthLabel } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";

export const dynamic = "force-dynamic";

function groupByMonth(pairs: RefundPair[]) {
  const months: { month: string; pairs: RefundPair[] }[] = [];
  for (const pair of pairs) {
    let group = months[months.length - 1];
    if (!group || group.month !== pair.refund.month) {
      group = { month: pair.refund.month, pairs: [] };
      months.push(group);
    }
    group.pairs.push(pair);
  }
  return months;
}

function purchaseDate(purchase: string, refund: string): string {
  return purchase.slice(0, 4) === refund.slice(0, 4) ? formatDate(purchase) : `${formatDate(purchase)}, ${purchase.slice(0, 4)}`;
}

export default async function RefundsPage() {
  if (!plaidConfigured()) return <SetupNotice />;

  const pairs = await loadRefunds();

  return (
    <div className="space-y-4">
      <header>
        <Link href="/transactions" className="label inline-flex items-center gap-1 hover:text-ink">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5" aria-hidden>
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Transactions
        </Link>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Refunds</h1>
        <p className="label mt-1">
          A refund for the same amount, at the same merchant, on the same card, within 180 days cancels out its purchase. Both are left out of
          totals. Include a pair to count both again.
        </p>
      </header>

      {pairs.length === 0 ? (
        <section className="card px-5 py-12 text-center text-sm text-muted">No refunds found.</section>
      ) : (
        <div className="space-y-6">
          {groupByMonth(pairs).map((group) => (
            <section key={group.month} className="card">
              <div className="rounded-t-[calc(0.875rem-1px)] border-b border-line/70 bg-surface/60 px-4 py-2">
                <h2 className="text-xs font-medium">{monthLabel(group.month)}</h2>
              </div>
              <ul className="divide-y divide-line/60">
                {group.pairs.map(({ purchase, refund }) => (
                  <li
                    key={refund.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 last:rounded-b-[calc(0.875rem-1px)] sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_7rem_auto]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MerchantAvatar name={purchase.merchant} logoUrl={purchase.logoUrl ?? refund.logoUrl} size={24} shape="square" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{purchase.merchant}</p>
                        <p className="truncate text-xs text-faint">
                          Bought {purchaseDate(purchase.date, refund.date)} · Refunded {formatDate(refund.date)}
                        </p>
                      </div>
                    </div>
                    <div className="hidden min-w-0 items-center gap-2 sm:flex">
                      <InstitutionLogo
                        name={purchase.account.institution}
                        logoUrl={purchase.account.logoUrl}
                        color={purchase.account.color}
                        size={16}
                      />
                      <span className="truncate text-xs text-muted">{purchase.account.name}</span>
                      {purchase.account.mask && <span className="tabular shrink-0 text-xs text-faint">{purchase.account.mask}</span>}
                    </div>
                    <span className="tabular whitespace-nowrap text-right text-sm">{formatCents(purchase.amountCents)}</span>
                    <IncludeRefundButton transactionIds={[purchase.id, refund.id]} merchant={purchase.merchant} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
