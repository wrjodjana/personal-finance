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
      <select
        value={month}
        onChange={(event) => go(event.target.value)}
        aria-label="Month"
        className="tabular h-8 min-w-24 cursor-pointer appearance-none rounded-md bg-transparent px-1 text-center text-sm font-medium hover:bg-surface focus:outline-none"
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
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
          <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
