export type Frequency = "WEEKLY" | "BIWEEKLY" | "SEMI_MONTHLY" | "MONTHLY" | "ANNUALLY" | "UNKNOWN";

export const FREQUENCIES: { key: Frequency; label: string; perMonth: number }[] = [
  { key: "WEEKLY", label: "Weekly", perMonth: 52 / 12 },
  { key: "BIWEEKLY", label: "Every 2 weeks", perMonth: 26 / 12 },
  { key: "SEMI_MONTHLY", label: "Twice a month", perMonth: 2 },
  { key: "MONTHLY", label: "Monthly", perMonth: 1 },
  { key: "ANNUALLY", label: "Yearly", perMonth: 1 / 12 },
  { key: "UNKNOWN", label: "Irregular", perMonth: 0 },
];

export function isFrequency(value: unknown): value is Frequency {
  return FREQUENCIES.some((frequency) => frequency.key === value);
}

export function frequencyMeta(frequency: Frequency) {
  return FREQUENCIES.find((item) => item.key === frequency)!;
}

export type StreamState = "active" | "inactive" | "ended";

export type Charge = { id: string; date: string; amountCents: number };

export type StreamInput = {
  id: string;
  accountId: string;
  direction: "inflow" | "outflow";
  name: string;
  logoUrl: string | null;
  category: string;
  frequency: string;
  lastCents: number;
  lastDate: string;
  predictedNextDate: string | null;
  status: string;
  isActive: boolean;
  charges: Charge[];
};

export type StreamEdit = {
  name: string | null;
  category: string | null;
  amountCents: number | null;
  frequency: string | null;
  nextDate: string | null;
  hidden: boolean;
};

export type RecurringStream = {
  id: string;
  accountId: string;
  direction: "inflow" | "outflow";
  name: string;
  logoUrl: string | null;
  category: string;
  frequency: Frequency;
  amountCents: number;
  lastDate: string;
  nextDate: string | null;
  anchor: string | null;
  state: StreamState;
  early: boolean;
  hidden: boolean;
  edited: boolean;
  charges: Charge[];
  previousCents: number | null;
  changeCents: number | null;
};

export type Occurrence = { stream: RecurringStream; date: string; amountCents: number; projected: boolean };

const MAX_STEPS = 1200;
const ENDED_AFTER_MISSED = 3;
const INACTIVE_AFTER_MISSED = 3;

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  return format(new Date(Date.UTC(year, month - 1, day + days)));
}

function lastDayOf(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function onDay(year: number, monthIndex: number, day: number): string {
  const normalized = new Date(Date.UTC(year, monthIndex, 1));
  const clamped = Math.min(day, lastDayOf(normalized.getUTCFullYear(), normalized.getUTCMonth()));
  return format(new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), clamped)));
}

export function daysBetween(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

export function stepDate(anchor: string, frequency: Frequency, steps: number): string | null {
  const { year, month, day } = parts(anchor);
  switch (frequency) {
    case "WEEKLY":
      return addDays(anchor, 7 * steps);
    case "BIWEEKLY":
      return addDays(anchor, 14 * steps);
    case "MONTHLY":
      return onDay(year, month - 1 + steps, day);
    case "ANNUALLY":
      return onDay(year, month - 1 + 12 * steps, day);
    case "SEMI_MONTHLY": {
      const months = Math.floor(steps / 2);
      if (steps % 2 === 0) return onDay(year, month - 1 + months, day);
      return day <= 15 ? onDay(year, month - 1 + months, day + 15) : onDay(year, month + months, day - 15);
    }
    case "UNKNOWN":
      return null;
  }
}

export function datesBetween(anchor: string, frequency: Frequency, from: string, to: string): string[] {
  const dates: string[] = [];
  for (let step = 0; step < MAX_STEPS; step++) {
    const date = stepDate(anchor, frequency, step);
    if (date === null || date > to) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

function missedSince(lastDate: string, frequency: Frequency, today: string): number {
  return datesBetween(lastDate, frequency, addDays(lastDate, 1), addDays(today, -1)).length;
}

export function buildStream(input: StreamInput, edit: StreamEdit | null, today: string): RecurringStream {
  const frequency: Frequency = isFrequency(edit?.frequency) ? edit.frequency : isFrequency(input.frequency) ? input.frequency : "UNKNOWN";
  const charges = [...input.charges].sort((a, b) => b.date.localeCompare(a.date));
  const lastDate = charges[0]?.date ?? input.lastDate;
  const anchor = edit?.nextDate ?? input.predictedNextDate ?? (frequency === "UNKNOWN" ? null : lastDate);
  const nextDate =
    anchor === null ? null : (datesBetween(anchor, frequency, lastDate >= today ? addDays(lastDate, 1) : today, "9999-12-31")[0] ?? null);
  const missed = edit?.nextDate ? 0 : missedSince(lastDate, frequency, today);

  let state: StreamState = "active";
  if (input.status === "TOMBSTONED" || missed > ENDED_AFTER_MISSED || (frequency === "UNKNOWN" && !input.isActive)) {
    state = "ended";
  } else if (missed >= INACTIVE_AFTER_MISSED) {
    state = "inactive";
  }

  const lastCents = Math.abs(charges[0]?.amountCents ?? input.lastCents);
  const previous = charges[1] ? Math.abs(charges[1].amountCents) : null;

  return {
    id: input.id,
    accountId: input.accountId,
    direction: input.direction,
    name: edit?.name ?? input.name,
    logoUrl: input.logoUrl,
    category: edit?.category ?? input.category,
    frequency,
    amountCents: edit?.amountCents ?? lastCents,
    lastDate,
    nextDate,
    anchor,
    state,
    early: input.status === "EARLY_DETECTION",
    hidden: edit?.hidden ?? false,
    edited: Boolean(
      edit && (edit.name !== null || edit.category !== null || edit.amountCents !== null || edit.frequency !== null || edit.nextDate !== null),
    ),
    charges,
    previousCents: previous !== null && previous !== lastCents ? previous : null,
    changeCents: previous !== null && previous !== lastCents ? lastCents - previous : null,
  };
}

export function isCounted(stream: RecurringStream): boolean {
  return !stream.hidden && stream.state !== "ended";
}

export function monthlyCents(stream: RecurringStream): number {
  return Math.round(stream.amountCents * frequencyMeta(stream.frequency).perMonth);
}

export function totals(streams: RecurringStream[]) {
  let inCents = 0;
  let outCents = 0;
  let yearlyOutCents = 0;
  for (const stream of streams.filter(isCounted)) {
    if (stream.direction === "inflow") {
      inCents += monthlyCents(stream);
    } else {
      outCents += monthlyCents(stream);
      yearlyOutCents += Math.round(stream.amountCents * frequencyMeta(stream.frequency).perMonth * 12);
    }
  }
  return { inCents, outCents, yearlyOutCents };
}

export function occurrences(streams: RecurringStream[], from: string, to: string, today: string): Occurrence[] {
  const list: Occurrence[] = [];
  for (const stream of streams.filter(isCounted)) {
    for (const charge of stream.charges) {
      if (charge.date >= from && charge.date <= to && charge.date <= today) {
        list.push({ stream, date: charge.date, amountCents: Math.abs(charge.amountCents), projected: false });
      }
    }
    if (stream.nextDate === null || stream.anchor === null) continue;
    const start = from > stream.nextDate ? from : stream.nextDate;
    for (const date of datesBetween(stream.anchor, stream.frequency, start, to)) {
      list.push({ stream, date, amountCents: stream.amountCents, projected: true });
    }
  }
  return list.sort((a, b) => a.date.localeCompare(b.date) || b.amountCents - a.amountCents);
}

export function categoryBreakdown(streams: RecurringStream[]) {
  const byCategory = new Map<string, number>();
  for (const stream of streams.filter(isCounted)) {
    if (stream.direction !== "outflow") continue;
    byCategory.set(stream.category, (byCategory.get(stream.category) ?? 0) + monthlyCents(stream));
  }
  const total = [...byCategory.values()].reduce((sum, cents) => sum + cents, 0);
  return [...byCategory.entries()]
    .map(([category, cents]) => ({ category, cents, share: total > 0 ? (cents / total) * 100 : 0 }))
    .sort((a, b) => b.cents - a.cents);
}
