"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { categoryMeta, categoryPillStyle } from "@/lib/categories";

type Option = { value: string; label: string };

type Props = {
  transactionId: string;
  merchant: string;
  category: string;
  source: "override" | "rule" | "plaid";
  options: Option[];
};

export function CategoryCell({ transactionId, merchant, category, source, options }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(value: string | null) {
    setBusy(true);
    await fetch("/api/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, category: value }),
    });
    setBusy(false);
    router.refresh();
  }

  const color = categoryMeta(category).color;

  return (
    <div className="flex max-w-full items-center gap-1.5">
      <CategoryPicker
        label={`Category for ${merchant}: ${categoryMeta(category).label}`}
        category={category}
        options={options}
        reset={source === "override" ? { label: "Reset to automatic" } : undefined}
        disabled={busy}
        onPick={change}
      >
        <span
          className="inline-flex max-w-40 items-center rounded-full border px-2 py-px text-xs leading-5 transition hover:brightness-[0.97]"
          style={categoryPillStyle(color)}
        >
          <span className="truncate">{categoryMeta(category).label}</span>
        </span>
      </CategoryPicker>
      {source === "rule" && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-faint">Rule</span>
      )}
    </div>
  );
}
