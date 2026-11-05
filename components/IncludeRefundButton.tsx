"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IncludeRefundButton({ transactionIds, merchant }: { transactionIds: string[]; merchant: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function include() {
    setBusy(true);
    await Promise.all(
      transactionIds.map((transactionId) =>
        fetch("/api/removed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId, removed: false }),
        }),
      ),
    );
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={include}
      disabled={busy}
      aria-label={`Include ${merchant} purchase and refund`}
      title="Count the purchase and the refund in totals again"
      className="control h-8 whitespace-nowrap px-3 text-xs font-medium transition hover:bg-surface disabled:opacity-40"
    >
      Include
    </button>
  );
}
