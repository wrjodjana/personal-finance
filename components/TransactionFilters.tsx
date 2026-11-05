"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Option = { value: string; label: string };

type Props = { categories: Option[]; accounts: Option[]; category: string; account: string; query: string };

export function TransactionFilters({ categories, accounts, category, account, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [text, setText] = useState(query);

  function set(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (text === query) return;
    const timer = setTimeout(() => set("q", text.trim()), 250);
    return () => clearTimeout(timer);
  });

  const select =
    "control h-10 min-w-0 flex-1 cursor-pointer appearance-none truncate bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8 pl-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-line sm:flex-none";
  const chevron = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23716b64' stroke-width='1.8'%3E%3Cpath d='m6 8 4 4 4-4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  };

  return (
    <div className="flex flex-1 flex-wrap gap-2">
      <label className="control flex h-10 w-full items-center gap-2 px-3 focus-within:ring-2 focus-within:ring-line sm:w-72">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-faint" aria-hidden>
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3 3" strokeLinecap="round" />
        </svg>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search transactions"
          aria-label="Search transactions"
          className="w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
        />
      </label>
      <select
        className={select}
        style={chevron}
        value={category}
        onChange={(event) => set("category", event.target.value)}
        aria-label="Category"
      >
        <option value="">All categories</option>
        {categories.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className={`${select} sm:max-w-56`}
        style={chevron}
        value={account}
        onChange={(event) => set("account", event.target.value)}
        aria-label="Account"
      >
        <option value="">All accounts</option>
        {accounts.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
