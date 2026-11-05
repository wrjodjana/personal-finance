import { count, eq } from "drizzle-orm";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { institutionLogoUrl } from "@/lib/branding";
import { getDb } from "@/lib/db";
import { plaidConfigured } from "@/lib/plaid";
import { accounts, items, transactions } from "@/lib/schema";

export const dynamic = "force-dynamic";

const CONNECTION_LIMIT = 20;

function syncedAgo(iso: string | null): string {
  if (!iso) return "Never synced";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function Status({ status, errorCode, importing }: { status: string; errorCode: string | null; importing: boolean }) {
  if (status === "needs_reconnect") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-negative">
        <span className="size-2 rounded-full bg-negative" />
        Action required
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-negative" title={errorCode ?? undefined}>
        <span className="size-2 rounded-full bg-negative" />
        Sync error{errorCode ? `: ${errorCode}` : ""}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className={`size-2 rounded-full ${importing ? "animate-pulse bg-faint" : "bg-positive"}`} />
      {importing ? "Importing history" : "Connected"}
    </span>
  );
}

export default async function AccountsPage() {
  if (!plaidConfigured()) return <SetupNotice />;

  const db = getDb();
  const [connections, allAccounts, countRows] = await Promise.all([
    db.select().from(items).all(),
    db.select().from(accounts).all(),
    db
      .select({ accountId: transactions.accountId, total: count() })
      .from(transactions)
      .groupBy(transactions.accountId)
      .all(),
  ]);
  const counts = new Map(countRows.map((row) => [row.accountId, row.total]));
  const totalAccounts = allAccounts.length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {connections.length} of {CONNECTION_LIMIT} connections · {totalAccounts}{" "}
            {totalAccounts === 1 ? "account" : "accounts"}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Accounts</h1>
        </div>
        {connections.length < CONNECTION_LIMIT && <PlaidLinkButton label="New connection" />}
      </header>

      {connections.length === 0 && (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm font-medium">No accounts connected yet</p>
          <p className="label mt-1">Connect a card or bank account. Access is read-only.</p>
        </div>
      )}

      {connections.map((item) => {
        const itemAccounts = allAccounts.filter((account) => account.itemId === item.id);
        const importing = item.status === "ok" && item.historyStatus !== "HISTORICAL_UPDATE_COMPLETE";
        return (
          <section key={item.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <InstitutionLogo name={item.institutionName} logoUrl={institutionLogoUrl(item)} color={item.primaryColor} />
                <div>
                  <h2 className="text-sm font-medium">{item.institutionName}</h2>
                  <Status status={item.status} errorCode={item.errorCode} importing={importing} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="label">{syncedAgo(item.lastSyncedAt)}</span>
                {item.status === "needs_reconnect" && (
                  <PlaidLinkButton itemId={item.id} label="Reconnect" variant="secondary" />
                )}
              </div>
            </div>
            <ul>
              {itemAccounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 border-t border-line/50 px-5 py-3 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {account.name}
                      {account.mask && <span className="tabular ml-1.5 text-faint">••{account.mask}</span>}
                    </p>
                    <p className="label capitalize">{account.subtype ?? account.type}</p>
                  </div>
                  <span className="label tabular whitespace-nowrap">
                    {(counts.get(account.id) ?? 0).toLocaleString("en-US")} transactions
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
