"use client";

import Link from "next/link";
import { useState } from "react";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { Money } from "@/components/MoneyProvider";

export type ListStream = {
  id: string;
  name: string;
  logoUrl: string | null;
  frequencyLabel: string;
  nextLabel: string | null;
  amountCents: number;
  inflow: boolean;
  inactive: boolean;
  early: boolean;
  changeCents: number | null;
  group: "tracked" | "ended" | "hidden";
};

function Badge({ tone, children }: { tone: "muted" | "positive" | "negative"; children: React.ReactNode }) {
  const tones = {
    muted: "border-line bg-surface text-muted",
    positive: "border-positive/20 bg-positive/5 text-positive",
    negative: "border-negative/20 bg-negative/5 text-negative",
  };
  return <span className={`tabular inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[11px] ${tones[tone]}`}>{children}</span>;
}

function Row({ stream }: { stream: ListStream }) {
  const cheaper = stream.changeCents !== null && stream.changeCents < 0;
  return (
    <li>
      <Link href={`/recurring/${stream.id}`} className="row-wash flex items-center gap-3 px-4 py-2.5 sm:px-5">
        <MerchantAvatar name={stream.name} logoUrl={stream.logoUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{stream.name}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="label truncate">
              {stream.frequencyLabel}
              {stream.nextLabel && ` · ${stream.nextLabel}`}
            </span>
            {stream.early && <Badge tone="muted">New</Badge>}
            {stream.inactive && <Badge tone="muted">Possibly inactive</Badge>}
            {stream.changeCents !== null && (
              <Badge tone={cheaper === stream.inflow ? "negative" : "positive"}>
                {cheaper ? "▼" : "▲"} <Money cents={Math.abs(stream.changeCents)} />
              </Badge>
            )}
          </div>
        </div>
        <span className={`tabular shrink-0 text-sm font-medium ${stream.inflow ? "text-positive" : ""}`}>
          {stream.inflow ? "+" : ""}
          <Money cents={stream.amountCents} />
        </span>
      </Link>
    </li>
  );
}

function Group({ title, streams }: { title: string; streams: ListStream[] }) {
  if (streams.length === 0) return null;
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted transition hover:text-ink sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          {title} <span className="tabular text-faint">{streams.length}</span>
        </span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 transition group-open:rotate-180" aria-hidden>
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <ul className="pb-2">
        {streams.map((stream) => (
          <Row key={stream.id} stream={stream} />
        ))}
      </ul>
    </details>
  );
}

export function RecurringList({ streams }: { streams: ListStream[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle ? streams.filter((stream) => stream.name.toLowerCase().includes(needle)) : streams;
  const tracked = matches.filter((stream) => stream.group === "tracked");

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
        <h2 className="text-sm font-medium">
          Recurring payments <span className="tabular text-faint">{streams.filter((stream) => stream.group === "tracked").length}</span>
        </h2>
        <label className="control flex h-9 w-full items-center gap-2 px-3 focus-within:ring-2 focus-within:ring-line sm:w-56">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 shrink-0 text-faint" aria-hidden>
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13 13 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recurring"
            aria-label="Search recurring"
            className="w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
          />
        </label>
      </div>
      {tracked.length === 0 ? (
        <p className="px-5 pt-2 pb-6 text-center text-sm text-muted">
          {needle ? `Nothing matches “${query.trim()}”.` : "No recurring payments found yet."}
        </p>
      ) : (
        <ul className="pb-2">
          {tracked.map((stream) => (
            <Row key={stream.id} stream={stream} />
          ))}
        </ul>
      )}
      <Group title="Ended" streams={matches.filter((stream) => stream.group === "ended")} />
      <Group title="Not recurring" streams={matches.filter((stream) => stream.group === "hidden")} />
    </section>
  );
}
