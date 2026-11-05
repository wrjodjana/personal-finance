"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryMeta } from "@/lib/categories";

type Option = { value: string; label: string };

type Props = {
  transactionId: string;
  merchant: string;
  category: string;
  source: "override" | "rule" | "plaid";
  options: Option[];
};

const RESET = "__reset";

export function CategoryCell({ transactionId, merchant, category, source, options }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [offerRule, setOfferRule] = useState<string | null>(null);

  async function change(value: string) {
    setBusy(true);
    await fetch("/api/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, category: value === RESET ? null : value }),
    });
    setOfferRule(value === RESET ? null : value);
    setBusy(false);
    router.refresh();
  }

  async function makeRule() {
    if (!offerRule) return;
    setBusy(true);
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern: merchant, category: offerRule }),
    });
    setOfferRule(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: categoryMeta(category).color }} />
        <select
          value={category}
          disabled={busy}
          onChange={(event) => change(event.target.value)}
          aria-label={`Category for ${merchant}`}
          className="-ml-1 max-w-40 cursor-pointer truncate rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm text-muted hover:border-edge hover:bg-canvas hover:text-ink focus:border-edge focus:bg-canvas focus:outline-none disabled:opacity-50"
        >
          {!options.some((option) => option.value === category) && (
            <option value={category}>{categoryMeta(category).label}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {source === "override" && <option value={RESET}>↺ Reset to automatic</option>}
        </select>
        {source !== "plaid" && (
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
            {source === "rule" ? "Rule" : "Edited"}
          </span>
        )}
      </div>
      {offerRule && (
        <button
          type="button"
          onClick={makeRule}
          disabled={busy}
          className="text-left text-xs font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink disabled:opacity-50"
        >
          Always use this for “{merchant}”
        </button>
      )}
    </div>
  );
}
