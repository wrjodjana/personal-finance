"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { useMoney } from "@/components/MoneyProvider";
import { categoryPillStyle } from "@/lib/categories";
import { fractionDigits, fromInputValue, moneySymbol, toInputValue, type Money } from "@/lib/currency";
import {
  activeFilterCount,
  defaultAscending,
  DIRECTIONS,
  FLOWS,
  filtersToSearch,
  SORTS,
  STATUSES,
  type Filters,
  type Flow,
  type Sort,
  type Status,
} from "@/lib/transactionFilters";

export type CategoryOption = { value: string; label: string; color: string };
export type AccountOption = {
  value: string;
  name: string;
  mask: string | null;
  institution: string;
  logoUrl: string | null;
  color: string | null;
};

type Props = { filters: Filters; categories: CategoryOption[]; accounts: AccountOption[] };

type Panel = "categories" | "accounts" | "status" | "flow" | "amount";

const PANELS: { value: Panel; label: string }[] = [
  { value: "categories", label: "Categories" },
  { value: "accounts", label: "Accounts" },
  { value: "status", label: "Status" },
  { value: "flow", label: "Flow" },
  { value: "amount", label: "Amount" },
];

const BOX = "rounded-xl border border-edge bg-card";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function dollars(cents: number | null, money: Money): string {
  return cents === null ? "" : String(Number(toInputValue(cents, money)));
}

function parseCents(value: string, money: Money): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? fromInputValue(amount, money) : null;
}

function Segmented<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-edge bg-surface p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`h-8 flex-1 rounded-full px-3 text-sm whitespace-nowrap transition focus:outline-none focus-visible:ring-2 focus-visible:ring-line ${
              active
                ? "bg-[oklch(0.35_0.02_65)] font-medium text-white shadow-sm"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="control flex h-10 items-center gap-2 px-3 focus-within:ring-2 focus-within:ring-line">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-faint" aria-hidden>
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.5 13.5 3 3" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace("...", "")}
        className="w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
      />
    </label>
  );
}

function CheckRow({
  checked,
  onChange,
  type = "checkbox",
  name,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  type?: "checkbox" | "radio";
  name?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className={`checkbox ${type === "radio" ? "rounded-full" : ""}`}
      />
      <span className="flex min-w-0 items-center gap-2 text-sm">{children}</span>
    </label>
  );
}

export function TransactionFilters({ filters, categories, accounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const money = useMoney();
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(filters);
  const [text, setText] = useState(filters.query);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("categories");
  const [find, setFind] = useState("");
  const [min, setMin] = useState(dollars(filters.minCents, money));
  const [max, setMax] = useState(dollars(filters.maxCents, money));
  const root = useRef<HTMLDivElement>(null);

  function apply(changes: Partial<Filters>) {
    const next = { ...current, ...changes };
    startTransition(() => {
      setCurrent(next);
      router.replace(`${pathname}?${filtersToSearch(next, searchParams)}`, { scroll: false });
    });
  }

  useEffect(() => {
    if (text.trim() === current.query) return;
    const timer = setTimeout(() => apply({ query: text }), 250);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    const minCents = parseCents(min, money);
    const maxCents = parseCents(max, money);
    if (minCents === current.minCents && maxCents === current.maxCents) return;
    const timer = setTimeout(() => apply({ minCents, maxCents }), 400);
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = activeFilterCount(current);
  const counts: Record<Panel, number> = {
    categories: current.categories.length,
    accounts: current.accounts.length,
    status: current.statuses.length,
    flow: current.flow ? 1 : 0,
    amount: current.minCents !== null || current.maxCents !== null ? 1 : 0,
  };
  const needle = find.trim().toLowerCase();

  function choosePanel(next: Panel) {
    setPanel(next);
    setFind("");
  }

  function clearAll() {
    setMin("");
    setMax("");
    apply({ categories: [], accounts: [], statuses: [], flow: "", minCents: null, maxCents: null });
  }

  return (
    <div ref={root} className="relative">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1 sm:max-w-80">
          <SearchBox value={text} onChange={setText} placeholder="Search transactions..." />
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={active > 0 ? `Filter and sort, ${active} active` : "Filter and sort"}
          title="Filter & sort"
          className={`control relative grid size-10 shrink-0 place-items-center rounded-full transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line ${
            open ? "bg-surface text-ink" : "text-muted"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
            <path d="M3.5 4.5h13l-5 6.25v4.5l-3 1.5v-6l-5-6.25Z" strokeLinejoin="round" />
          </svg>
          {active > 0 && (
            <span className="tabular absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-medium text-canvas">
              {active}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Filter and sort"
          className="card absolute top-full left-0 z-20 mt-2 w-[min(40rem,calc(100vw-2rem))] p-3 shadow-xl"
        >
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <h2 className="text-sm">Filter &amp; sort</h2>
            {active > 0 && (
              <button type="button" onClick={clearAll} className="label hover:text-ink">
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:h-[23rem] sm:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <div className={`${BOX} space-y-2 p-3`}>
                <p className="eyebrow">Sort by</p>
                <Segmented<Sort>
                  label="Sort by"
                  options={SORTS.map((sort) => ({ value: sort.value, label: sort.label }))}
                  value={current.sort}
                  onChange={(sort) => apply({ sort, ascending: defaultAscending(sort) })}
                />
                <Segmented<boolean>
                  label="Order"
                  options={DIRECTIONS[current.sort].map((direction) => ({ value: direction.ascending, label: direction.label }))}
                  value={current.ascending}
                  onChange={(ascending) => apply({ ascending })}
                />
              </div>
              <div className={`${BOX} flex-1 p-2`}>
                <p className="eyebrow px-2.5 pt-1 pb-1.5">Filter by</p>
                <div role="tablist" aria-orientation="vertical" aria-label="Filter by" className="flex flex-col gap-0.5">
                  {PANELS.map((option) => {
                    const selected = option.value === panel;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => choosePanel(option.value)}
                        className={`flex h-8 items-center justify-between rounded-lg px-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-line ${
                          selected ? "bg-surface font-medium text-ink" : "text-muted hover:bg-surface/60 hover:text-ink"
                        }`}
                      >
                        {option.label}
                        {counts[option.value] > 0 && (
                          <span className="tabular rounded-full bg-line px-1.5 text-[11px] leading-4 font-medium text-ink">
                            {counts[option.value]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div role="tabpanel" className={`${BOX} flex h-[22rem] min-h-0 flex-col p-2 sm:h-auto`}>
              {panel === "categories" && (
                <>
                  <SearchBox value={find} onChange={setFind} placeholder="Search categories..." />
                  <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                    {categories
                      .filter((option) => !needle || option.label.toLowerCase().includes(needle))
                      .map((option) => (
                        <CheckRow
                          key={option.value}
                          checked={current.categories.includes(option.value)}
                          onChange={() => apply({ categories: toggle(current.categories, option.value) })}
                        >
                          <span className="truncate rounded-full border px-2 py-px text-xs leading-5" style={categoryPillStyle(option.color)}>
                            {option.label}
                          </span>
                        </CheckRow>
                      ))}
                  </div>
                </>
              )}

              {panel === "accounts" && (
                <>
                  <SearchBox value={find} onChange={setFind} placeholder="Search accounts..." />
                  <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                    {accounts
                      .filter(
                        (option) =>
                          !needle || `${option.institution} ${option.name} ${option.mask ?? ""}`.toLowerCase().includes(needle),
                      )
                      .map((option) => (
                        <CheckRow
                          key={option.value}
                          checked={current.accounts.includes(option.value)}
                          onChange={() => apply({ accounts: toggle(current.accounts, option.value) })}
                        >
                          <InstitutionLogo name={option.institution} logoUrl={option.logoUrl} color={option.color} size={18} />
                          <span className="truncate">{option.name}</span>
                          {option.mask && <span className="tabular shrink-0 text-muted">{option.mask}</span>}
                        </CheckRow>
                      ))}
                  </div>
                </>
              )}

              {panel === "status" && (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {STATUSES.map((option) => (
                    <CheckRow
                      key={option.value}
                      checked={current.statuses.includes(option.value)}
                      onChange={() => apply({ statuses: toggle<Status>(current.statuses, option.value) })}
                    >
                      {option.label}
                    </CheckRow>
                  ))}
                </div>
              )}

              {panel === "flow" && (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {FLOWS.map((option) => (
                    <CheckRow
                      key={option.value || "all"}
                      type="radio"
                      name="flow"
                      checked={current.flow === option.value}
                      onChange={() => apply({ flow: option.value as Flow })}
                    >
                      {option.label}
                    </CheckRow>
                  ))}
                </div>
              )}

              {panel === "amount" && (
                <div className="grid grid-cols-2 gap-3 p-1.5">
                  {[
                    { label: "Minimum", value: min, set: setMin },
                    { label: "Maximum", value: max, set: setMax },
                  ].map((field) => (
                    <label key={field.label} className="block space-y-1.5">
                      <span className="label">{field.label}</span>
                      <span className="control flex h-10 items-center gap-1 px-3 focus-within:ring-2 focus-within:ring-line">
                        <span className="text-sm text-faint">{moneySymbol(money)}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step={10 ** -fractionDigits(money)}
                          placeholder="Any"
                          value={field.value}
                          onChange={(event) => field.set(event.target.value)}
                          className="tabular w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
                        />
                      </span>
                    </label>
                  ))}
                  <p className="label col-span-2">Matches the size of the amount, for money in and money out.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
