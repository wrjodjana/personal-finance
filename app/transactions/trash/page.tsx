import Link from "next/link";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { Money } from "@/components/MoneyProvider";
import { RestoreButton } from "@/components/RestoreButton";
import { SetupNotice } from "@/components/SetupNotice";
import { loadTrash } from "@/lib/ledger";
import { formatDay } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  if (!plaidConfigured()) return <SetupNotice />;

  const entries = await loadTrash();

  return (
    <div className="space-y-4">
      <header>
        <Link href="/transactions" className="label inline-flex items-center gap-1 hover:text-ink">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5" aria-hidden>
            <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Transactions
        </Link>
        <h1 className="mt-1 text-xl font-medium tracking-tight">Trash</h1>
        <p className="label mt-1">Deleted transactions stay here and are left out of every list and total. Restore one to bring it back.</p>
      </header>

      {entries.length === 0 ? (
        <section className="card px-5 py-12 text-center text-sm text-muted">Trash is empty.</section>
      ) : (
        <section className="card">
          <ul className="divide-y divide-line/60">
            {entries.map((entry) => {
              const moneyIn = entry.amountCents < 0;
              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_7rem_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MerchantAvatar name={entry.merchant} logoUrl={entry.logoUrl} size={24} shape="square" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{entry.merchant}</p>
                      <p className="truncate text-xs text-faint">{formatDay(entry.date)}</p>
                    </div>
                  </div>
                  <div className="hidden min-w-0 items-center gap-2 sm:flex">
                    <InstitutionLogo name={entry.account.institution} logoUrl={entry.account.logoUrl} color={entry.account.color} size={16} />
                    <span className="truncate text-xs text-muted">{entry.account.name}</span>
                    {entry.account.mask && <span className="tabular shrink-0 text-xs text-faint">{entry.account.mask}</span>}
                  </div>
                  <span className={`tabular whitespace-nowrap text-right text-sm ${moneyIn ? "text-positive" : ""}`}>
                    {moneyIn ? "+" : ""}
                    <Money cents={Math.abs(entry.amountCents)} />
                  </span>
                  <RestoreButton transactionId={entry.id} merchant={entry.merchant} />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
