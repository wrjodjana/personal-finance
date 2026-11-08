import { getCloudflareContext } from "@opennextjs/cloudflare";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type Env = CloudflareEnv & { TIME_ZONE?: string };

export function timeZone(): string {
  return (getCloudflareContext().env as Env).TIME_ZONE || "UTC";
}

export function today(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export function daysBefore(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

export function parseMonth(value: string | string[] | undefined): string {
  return typeof value === "string" && MONTH_PATTERN.test(value) ? value : currentMonth();
}

export function addMonths(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string): string {
  return `${month}-31`;
}

export function monthLabel(month: string, style: "long" | "medium" | "short" = "long"): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    year: style === "short" ? "2-digit" : "numeric",
    timeZone: "UTC",
  });
}

export function daysInMonth(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
}

export function formatDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
