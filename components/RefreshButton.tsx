"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResult = { ok: boolean; institutionName: string };

export function RefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const { results } = (await response.json()) as { results: SyncResult[] };
      const failed = results.filter((result) => !result.ok);
      if (failed.length > 0) {
        setMessage(`${failed.map((result) => result.institutionName).join(", ")} could not sync`);
      }
      router.refresh();
    } catch {
      setMessage("Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-xs text-red-600">{message}</span>}
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`size-4 ${busy ? "animate-spin" : ""}`}
          aria-hidden
        >
          <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v3.5H13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? "Refreshing" : "Refresh"}
      </button>
    </div>
  );
}
