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

export function PlaidLinkButton({ itemId, label, variant = "primary", addInvestments = false }: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      setToken(null);
      if (!itemId && !publicToken) {
        setError("Plaid did not return a connection");
        setBusy(false);
        return;
      }
      const response = itemId
        ? await fetch("/api/item-fixed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId }),
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
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not save the connection");
      }
      setBusy(false);
      router.refresh();
    },
    [itemId, router],
  );

  async function start() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemId ? { itemId, addInvestments } : {}),
    });
    const body = (await response.json().catch(() => ({}))) as { linkToken?: string; error?: string };
    if (!response.ok || !body.linkToken) {
      setError(body.error ?? "Could not start Plaid Link");
      setBusy(false);
      return;
    }
    setToken(body.linkToken);
  }

  const styles =
    variant === "primary"
      ? "bg-[oklch(0.35_0.02_65)] text-white shadow-sm hover:bg-[oklch(0.29_0.02_65)]"
      : "control text-ink hover:bg-surface";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={`h-9 rounded-lg px-3.5 text-sm font-medium transition disabled:opacity-60 ${styles}`}
      >
        {busy ? "Opening…" : label}
      </button>
      {error && <p className="text-xs text-negative">{error}</p>}
      {token && (
        <PlaidLauncher
          token={token}
          onSuccess={onSuccess}
          onExit={() => {
            setToken(null);
            setBusy(false);
          }}
        />
      )}
    </div>
  );
}
