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
    <div className="relative flex md:flex-col md:gap-2">
      {message && (
        <p className="text-xs text-negative max-md:popover max-md:absolute max-md:right-2 max-md:bottom-full max-md:mb-2 max-md:w-max max-md:max-w-64 max-md:px-3 max-md:py-2 md:order-last">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        aria-label={busy ? "Syncing" : "Sync now"}
        className="flex flex-1 justify-center py-3.5 text-muted transition hover:text-ink disabled:opacity-60 md:items-center md:justify-start md:gap-2 md:rounded-lg md:border md:border-transparent md:px-3 md:py-1.5 md:text-sm md:hover:bg-line/40"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={`size-5 shrink-0 ${busy ? "animate-spin" : ""}`}
          aria-hidden
        >
          <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v3.5H13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="hidden md:inline">{busy ? "Syncing…" : "Sync now"}</span>
      </button>
    </div>
  );
}
