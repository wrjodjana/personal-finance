import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { SetupNotice } from "@/components/SetupNotice";
import { getDb } from "@/lib/db";
import { plaidConfigured } from "@/lib/plaid";
import { accounts, items } from "@/lib/schema";

export const dynamic = "force-dynamic";

const CONNECTION_LIMIT = 20;

function lastSynced(iso: string | null): string {
  if (!iso) return "Never synced";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Synced ${hours} h ago`;
  return `Synced ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function StatusBadge({ status, errorCode }: { status: string; errorCode: string | null }) {
  if (status === "ok") {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Connected</span>;
  }
  if (status === "needs_reconnect") {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Needs reconnect</span>;
  }
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700" title={errorCode ?? undefined}>
      Sync error{errorCode ? `: ${errorCode}` : ""}
    </span>
  );
}

export default function AccountsPage() {
  if (!plaidConfigured()) return <SetupNotice />;

  const db = getDb();
  const connections = db.select().from(items).all();
  const allAccounts = db.select().from(accounts).all();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-stone-500">
            {connections.length} of {CONNECTION_LIMIT} connections used. Access is read-only.
          </p>
        </div>
        {connections.length < CONNECTION_LIMIT && <PlaidLinkButton label="Connect account" />}
      </div>

      {connections.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-stone-500">
          No accounts connected yet.
        </p>
      )}

      {connections.map((item) => {
        const itemAccounts = allAccounts.filter((account) => account.itemId === item.id);
        return (
          <section key={item.id} className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-semibold">{item.institutionName}</h2>
                <StatusBadge status={item.status} errorCode={item.errorCode} />
                {item.status === "ok" && item.historyStatus !== "HISTORICAL_UPDATE_COMPLETE" && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                    Importing history
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-stone-400">{lastSynced(item.lastSyncedAt)}</span>
                {item.status === "needs_reconnect" && (
                  <PlaidLinkButton itemId={item.id} label="Fix" variant="secondary" />
                )}
              </div>
            </div>
            <ul className="divide-y divide-stone-100">
              {itemAccounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                  <span className="font-medium">
                    {account.name}
                    {account.mask && <span className="ml-1.5 font-normal text-stone-400">••{account.mask}</span>}
                  </span>
                  <span className="text-xs capitalize text-stone-500">{account.subtype ?? account.type}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
