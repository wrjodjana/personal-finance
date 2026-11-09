"use client";

import Link from "next/link";
import { useState } from "react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { Money } from "@/components/MoneyProvider";

export type CalendarItem = {
  streamId: string;
  name: string;
  logoUrl: string | null;
  amountCents: number;
  inflow: boolean;
  projected: boolean;
};

type Props = {
  month: string;
  label: string;
  today: string;
  days: Record<string, CalendarItem[]>;
  outCents: number;
  inCents: number;
  previousHref: string | null;
  nextHref: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_AVATARS = 2;

function cells(month: string): (string | null)[] {
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthIndex - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const list: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day++) list.push(`${month}-${String(day).padStart(2, "0")}`);
  while (list.length % 7 !== 0) list.push(null);
  return list;
}

function dayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function Arrow({ href, label, path }: { href: string | null; label: string; path: string }) {
  const icon = (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const style = "grid size-8 place-items-center rounded-md text-muted transition";
  if (!href) {
    return (
      <span aria-disabled className={`${style} opacity-30`}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} scroll={false} className={`${style} hover:bg-surface hover:text-ink`}>
      {icon}
    </Link>
  );
}

export function RecurringCalendar({ month, label, today, days, outCents, inCents, previousHref, nextHref }: Props) {
  const firstWithItems = Object.keys(days).sort().find((date) => date >= today) ?? Object.keys(days).sort()[0] ?? null;
  const [selected, setSelected] = useState<string | null>(today.startsWith(month) && days[today] ? today : firstWithItems);
  const picked = selected && days[selected] ? days[selected] : [];

  return (
    <section className="card px-4 pt-4 pb-3 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{label}</h2>
          <p className="tabular mt-1 text-2xl font-medium tracking-tight">
            <Money cents={outCents} />
          </p>
          <p className="label mt-0.5">
            Out this month
            {inCents > 0 && (
              <>
                {" · "}
                <span className="text-positive">
                  +<Money cents={inCents} />
                </span>{" "}
                in
              </>
            )}
          </p>
        </div>
        <div className="control inline-flex h-10 items-center gap-0.5 px-1">
          <Arrow href={previousHref} label="Previous month" path="m12 5-5 5 5 5" />
          <Arrow href={nextHref} label="Next month" path="m8 5 5 5-5 5" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="label pb-1">
            {weekday}
          </span>
        ))}
        {cells(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const list = days[date] ?? [];
          const isToday = date === today;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              aria-pressed={isSelected}
              aria-label={`${dayLabel(date)}, ${list.length} ${list.length === 1 ? "payment" : "payments"}`}
              className={`flex h-12 flex-col items-center justify-start gap-1 rounded-lg pt-1.5 text-xs transition sm:h-16 ${
                isSelected ? "bg-surface ring-1 ring-line" : "hover:bg-surface"
              } ${date < today ? "text-faint" : "text-ink"}`}
            >
              <span
                className={`tabular grid size-5 place-items-center rounded-full ${
                  isToday ? "bg-ink font-medium text-canvas" : ""
                }`}
              >
                {Number(date.slice(8))}
              </span>
              {list.length > 0 && (
                <span className="flex items-center -space-x-1.5">
                  {list.slice(0, MAX_AVATARS).map((item) => (
                    <span key={item.streamId} className={`rounded-full ring-2 ring-card ${item.projected ? "" : "opacity-60"}`}>
                      <MerchantAvatar name={item.name} logoUrl={item.logoUrl} size={18} />
                    </span>
                  ))}
                  {list.length > MAX_AVATARS && (
                    <span className="tabular grid size-[18px] place-items-center rounded-full bg-surface text-[9px] text-muted ring-2 ring-card">
                      +{list.length - MAX_AVATARS}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        {selected === null ? (
          <p className="py-2 text-center text-sm text-muted">No recurring payments this month.</p>
        ) : (
          <>
            <p className="label px-1">{dayLabel(selected)}</p>
            {picked.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted">Nothing due.</p>
            ) : (
              <ul className="mt-1">
                {picked.map((item) => (
                  <li key={item.streamId}>
                    <Link
                      href={`/recurring/${item.streamId}`}
                      className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition hover:bg-surface"
                    >
                      <MerchantAvatar name={item.name} logoUrl={item.logoUrl} size={24} />
                      <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                      <span className="label">{item.projected ? "Expected" : item.inflow ? "Received" : "Paid"}</span>
                      <span className={`tabular text-sm font-medium ${item.inflow ? "text-positive" : ""}`}>
                        {item.inflow ? "+" : ""}
                        <Money cents={item.amountCents} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
