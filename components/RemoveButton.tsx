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
      className={`rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-40 ${
        removed ? "text-sky-700 hover:bg-sky-50" : "text-stone-400 hover:bg-red-50 hover:text-red-600"
      }`}
    >
      {removed ? "Count again" : "Don't count"}
    </button>
  );
}
