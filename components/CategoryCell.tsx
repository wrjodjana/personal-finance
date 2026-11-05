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

  const color = categoryMeta(category).color;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex max-w-full items-center gap-1.5">
        <span
          className="relative inline-flex max-w-40 items-center rounded-full border px-2 py-px text-xs leading-5 transition focus-within:ring-2 focus-within:ring-line hover:brightness-[0.97] has-disabled:opacity-50"
          style={{
            color: `color-mix(in oklch, ${color} 58%, black)`,
            backgroundColor: `color-mix(in oklch, ${color} 10%, white)`,
            borderColor: `color-mix(in oklch, ${color} 28%, white)`,
          }}
        >
          <span className="truncate">{categoryMeta(category).label}</span>
          <select
            value={category}
            disabled={busy}
            onChange={(event) => change(event.target.value)}
            aria-label={`Category for ${merchant}`}
            className="absolute inset-0 w-full cursor-pointer appearance-none opacity-0 disabled:cursor-default"
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
        </span>
        {source === "rule" && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Rule</span>
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
