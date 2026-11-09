"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";

function PlaidLauncher({ token, onSuccess, onExit }: { token: string; onSuccess: PlaidLinkOnSuccess; onExit: () => void }) {
  const { open, ready } = usePlaidLink({ token, onSuccess, onExit });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}

type Props = { itemId?: string; label: string; variant?: "primary" | "secondary"; addInvestments?: boolean };
type Session = { token: string; itemId?: string };
type Target = { itemId?: string; addInvestments?: boolean; addAccounts?: boolean };

export function PlaidLinkButton({ itemId, label, variant = "primary", addInvestments = false }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (target: Target) => {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target.itemId ? target : {}),
    });
    const body = (await response.json().catch(() => ({}))) as { linkToken?: string; error?: string };
    if (!response.ok || !body.linkToken) {
      setError(body.error ?? "Could not start Plaid Link");
      setBusy(false);
      return;
    }
    setSession({ token: body.linkToken, itemId: target.itemId });
  }, []);

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      const targetItemId = session?.itemId;
      setSession(null);
      if (!targetItemId && !publicToken) {
        setError("Plaid did not return a connection");
        setBusy(false);
        return;
      }
      const response = targetItemId
        ? await fetch("/api/item-fixed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: targetItemId }),
          })
        : await fetch("/api/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicToken,
              institutionId: metadata.institution?.institution_id,
              institutionName: metadata.institution?.name,
            }),
          });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; existingItemId?: string };
        if (body.existingItemId) {
          await open({ itemId: body.existingItemId, addAccounts: true });
          return;
        }
        setError(body.error ?? "Could not save the connection");
      }
      setBusy(false);
      router.refresh();
    },
    [session, open, router],
  );

  const styles =
    variant === "primary"
      ? "bg-[oklch(0.35_0.02_65)] text-white shadow-sm hover:bg-[oklch(0.29_0.02_65)]"
      : "control text-ink hover:bg-surface";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => open({ itemId, addInvestments })}
        disabled={busy}
        className={`h-9 rounded-lg px-3.5 text-sm font-medium transition disabled:opacity-60 ${styles}`}
      >
        {busy ? "Opening…" : label}
      </button>
      {error && <p className="text-xs text-negative">{error}</p>}
      {session && (
        <PlaidLauncher
          key={session.token}
          token={session.token}
          onSuccess={onSuccess}
          onExit={() => {
            setSession(null);
            setBusy(false);
          }}
        />
      )}
    </div>
  );
}
