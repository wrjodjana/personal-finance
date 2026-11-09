import Link from "next/link";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { FittedMoney, Money } from "@/components/MoneyProvider";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { RecurringCalendar, type CalendarItem } from "@/components/RecurringCalendar";
import { RecurringList, type ListStream } from "@/components/RecurringList";
import { SetupNotice } from "@/components/SetupNotice";
import { categoryMeta } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { addMonths, currentMonth, formatDate, monthEnd, monthLabel, monthStart, parseMonth, today } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import {
  addDays,
  categoryBreakdown,
  daysBetween,
  frequencyMeta,
  isCounted,
  occurrences,
  totals,
  type Occurrence,
  type RecurringStream,
} from "@/lib/recurring";
import { loadRecurring } from "@/lib/recurringData";
import { items } from "@/lib/schema";

export const dynamic = "force-dynamic";

const MONTHS_AROUND = 12;
const UPCOMING_DAYS = 30;
const UPCOMING_ROWS = 5;

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="card @container px-4 py-3.5">
      <p className="label">{label}</p>
      <p className="tabular mt-1 text-2xl font-medium tracking-tight [--fit-max:var(--text-2xl)]">{value}</p>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

function dateLabel(date: string, now: string): string {
  const label = formatDate(date);
  return date.slice(0, 4) === now.slice(0, 4) ? label : `${label}, ${date.slice(0, 4)}`;
}

function relativeLabel(date: string, now: string): string {
  const days = daysBetween(now, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  return formatDate(date);
}

function toListStream(stream: RecurringStream, now: string): ListStream {
  return {
    id: stream.id,
    name: stream.name,
    logoUrl: stream.logoUrl,
    frequencyLabel: frequencyMeta(stream.frequency).label,
    nextLabel: stream.nextDate ? dateLabel(stream.nextDate, now) : null,
    amountCents: stream.amountCents,
    inflow: stream.direction === "inflow",
    inactive: stream.state === "inactive",
    early: stream.early,
    changeCents: stream.changeCents,
    group: stream.hidden ? "hidden" : stream.state === "ended" ? "ended" : "tracked",
  };
}

function Upcoming({ title, list, inflow, now }: { title: string; list: Occurrence[]; inflow: boolean; now: string }) {
  const total = list.reduce((sum, item) => sum + item.amountCents, 0);
  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className={`tabular text-sm font-medium ${inflow ? "text-positive" : ""}`}>
          {inflow && total > 0 ? "+" : ""}
          <Money cents={total} />
        </span>
      </div>
      {list.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">Nothing in the next {UPCOMING_DAYS} days.</p>
      ) : (
        <ul className="pb-2">
          {list.slice(0, UPCOMING_ROWS).map((item) => (
            <li key={`${item.stream.id}-${item.date}`}>
              <Link href={`/recurring/${item.stream.id}`} className="row-wash flex items-center gap-3 px-4 py-2 sm:px-5">
                <MerchantAvatar name={item.stream.name} logoUrl={item.stream.logoUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.stream.name}</p>
                  <p className="label">{relativeLabel(item.date, now)}</p>
                </div>
                <span className={`tabular shrink-0 text-sm font-medium ${inflow ? "text-positive" : ""}`}>
                  {inflow ? "+" : ""}
                  <Money cents={item.amountCents} />
                </span>
              </Link>
            </li>
          ))}
          {list.length > UPCOMING_ROWS && (
            <li className="label px-4 pt-1 pb-2 sm:px-5">+{list.length - UPCOMING_ROWS} more</li>
          )}
        </ul>
      )}
    </section>
  );
}

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const connections = await getDb().select().from(items).all();
  if (connections.length === 0) {
    return (
      <div className="card mx-auto mt-16 max-w-md px-8 py-10 text-center">
        <h1 className="text-lg font-medium">Connect your first account</h1>
        <p className="mt-2 text-sm text-muted">Connect a bank account or card to find your subscriptions and bills.</p>
        <div className="mt-6 flex justify-center">
          <PlaidLinkButton label="Connect account" />
        </div>
      </div>
    );
  }

  const now = today();
  const thisMonth = currentMonth();
  const earliest = addMonths(thisMonth, -MONTHS_AROUND);
  const latest = addMonths(thisMonth, MONTHS_AROUND);
  const requested = parseMonth((await searchParams).month);
  const month = requested < earliest ? earliest : requested > latest ? latest : requested;

  const { streams } = await loadRecurring();
  const counted = streams.filter(isCounted);
  const failed = connections.filter((item) => item.recurringError);
  const sum = totals(streams);
  const breakdown = categoryBreakdown(streams);

  const monthItems = occurrences(streams, monthStart(month), monthEnd(month), now);
  const days: Record<string, CalendarItem[]> = {};
  for (const item of monthItems) {
    (days[item.date] ??= []).push({
      streamId: item.stream.id,
      name: item.stream.name,
      logoUrl: item.stream.logoUrl,
      amountCents: item.amountCents,
      inflow: item.stream.direction === "inflow",
      projected: item.projected,
    });
  }
  const monthOut = monthItems.filter((item) => item.stream.direction === "outflow").reduce((total, item) => total + item.amountCents, 0);
  const monthIn = monthItems.filter((item) => item.stream.direction === "inflow").reduce((total, item) => total + item.amountCents, 0);

  const upcoming = occurrences(streams, now, addDays(now, UPCOMING_DAYS), now).filter((item) => item.projected);
  const weekCount = upcoming.filter((item) => item.date <= addDays(now, 6)).length;
  const monthHref = (value: string) => (value === thisMonth ? "/recurring" : `/recurring?month=${value}`);

  return (
    <div className="page-wide space-y-5">
      <header>
        <p className="eyebrow">{counted.length} tracked</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Recurring</h1>
      </header>

      {failed.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-negative/20 bg-negative/5 px-4 py-3 text-sm">
          <span className="size-2 shrink-0 rounded-full bg-negative" />
          Plaid could not load recurring payments for {failed.map((item) => item.institutionName).join(", ")}. They will
          load on the next sync.
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Yearly forecast" value={<FittedMoney cents={sum.yearlyOutCents} />} note="Money out over 12 months" />
        <Stat label="Avg monthly cost" value={<FittedMoney cents={sum.outCents} />} note="All recurring payments" />
        <Stat
          label="Monthly in"
          value={
            <span className="text-positive">
              <FittedMoney cents={sum.inCents} />
            </span>
          }
          note="Pay and other income"
        />
        <Stat
          label="Next 7 days"
          value={String(weekCount)}
          note={weekCount === 1 ? "Payment due" : "Payments due"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <RecurringCalendar
            key={month}
            month={month}
            label={monthLabel(month)}
            today={now}
            days={days}
            outCents={monthOut}
            inCents={monthIn}
            previousHref={month > earliest ? monthHref(addMonths(month, -1)) : null}
            nextHref={month < latest ? monthHref(addMonths(month, 1)) : null}
          />
          <RecurringList streams={streams.map((stream) => toListStream(stream, now))} />
        </div>

        <div className="min-w-0 space-y-5">
          <Upcoming
            title="Upcoming expenses"
            list={upcoming.filter((item) => item.stream.direction === "outflow")}
            inflow={false}
            now={now}
          />
          <Upcoming
            title="Upcoming income"
            list={upcoming.filter((item) => item.stream.direction === "inflow")}
            inflow
            now={now}
          />
          <section className="card">
            <h2 className="px-4 pt-4 pb-2 text-sm font-medium sm:px-5">By category</h2>
            {breakdown.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No recurring costs yet.</p>
            ) : (
              <ul className="space-y-3 px-4 pt-1 pb-4 sm:px-5">
                {breakdown.map((item) => {
                  const meta = categoryMeta(item.category);
                  return (
                    <li key={item.category}>
                      <div className="flex items-center gap-2.5">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                        <span className="min-w-0 flex-1 truncate text-sm">{meta.label}</span>
                        <span className="tabular text-sm font-medium">
                          <Money cents={item.cents} />
                        </span>
                        <span className="tabular w-11 text-right text-xs text-muted">{item.share.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full" style={{ width: `${item.share}%`, background: meta.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="label border-t border-line px-4 py-2.5 sm:px-5">Per month</p>
          </section>
        </div>
      </div>
    </div>
  );
}
