"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartRow = { month: string; label: string; longLabel: string; total: number; selected: boolean };

const INK = "oklch(0.35 0.02 65)";
const BLOCK = "oklch(0.9 0.004 75)";
const BLOCK_HOVER = "oklch(0.82 0.006 75)";

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

function axis(rows: ChartRow[]) {
  const top = Math.max(0, ...rows.map((row) => row.total));
  const bottom = Math.min(0, ...rows.map((row) => row.total));
  const step = niceStep(top / 3);
  const ticks: number[] = [];
  for (let tick = 0; tick < top + step; tick += step) ticks.push(tick);
  return { ticks, domain: [bottom, ticks[ticks.length - 1]] as [number, number] };
}

type TooltipProps = { active?: boolean; payload?: { payload: ChartRow }[] };

function ChartTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="card px-3 py-2">
      <p className="label">{row.longLabel}</p>
      <p className="tabular text-sm font-medium">{dollars(row.total)}</p>
    </div>
  );
}

export function SpendingChart({ rows }: { rows: ChartRow[] }) {
  const router = useRouter();
  const { ticks, domain } = axis(rows);

  return (
    <div className="h-56 w-full">
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
          <Tooltip cursor={{ fill: "oklch(0.97 0.003 75)" }} content={<ChartTooltip />} />
          <Bar dataKey="total" radius={[5, 5, 2, 2]} maxBarSize={36} className="cursor-pointer" activeBar={{ fill: BLOCK_HOVER }}>
            {rows.map((row) => (
              <Cell key={row.month} fill={row.selected ? INK : BLOCK} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
