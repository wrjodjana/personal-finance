"use client";

import { useState } from "react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { useFormatMoney } from "@/components/MoneyProvider";
import { Select } from "@/components/Select";
import { SecurityLogo } from "@/components/SecurityLogo";

export type HoldingRow = {
  key: string;
  ticker: string | null;
  name: string | null;
  assetClass: string;
  typeLabel: string;
  accountName: string;
  quantity: number;
  priceCents: number;
  valueCents: number;
  costBasisCents: number | null;
};

type GroupBy = "class" | "type" | "account" | "none";

const GROUP_LABELS: Record<GroupBy, string> = {
  class: "By asset class",
  type: "By security type",
  account: "By account",
  none: "No grouping",
};

const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_max(5.5rem,var(--value-width))_1rem] @xl:grid-cols-[minmax(0,1fr)_max(6.5rem,var(--value-width))_max(5.5rem,var(--gain-width))_4.5rem_1rem] @3xl:grid-cols-[minmax(0,1fr)_6.5rem_max(6.5rem,var(--value-width))_max(5.5rem,var(--gain-width))_4.5rem_1rem] items-center gap-x-4";

function widthFor(texts: string[]): string {
  return `${Math.max(0, ...texts.map((text) => text.length)) + 1}ch`;
}

function percentText(value: number): string {
  const size = Math.abs(value);
  return size > 0 && size < 0.1 ? "<0.1%" : `${size.toFixed(1)}%`;
}

function gainOf(rows: HoldingRow[]) {
  const known = rows.filter((row) => row.costBasisCents !== null && row.costBasisCents > 0);
  const cost = known.reduce((total, row) => total + row.costBasisCents!, 0);
  if (cost === 0) return null;
  const cents = known.reduce((total, row) => total + row.valueCents, 0) - cost;
  return { cents, percent: (cents / cost) * 100 };
}

function ShareBar({ share }: { share: number }) {
  return (
    <div>
      <p className="tabular text-xs">{share > 0 && share < 0.1 ? "<0.1%" : `${share.toFixed(1)}%`}</p>
      <div
        className="relative mt-1 h-2 w-full max-w-24"
        style={{ background: "repeating-linear-gradient(90deg, var(--color-line) 0 2px, transparent 2px 4px)" }}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${Math.min(share, 100)}%`,
            background: "repeating-linear-gradient(90deg, var(--color-muted) 0 2px, transparent 2px 4px)",
          }}
        />
      </div>
    </div>
  );
}

function GainCells({ rows }: { rows: HoldingRow[] }) {
  const dollars = useFormatMoney();
  const gain = gainOf(rows);
  if (!gain) {
    return (
      <>
        <span className="hidden text-right text-faint @xl:block">-</span>
        <span className="hidden text-right text-faint @xl:block">-</span>
      </>
    );
  }
  const up = gain.cents >= 0;
  const sign = gain.cents > 0 ? "+" : gain.cents < 0 ? "-" : "";
  return (
    <>
      <span className={`tabular hidden text-right text-sm @xl:block ${up ? "text-positive" : "text-negative"}`}>
        {sign}
        {dollars(Math.abs(gain.cents))}
      </span>
      <span className="hidden justify-end @xl:flex">
        <span
          className={`tabular rounded-full border px-1.5 py-px text-[0.6875rem] leading-4 ${
            up ? "border-positive/25 bg-positive/10 text-positive" : "border-negative/25 bg-negative/10 text-negative"
          }`}
        >
          {sign}
          {percentText(gain.percent)}
        </span>
      </span>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`size-4 text-faint transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="tabular mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function HoldingsList({ rows, totalCents }: { rows: HoldingRow[]; totalCents: number }) {
  const dollars = useFormatMoney();
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("class");
  const [open, setOpen] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (row) => !needle || `${row.ticker ?? ""} ${row.name ?? ""}`.toLowerCase().includes(needle),
  );
  const groups = new Map<string, HoldingRow[]>();
  for (const row of visible) {
    const key =
      groupBy === "class"
        ? row.assetClass
        : groupBy === "type"
          ? row.typeLabel
          : groupBy === "account"
            ? row.accountName
            : "All holdings";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const sorted = [...groups.entries()]
    .map(([label, members]) => ({
      label,
      members: [...members].sort((a, b) => b.valueCents - a.valueCents),
      valueCents: members.reduce((total, row) => total + row.valueCents, 0),
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
  const share = (cents: number) => (totalCents > 0 ? (cents / totalCents) * 100 : 0);
  const gains = [...sorted.map((group) => group.members), ...visible.map((row) => [row])].map(gainOf);
  const widths = {
    "--value-width": widthFor(sorted.flatMap((group) => [group.valueCents, ...group.members.map((row) => row.valueCents)]).map(dollars)),
    "--gain-width": widthFor(gains.map((gain) => (gain ? `+${dollars(Math.abs(gain.cents))}` : ""))),
  } as React.CSSProperties;

  return (
    <div className="@container space-y-4" style={widths}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="control flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 sm:max-w-80">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 shrink-0 text-muted" aria-hidden>
            <circle cx="9" cy="9" r="5" />
            <path d="m13 13 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search holdings..."
            aria-label="Search holdings"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </label>
        <Select
          label="Group holdings"
          value={groupBy}
          options={(Object.keys(GROUP_LABELS) as GroupBy[]).map((option) => ({ value: option, label: GROUP_LABELS[option] }))}
          onChange={(value) => setGroupBy(value as GroupBy)}
        />
      </div>

      {sorted.length === 0 && (
        <div className="card px-5 py-10 text-center text-sm text-muted">
          {rows.length === 0 ? "No positions yet." : `No holdings match "${query.trim()}".`}
        </div>
      )}

      {sorted.map((group) => (
        <section key={group.label} className="card overflow-hidden">
          <div className={`${COLUMNS} bg-surface/60 px-5 py-3.5`}>
            <p className="flex min-w-0 items-baseline gap-3">
              <span className="truncate text-sm font-medium">{group.label}</span>
              <span className="label shrink-0">
                {group.members.length} {group.members.length === 1 ? "position" : "positions"}
              </span>
            </p>
            <div className="hidden @3xl:block">
              <ShareBar share={share(group.valueCents)} />
            </div>
            <span className="tabular text-right text-sm font-medium">{dollars(group.valueCents)}</span>
            <GainCells rows={group.members} />
            <span />
          </div>
          <ul>
            {group.members.map((row) => {
              const expanded = open === row.key;
              return (
                <li key={row.key} className="border-t border-line/70">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : row.key)}
                    className={`${COLUMNS} w-full px-5 py-3 text-left transition-colors hover:bg-surface/60`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {row.assetClass === "Equities" ? (
                        <SecurityLogo ticker={row.ticker} name={row.name ?? "?"} size={24} />
                      ) : (
                        <MerchantAvatar name={row.ticker ?? row.name ?? "?"} logoUrl={null} size={24} shape="square" />
                      )}
                      <span className="max-w-28 shrink-0 truncate text-sm font-medium">{row.ticker ?? row.name}</span>
                      {row.ticker && row.name && <span className="min-w-0 truncate text-sm text-muted">{row.name}</span>}
                    </span>
                    <span className="hidden @3xl:block">
                      <ShareBar share={share(row.valueCents)} />
                    </span>
                    <span className="tabular text-right text-sm">{dollars(row.valueCents)}</span>
                    <GainCells rows={[row]} />
                    <Chevron open={expanded} />
                  </button>
                  {expanded && (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line/50 bg-surface/40 px-5 py-3.5 sm:grid-cols-4 sm:pl-14">
                      <Detail
                        label="Quantity"
                        value={row.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                      />
                      <Detail label="Price" value={dollars(row.priceCents)} />
                      <Detail label="Cost basis" value={row.costBasisCents === null ? "-" : dollars(row.costBasisCents)} />
                      <Detail label="Account" value={row.accountName} />
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
