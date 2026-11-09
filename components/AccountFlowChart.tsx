"use client";

import { Money, useMoney } from "@/components/MoneyProvider";
import { formatAmount } from "@/lib/currency";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type FlowRow = { month: string; label: string; longLabel: string; inCents: number; outCents: number };

type Point = FlowRow & { in: number; out: number };

const IN_COLOR = "oklch(0.62 0.12 155)";
const OUT_COLOR = "oklch(0.45 0.02 65)";

function niceStep(rough: number): number {
  if (rough <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(rough));
  const scaled = rough / power;
  const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return factor * power;
}

function FlowTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const { code } = useMoney();
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="card min-w-40 px-3 py-2">
      <p className="label">{point.longLabel}</p>
      <div className="mt-1 space-y-0.5 text-xs">
        <p className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: IN_COLOR }} />
          <span className="flex-1 text-muted">In</span>
          <span className="tabular">{formatAmount(point.in, code)}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: OUT_COLOR }} />
          <span className="flex-1 text-muted">Out</span>
          <span className="tabular">{formatAmount(point.out, code)}</span>
        </p>
      </div>
    </div>
  );
}

export function AccountFlowChart({ rows }: { rows: FlowRow[] }) {
  const money = useMoney();
  const points: Point[] = rows.map((row) => ({
    ...row,
    in: (row.inCents / 100) * money.rate,
    out: (row.outCents / 100) * money.rate,
  }));
  const totalIn = rows.reduce((sum, row) => sum + row.inCents, 0);
  const totalOut = rows.reduce((sum, row) => sum + row.outCents, 0);
  const top = Math.max(0, ...points.flatMap((point) => [point.in, point.out]));
  const step = niceStep(top / 3);
  const ticks: number[] = [];
  for (let tick = 0; tick < top + step; tick += step) ticks.push(tick);
  const compact = (value: number) => formatAmount(value, money.code, { compact: true });
  const axisWidth = Math.max(36, ...ticks.map((tick) => compact(tick).length * 7 + 10));
  const busiest = [...rows].sort((a, b) => b.outCents - a.outCents)[0];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-1">
        <div>
          <h2 className="text-sm font-medium">Money in and out</h2>
          <p className="label">Past 12 months</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: IN_COLOR }} />
            <span className="text-muted">In</span>
            <span className="tabular font-medium">
              <Money cents={totalIn} />
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: OUT_COLOR }} />
            <span className="text-muted">Out</span>
            <span className="tabular font-medium">
              <Money cents={totalOut} />
            </span>
          </span>
        </div>
      </div>
      <p className="sr-only">
        Money in and out by month, past 12 months: {compact((totalIn / 100) * money.rate)} in,{" "}
        {compact((totalOut / 100) * money.rate)} out.
        {busiest && busiest.outCents > 0 && ` Most out in ${busiest.longLabel}.`}
      </p>
      <div className="mt-3 h-52 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="oklch(0.94 0.003 75)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "oklch(0.455 0.005 70)" }}
              interval="preserveStartEnd"
              minTickGap={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={axisWidth}
              tick={{ fontSize: 11, fill: "oklch(0.6 0.005 70)" }}
              tickFormatter={compact}
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
            />
            <Tooltip cursor={{ fill: "oklch(0.97 0.003 75)" }} content={<FlowTooltip />} />
            <Bar dataKey="in" fill={IN_COLOR} radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            <Bar dataKey="out" fill={OUT_COLOR} radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
