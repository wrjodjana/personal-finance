"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";

type Props = { itemId?: string; label: string; variant?: "primary" | "secondary" };

export function PlaidLinkButton({ itemId, label, variant = "primary" }: Props) {
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

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit: () => {
      setToken(null);
      setBusy(false);
    },
  });

  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  async function start() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemId ? { itemId } : {}),
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
      ? "bg-stone-900 text-white hover:bg-stone-800"
      : "border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={`rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-60 ${styles}`}
      >
        {busy ? "Working…" : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
