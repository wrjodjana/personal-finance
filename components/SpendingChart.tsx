"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { categoryPillStyle } from "@/lib/categories";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartRow = {
  month: string;
  label: string;
  longLabel: string;
  total: number;
  selected: boolean;
  values: Record<string, number>;
};

export type ChartSeries = { key: string; label: string; color: string };

const stackTop = (row: ChartRow, series: ChartSeries[]) => series.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0);

const dollars = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function compact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const size = Math.abs(value);
  if (size >= 1000) return `${sign}$${Number((size / 1000).toFixed(size >= 10000 ? 0 : 1))}k`;
  return `${sign}$${Math.round(size)}`;
}

function niceStep(rough: number): number {
  if (rough <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(rough));
  const scaled = rough / power;
  const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return factor * power;
}

function axis(rows: ChartRow[], series: ChartSeries[]) {
  const top = Math.max(0, ...rows.map((row) => stackTop(row, series)));
  const step = niceStep(top / 3);
  const ticks: number[] = [];
  for (let tick = 0; tick < top + step; tick += step) ticks.push(tick);
  return { ticks, domain: [0, ticks[ticks.length - 1]] as [number, number] };
}

type TooltipProps = { active?: boolean; payload?: { payload: ChartRow }[]; series: ChartSeries[]; filtered: boolean };

function ChartTooltip({ active, payload, series, filtered }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  if (filtered) {
    return (
      <div className="card px-3 py-2">
        <p className="label">
          {row.longLabel} · {series[0]?.label}
        </p>
        <p className="tabular text-sm font-medium">{dollars(stackTop(row, series))}</p>
      </div>
    );
  }
  const parts = series.filter((item) => row.values[item.key]).sort((a, b) => row.values[b.key] - row.values[a.key]);
  return (
    <div className="card min-w-44 px-3 py-2">
      <p className="label">{row.longLabel}</p>
      <p className="tabular text-sm font-medium">{dollars(row.total)}</p>
      {parts.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 border-t border-line/70 pt-1.5">
          {parts.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="flex-1 text-muted">{item.label}</span>
              <span className="tabular">{dollars(row.values[item.key])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SpendingChart({ rows, series }: { rows: ChartRow[]; series: ChartSeries[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const visible = category ? series.filter((item) => item.key === category) : series;
  const { ticks, domain } = axis(rows, visible);
  const stacks = new Map(
    rows.map((row) => [
      row.month,
      visible.filter((item) => row.values[item.key] > 0).sort((a, b) => row.values[a.key] - row.values[b.key]),
    ]),
  );
  const slotCount = Math.max(0, ...[...stacks.values()].map((stack) => stack.length));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <div>
          <h2 className="text-sm font-medium">Monthly spending</h2>
          <p className="label">Past 12 months</p>
        </div>
        <CategoryPicker
          label={`Category: ${visible.length === 1 ? visible[0].label : "All categories"}`}
          category={category}
          options={series.map((item) => ({ value: item.key, label: item.label }))}
          reset={{ label: "All categories", first: true }}
          align="right"
          onPick={setCategory}
        >
          <span className="control inline-flex h-9 items-center gap-2 pr-2.5 pl-3 text-sm">
            {visible.length === 1 ? (
              <span className="rounded-full border px-2 py-px text-xs leading-5" style={categoryPillStyle(visible[0].color)}>
                {visible[0].label}
              </span>
            ) : (
              "All categories"
            )}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5 text-muted" aria-hidden>
              <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </CategoryPicker>
      </div>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            onClick={(state) => {
              const index = Number(state?.activeTooltipIndex);
              const row = Number.isInteger(index) ? rows[index] : undefined;
              if (row) router.push(`/?month=${row.month}`);
            }}
          >
            <CartesianGrid vertical={false} stroke="oklch(0.94 0.003 75)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "oklch(0.455 0.005 70)" }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 11, fill: "oklch(0.6 0.005 70)" }}
              tickFormatter={compact}
              ticks={ticks}
              domain={domain}
              allowDataOverflow
            />
            <Tooltip cursor={{ fill: "oklch(0.97 0.003 75)" }} content={<ChartTooltip series={visible} filtered={category !== null} />} />
            {Array.from({ length: slotCount }, (_, slot) => (
              <Bar
                key={slot}
                dataKey={(row: ChartRow) => {
                  const item = stacks.get(row.month)?.[slot];
                  return item ? row.values[item.key] : 0;
                }}
                stackId="spending"
                stroke="var(--color-canvas)"
                strokeWidth={1.5}
                radius={2}
                maxBarSize={36}
                className="cursor-pointer"
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell
                    key={row.month}
                    fill={stacks.get(row.month)?.[slot]?.color ?? "transparent"}
                    fillOpacity={row.selected ? 1 : 0.4}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
