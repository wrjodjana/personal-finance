"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartSeries = { key: string; label: string; color: string };
export type ChartRow = { month: string; label: string; selected: boolean } & Record<string, number | string | boolean>;

type Props = { rows: ChartRow[]; series: ChartSeries[] };

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
  let top = 0;
  let bottom = 0;
  for (const row of rows) {
    let positive = 0;
    let negative = 0;
    for (const item of series) {
      const value = Number(row[item.key] ?? 0);
      if (value > 0) positive += value;
      else negative += value;
    }
    top = Math.max(top, positive);
    bottom = Math.min(bottom, negative);
  }
  const step = niceStep(top / 4);
  const ticks: number[] = [];
  for (let tick = 0; tick < top + step; tick += step) ticks.push(tick);
  return { ticks, domain: [bottom, ticks[ticks.length - 1]] as [number, number] };
}

export function SpendingChart({ rows, series }: Props) {
  const router = useRouter();
  const { ticks, domain } = axis(rows, series);

  return (
    <div className="h-64 w-full">
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
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#78716c" }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            ticks={ticks}
            domain={domain}
            allowDataOverflow
            tick={{ fontSize: 12, fill: "#a8a29e" }}
            tickFormatter={compact}
          />
          <Tooltip
            cursor={{ fill: "#f5f5f4" }}
            formatter={(value, name) => [dollars(Number(value)), name]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e7e5e4", fontSize: 12 }}
            itemSorter={(item) => -Number(item.value)}
          />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              stackId="spend"
              fill={item.color}
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
              className="cursor-pointer"
            >
              {rows.map((row) => (
                <Cell key={row.month} fillOpacity={row.selected ? 1 : 0.35} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
