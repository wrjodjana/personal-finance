"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RestoreButton({ transactionId, merchant }: { transactionId: string; merchant: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function restore() {
    setBusy(true);
    await fetch("/api/deleted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, deleted: false }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={restore}
      disabled={busy}
      aria-label={`Restore ${merchant}`}
      className="control h-8 whitespace-nowrap px-3 text-xs font-medium transition hover:bg-surface disabled:opacity-40"
    >
      Restore
    </button>
  );
}
