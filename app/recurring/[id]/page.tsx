import Link from "next/link";
import { notFound } from "next/navigation";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { Money } from "@/components/MoneyProvider";
import { RecurringEditButton } from "@/components/RecurringEditButton";
import { SetupNotice } from "@/components/SetupNotice";
import { CATEGORIES, CATEGORY_KEYS, categoryMeta, categoryPillStyle } from "@/lib/categories";
import { formatDate, formatDay, today } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { daysBetween, FREQUENCIES, frequencyMeta, isCounted, monthlyCents, type RecurringStream } from "@/lib/recurring";
import { loadRecurring } from "@/lib/recurringData";

export const dynamic = "force-dynamic";

const PER: Record<string, string> = {
  WEEKLY: "/ week",
  BIWEEKLY: "/ 2 weeks",
  SEMI_MONTHLY: "/ half month",
  MONTHLY: "/ month",
  ANNUALLY: "/ year",
  UNKNOWN: "each time",
};

function stateLabel(stream: RecurringStream): { label: string; tone: string } {
  if (!isCounted(stream)) return { label: "Not recurring", tone: "border-line bg-surface text-muted" };
  if (stream.state === "inactive") return { label: "Possibly inactive", tone: "border-line bg-surface text-muted" };
  if (stream.early) return { label: "New", tone: "border-line bg-surface text-muted" };
  return { label: "Active", tone: "border-positive/20 bg-positive/5 text-positive" };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3 sm:px-5">
      <p className="label">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export default async function RecurringStreamPage({ params }: PageProps<"/recurring/[id]">) {
  if (!plaidConfigured()) return <SetupNotice />;
  const { id } = await params;
  const { streams, accounts, entries } = await loadRecurring();
  const stream = streams.find((item) => item.id === id);
  if (!stream) notFound();

  const now = today();
  const inflow = stream.direction === "inflow";
  const account = accounts.get(stream.accountId);
  const meta = categoryMeta(stream.category);
  const state = stateLabel(stream);
  const change = stream.changeCents;
  const daysUntil = stream.nextDate ? daysBetween(now, stream.nextDate) : null;
  const charges = stream.charges.map((charge) => ({ charge, entry: entries.get(charge.id) }));
  const firstDate = stream.charges.at(-1)?.date ?? null;
  const categoryOptions = [
    ...(CATEGORY_KEYS.includes(stream.category) ? [] : [{ value: stream.category, label: meta.label }]),
    ...CATEGORY_KEYS.map((key) => ({ value: key, label: CATEGORIES[key].label })),
  ];

  return (
    <div className="space-y-5">
      <Link href="/recurring" className="label inline-flex items-center gap-1 hover:text-ink">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5" aria-hidden>
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Recurring
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <MerchantAvatar name={stream.name} logoUrl={stream.logoUrl} size={48} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium tracking-tight">{stream.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full border px-2.5 text-xs" style={categoryPillStyle(meta.color)}>
                {meta.label}
              </span>
              <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs ${state.tone}`}>{state.label}</span>
            </div>
          </div>
        </div>
        <RecurringEditButton
          streamId={stream.id}
          name={stream.name}
          category={stream.category}
          amountCents={stream.amountCents}
          frequency={stream.frequency}
          nextDate={stream.nextDate}
          hidden={stream.hidden}
          canToggle={stream.hidden || isCounted(stream)}
          edited={stream.edited}
          categories={categoryOptions}
          frequencies={FREQUENCIES.map((item) => ({ value: item.key, label: item.label }))}
        />
      </header>

      <section className="card">
        <div className="px-4 pt-4 pb-4 sm:px-5">
          <p className="tabular text-3xl font-medium tracking-tight">
            <span className={inflow ? "text-positive" : ""}>
              {inflow ? "+" : ""}
              <Money cents={stream.amountCents} />
            </span>{" "}
            <span className="text-base font-normal text-muted">{PER[stream.frequency]}</span>
          </p>
          {change !== null && stream.previousCents !== null && (
            <p className={`mt-1 text-sm ${change < 0 === inflow ? "text-negative" : "text-positive"}`}>
              {change < 0 ? "Down" : "Up"} <Money cents={Math.abs(change)} /> from <Money cents={stream.previousCents} /> (
              {((Math.abs(change) / stream.previousCents) * 100).toFixed(1)}%) since the charge before
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-[inherit] border-t border-line bg-line sm:grid-cols-4">
          <Fact label={inflow ? "Next deposit" : "Next payment"}>
            {stream.nextDate && daysUntil !== null ? (
              <>
                <p className="tabular">{formatDay(stream.nextDate).replace(/, \d{4}$/, "")}</p>
                <p className="label mt-0.5">
                  {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                </p>
              </>
            ) : (
              <p className="text-muted">Not predicted</p>
            )}
          </Fact>
          <Fact label="Repeats">
            <p>{frequencyMeta(stream.frequency).label}</p>
            <p className="label tabular mt-0.5">
              <Money cents={monthlyCents(stream)} /> / month
            </p>
          </Fact>
          <Fact label="Account">
            {account ? (
              <span className="flex min-w-0 items-center gap-2">
                <InstitutionLogo name={account.label} logoUrl={account.logoUrl} color={account.color} size={20} />
                <span className="truncate">{account.label}</span>
              </span>
            ) : (
              <span className="text-muted">Unknown</span>
            )}
          </Fact>
          <Fact label="Since">
            <p className="tabular">{firstDate ? formatDay(firstDate) : "-"}</p>
            <p className="label mt-0.5">
              {stream.charges.length} {stream.charges.length === 1 ? "charge" : "charges"}
            </p>
          </Fact>
        </div>
      </section>

      <section className="card">
        <h2 className="px-4 pt-4 pb-2 text-sm font-medium sm:px-5">Past {inflow ? "deposits" : "charges"}</h2>
        {charges.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted">No matching transactions are stored yet.</p>
        ) : (
          <ul className="pb-2">
            {charges.map(({ charge, entry }) => (
              <li key={charge.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="tabular text-sm">{formatDay(charge.date)}</p>
                  <p className="label truncate">{entry?.description ?? formatDate(charge.date)}</p>
                </div>
                <span className={`tabular shrink-0 text-sm font-medium ${charge.amountCents < 0 ? "text-positive" : ""}`}>
                  {charge.amountCents < 0 ? "+" : ""}
                  <Money cents={Math.abs(charge.amountCents)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
