import type { LedgerEntry } from "./ledger";

export const SORTS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "name", label: "Name" },
] as const;

export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "posted", label: "Posted" },
  { value: "excluded", label: "Excluded" },
  { value: "edited", label: "Edited" },
] as const;

export const FLOWS = [
  { value: "", label: "All" },
  { value: "out", label: "Money out" },
  { value: "in", label: "Money in" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];
export type Status = (typeof STATUSES)[number]["value"];
export type Flow = "" | "in" | "out";

export type Filters = {
  query: string;
  categories: string[];
  accounts: string[];
  statuses: Status[];
  flow: Flow;
  minCents: number | null;
  maxCents: number | null;
  sort: Sort;
  ascending: boolean;
};

export const DIRECTIONS: Record<Sort, { ascending: boolean; label: string }[]> = {
  date: [
    { ascending: false, label: "New → Old" },
    { ascending: true, label: "Old → New" },
  ],
  amount: [
    { ascending: false, label: "High → Low" },
    { ascending: true, label: "Low → High" },
  ],
  name: [
    { ascending: true, label: "A → Z" },
    { ascending: false, label: "Z → A" },
  ],
};

export function defaultAscending(sort: Sort): boolean {
  return DIRECTIONS[sort][0].ascending;
}

function isAscending(sort: Sort, dir: string): boolean {
  if (dir === "asc") return true;
  if (dir === "desc") return false;
  return defaultAscending(sort);
}

type Params = Record<string, string | string[] | undefined>;

function text(params: Params, name: string): string {
  const value = params[name];
  return typeof value === "string" ? value : "";
}

function list(params: Params, name: string): string[] {
  return text(params, name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function cents(value: string): number | null {
  if (!value.trim()) return null;
  const dollars = Number(value);
  return Number.isFinite(dollars) && dollars >= 0 ? Math.round(dollars * 100) : null;
}

export function parseFilters(params: Params): Filters {
  const sort = text(params, "sort");
  const flow = text(params, "flow");
  const statusValues: string[] = STATUSES.map((status) => status.value);
  return {
    query: text(params, "q"),
    categories: list(params, "category"),
    accounts: list(params, "account"),
    statuses: list(params, "status").filter((value): value is Status => statusValues.includes(value)),
    flow: flow === "in" || flow === "out" ? flow : "",
    minCents: cents(text(params, "min")),
    maxCents: cents(text(params, "max")),
    sort: sort === "amount" || sort === "name" ? sort : "date",
    ascending: isAscending(sort === "amount" || sort === "name" ? sort : "date", text(params, "dir")),
  };
}

function hasStatus(entry: LedgerEntry, status: Status): boolean {
  if (status === "pending") return entry.pending;
  if (status === "posted") return !entry.pending;
  if (status === "excluded") return entry.removed;
  return entry.edited || entry.categorySource === "override";
}

export function matchesFilters(entry: LedgerEntry, filters: Filters): boolean {
  const needle = filters.query.toLowerCase();
  const size = Math.abs(entry.amountCents);
  return (
    (!needle || `${entry.merchant} ${entry.description}`.toLowerCase().includes(needle)) &&
    (filters.categories.length === 0 || filters.categories.includes(entry.category)) &&
    (filters.accounts.length === 0 || filters.accounts.includes(entry.accountId)) &&
    (filters.statuses.length === 0 || filters.statuses.some((status) => hasStatus(entry, status))) &&
    (filters.flow === "" || (filters.flow === "in") === entry.amountCents < 0) &&
    (filters.minCents === null || size >= filters.minCents) &&
    (filters.maxCents === null || size <= filters.maxCents)
  );
}

export function sortEntries(entries: LedgerEntry[], filters: Filters): LedgerEntry[] {
  const direction = filters.ascending ? 1 : -1;
  const compare = (a: LedgerEntry, b: LedgerEntry): number => {
    if (filters.sort === "amount") return Math.abs(a.amountCents) - Math.abs(b.amountCents);
    if (filters.sort === "name") return a.merchant.localeCompare(b.merchant, "en", { sensitivity: "base" });
    return a.date.localeCompare(b.date);
  };
  return [...entries].sort((a, b) => compare(a, b) * direction || b.date.localeCompare(a.date));
}

export function filtersToSearch(filters: Filters, base: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base);
  const values: Record<string, string> = {
    q: filters.query.trim(),
    category: filters.categories.join(","),
    account: filters.accounts.join(","),
    status: filters.statuses.join(","),
    flow: filters.flow,
    min: filters.minCents === null ? "" : String(filters.minCents / 100),
    max: filters.maxCents === null ? "" : String(filters.maxCents / 100),
    sort: filters.sort === "date" ? "" : filters.sort,
    dir: filters.ascending === defaultAscending(filters.sort) ? "" : filters.ascending ? "asc" : "desc",
  };
  for (const [name, value] of Object.entries(values)) {
    if (value) params.set(name, value);
    else params.delete(name);
  }
  return params;
}

export function activeFilterCount(filters: Filters): number {
  return (
    filters.categories.length +
    filters.accounts.length +
    filters.statuses.length +
    (filters.flow ? 1 : 0) +
    (filters.minCents !== null || filters.maxCents !== null ? 1 : 0)
  );
}
