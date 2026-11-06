"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/Select";

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
    "grid size-8 place-items-center rounded-md text-muted transition hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="control inline-flex h-10 items-center gap-0.5 px-1">
      <button
        type="button"
        className={arrow}
        aria-label="Previous month"
        disabled={index === -1 || index >= months.length - 1}
        onClick={() => go(months[index + 1]?.value)}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Select
        label="Month"
        value={month}
        options={months}
        onChange={go}
        chevron={false}
        className="tabular flex h-8 min-w-24 cursor-pointer items-center justify-center rounded-md px-1 text-sm font-medium hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-line"
      />
      <button
        type="button"
        className={arrow}
        aria-label="Next month"
        disabled={index <= 0}
        onClick={() => go(months[index - 1]?.value)}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
          <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
