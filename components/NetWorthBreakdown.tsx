"use client";

import { useState } from "react";
import { AllocationMap, ASSET_COLORS, LIABILITY_COLORS } from "@/components/AllocationMap";
import type { Kind } from "@/lib/netWorth";

export type BreakdownSlice = { label: string; cents: number; kind: Kind };

export function NetWorthBreakdown({ slices }: { slices: BreakdownSlice[] }) {
  const [kind, setKind] = useState<Kind>(slices.some((slice) => slice.kind === "asset") ? "asset" : "liability");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Breakdown</h2>
        <div className="flex rounded-full border border-edge bg-surface p-0.5" role="group" aria-label="Breakdown type">
          {(["asset", "liability"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                kind === option ? "bg-ink text-canvas" : "text-muted hover:text-ink"
              }`}
            >
              {option === "asset" ? "Assets" : "Liabilities"}
            </button>
          ))}
        </div>
      </div>
      <AllocationMap
        items={slices.filter((slice) => slice.kind === kind)}
        colors={kind === "asset" ? ASSET_COLORS : LIABILITY_COLORS}
        empty={`No ${kind === "asset" ? "assets" : "liabilities"}.`}
      />
    </div>
  );
}
