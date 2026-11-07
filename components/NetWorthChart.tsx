"use client";

import { useId, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { HistoryPoint } from "@/lib/netWorth";

const RANGES = [
  { key: "1W", label: "Past week", days: 7 },
  { key: "1M", label: "Past month", days: 30 },
  { key: "3M", label: "Past 3 months", days: 91 },
  { key: "YTD", label: "Year to date", days: null },
  { key: "1Y", label: "Past year", days: 365 },
  { key: "ALL", label: "All time", days: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const POSITIVE = "oklch(0.55 0.13 155)";
const NEGATIVE = "oklch(0.55 0.19 25)";

function dollars(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function slice(points: HistoryPoint[], range: (typeof RANGES)[number]): HistoryPoint[] {
  const last = points[points.length - 1];
  let from: string;
  if (range.days === null) {
    from = `${last.date.slice(0, 4)}-01-01`;
  } else if (range.days === Infinity) {
    from = "";
  } else {
    const [year, month, day] = last.date.split("-").map(Number);
    from = new Date(Date.UTC(year, month - 1, day - range.days)).toISOString().slice(0, 10);
  }
  const visible = points.filter((point) => point.date >= from);
  return visible.length > 1 ? visible : points.length > 1 ? points.slice(-2) : [last, last];
}

export function NetWorthChart({ points, title = "Net Worth" }: { points: HistoryPoint[]; title?: string }) {
  const gradientId = useId();
  const [rangeKey, setRangeKey] = useState<RangeKey>("1M");
  const [hover, setHover] = useState<HistoryPoint | null>(null);
  const range = RANGES.find((item) => item.key === rangeKey)!;
  const visible = slice(points, range);
  const first = visible[0];
  const last = visible[visible.length - 1];
  const shown = hover ?? last;
  const change = shown.cents - first.cents;
  const share = first.cents !== 0 ? (change / Math.abs(first.cents)) * 100 : 0;
  const color = last.cents - first.cents < 0 ? NEGATIVE : POSITIVE;
  const values = visible.map((point) => point.cents);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max((high - low) * 0.15, Math.abs(high) * 0.01, 100);

  return (
    <div>
      <div className="px-6 pt-7 text-center">
        <p className="label">{hover ? dayLabel(hover.date) : title}</p>
        <p className="tabular mt-1 text-4xl font-medium tracking-tight">
          {shown.cents < 0 && "-"}
          <span className="mr-0.5 align-[0.6em] text-lg">$</span>
          {dollars(shown.cents)}
        </p>
        <p className="tabular mt-1.5 text-sm text-muted">
          <span className={change > 0 ? "text-positive" : change < 0 ? "text-negative" : undefined}>
            {change < 0 ? "-" : change > 0 ? "+" : ""}${dollars(change)} ({Math.abs(share).toFixed(change === 0 ? 0 : 1)}%)
          </span>{" "}
          {hover ? `since ${dayLabel(first.date)}` : range.label}
        </p>
      </div>
      <div className="mt-4 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={visible}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              const index = Number(state?.activeTooltipIndex);
              setHover(Number.isInteger(index) ? (visible[index] ?? null) : null);
            }}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.14} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[low - pad, high + pad]} />
            <Tooltip cursor={{ stroke: "oklch(0.8 0.005 70)", strokeWidth: 1 }} content={() => null} />
            <Area
              type="monotone"
              dataKey="cents"
              stroke={color}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              baseValue="dataMin"
              activeDot={{ r: 3.5, fill: color, stroke: "var(--color-canvas)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-1 px-4 pt-3 pb-4" role="group" aria-label="Time range">
        {RANGES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={item.key === rangeKey}
            onClick={() => setRangeKey(item.key)}
            className={`tabular rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              item.key === rangeKey ? "bg-line/70 text-ink" : "text-muted hover:bg-line/40 hover:text-ink"
            }`}
          >
            {item.key}
          </button>
        ))}
      </div>
    </div>
  );
}
