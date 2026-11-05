"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveButton({ transactionId, removed }: { transactionId: string; removed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch("/api/removed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, removed: !removed }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`whitespace-nowrap rounded-md px-2 py-1 text-xs transition disabled:opacity-40 ${
        removed ? "font-medium text-ink hover:bg-surface" : "text-faint hover:bg-negative/5 hover:text-negative"
      }`}
    >
      {removed ? "Count again" : "Don't count"}
    </button>
  );
}
