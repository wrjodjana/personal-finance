"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

type Props = { categories: Option[]; accounts: Option[]; category: string; account: string };

export function TransactionFilters({ categories, accounts, category, account }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(name: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`${pathname}?${params}`);
  }

  const select =
    "h-10 cursor-pointer rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-300";

  return (
    <div className="flex flex-wrap gap-2">
      <select className={select} value={category} onChange={(event) => set("category", event.target.value)}>
        <option value="">All categories</option>
        {categories.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select className={select} value={account} onChange={(event) => set("account", event.target.value)}>
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
