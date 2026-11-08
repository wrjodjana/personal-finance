"use client";

import { ResponsiveContainer, Treemap } from "recharts";
import { useFormatMoney } from "@/components/MoneyProvider";

export type AllocationItem = { label: string; cents: number };

export const ASSET_COLORS = [
  "oklch(0.62 0.09 250)",
  "oklch(0.64 0.09 195)",
  "oklch(0.66 0.08 155)",
  "oklch(0.7 0.07 95)",
  "oklch(0.62 0.07 300)",
];

export const LIABILITY_COLORS = [
  "oklch(0.66 0.11 45)",
  "oklch(0.62 0.12 20)",
  "oklch(0.7 0.09 75)",
  "oklch(0.6 0.08 340)",
  "oklch(0.64 0.06 10)",
];

const shareText = (share: number) => (share > 0 && share < 0.1 ? "<0.1%" : `${share.toFixed(1)}%`);

type Tile = { x: number; y: number; width: number; height: number; name: string; share: number; color: string; depth: number };

function TileShape({ x, y, width, height, name, share, color, depth }: Partial<Tile>) {
  if (depth !== 1 || !width || !height) return null;
  const roomy = width > 64 && height > 40;
  return (
    <g>
      <rect
        x={x! + 1}
        y={y! + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        rx={6}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1}
      />
      {roomy && (
        <>
          <text x={x! + 10} y={y! + 20} fontSize={12} fill="var(--color-ink)">
            {name}
          </text>
          <text x={x! + 10} y={y! + 35} fontSize={11} fill="var(--color-muted)" className="tabular">
            {shareText(share!)}
          </text>
        </>
      )}
    </g>
  );
}

export function AllocationMap({ items, colors, empty }: { items: AllocationItem[]; colors: string[]; empty: string }) {
  const dollars = useFormatMoney();
  const visible = items.filter((item) => item.cents > 0).sort((a, b) => b.cents - a.cents);
  const total = visible.reduce((sum, item) => sum + item.cents, 0);
  const data = visible.map((item, index) => ({
    name: item.label,
    size: item.cents,
    share: (item.cents / total) * 100,
    color: colors[index % colors.length],
  }));

  const hidden = items.filter((item) => item.cents <= 0);
  if (data.length === 0) return <p className="pt-8 pb-5 text-center text-sm text-muted">{empty}</p>;
  return (
    <>
      <div className="mt-4 h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={data} dataKey="size" aspectRatio={2} isAnimationActive={false} content={<TileShape />} />
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-0.5">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2.5 py-1.5 text-sm">
            <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            <span className="tabular text-xs text-muted">{dollars(item.size)}</span>
            <span className="tabular w-12 text-right text-xs">{shareText(item.share)}</span>
          </li>
        ))}
      </ul>
      {hidden.length > 0 && (
        <p className="label mt-3">
          Not on the map (zero or negative): {hidden.map((item) => `${item.label} ${dollars(item.cents)}`).join(", ")}
        </p>
      )}
    </>
  );
}
