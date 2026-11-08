"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useFormatMoney } from "@/components/MoneyProvider";

export type PieSlice = { category: string; label: string; color: string; cents: number; href: string };

export function CategoryPie({ slices }: { slices: PieSlice[] }) {
  const dollars = useFormatMoney();
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.cents, 0);
  const focus = active === null ? null : slices[active];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="cents"
            nameKey="label"
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            minAngle={2}
            cornerRadius={3}
            stroke="var(--color-canvas)"
            strokeWidth={2}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onClick={(_, index) => router.push(slices[index].href)}
            className="cursor-pointer outline-none"
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.category}
                fill={slice.color}
                fillOpacity={active === null || active === index ? 1 : 0.35}
                aria-label={`${slice.label}: ${dollars(slice.cents)}`}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="max-w-[60%] text-center">
          <p className="label truncate">{focus ? focus.label : "Total"}</p>
          <p className="tabular mt-0.5 text-lg font-medium tracking-tight">{dollars(focus ? focus.cents : total)}</p>
          <p className="tabular text-xs text-muted">
            {focus ? `${((focus.cents / total) * 100).toFixed(1)}%` : `${slices.length} ${slices.length === 1 ? "category" : "categories"}`}
          </p>
        </div>
      </div>
    </div>
  );
}
