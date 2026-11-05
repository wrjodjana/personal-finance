"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = { month: string; months: { value: string; label: string }[] };

export function MonthPicker({ month, months }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const index = months.findIndex((option) => option.value === month);

  function go(value: string | undefined) {
    if (!value) return;
    const params = new URLSearchParams(searchParams);
    params.set("month", value);
    router.push(`${pathname}?${params}`);
  }

  const arrow =
    "grid size-8 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        className={arrow}
        aria-label="Previous month"
        disabled={index === -1 || index >= months.length - 1}
        onClick={() => go(months[index + 1]?.value)}
      >
        ‹
      </button>
      <select
        value={month}
        onChange={(event) => go(event.target.value)}
        className="cursor-pointer appearance-none rounded-lg bg-transparent px-2 py-1 text-center text-sm font-medium focus:outline-none"
      >
        {months.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={arrow}
        aria-label="Next month"
        disabled={index <= 0}
        onClick={() => go(months[index - 1]?.value)}
      >
        ›
      </button>
    </div>
  );
}
