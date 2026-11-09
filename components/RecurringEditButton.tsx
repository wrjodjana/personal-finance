"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMoney } from "@/components/MoneyProvider";
import { Select, SELECT_TRIGGER, type SelectOption } from "@/components/Select";
import { fractionDigits, fromInputValue, moneySymbol, toInputValue } from "@/lib/currency";

type Props = {
  streamId: string;
  name: string;
  category: string;
  amountCents: number;
  frequency: string;
  nextDate: string | null;
  hidden: boolean;
  canToggle: boolean;
  edited: boolean;
  categories: SelectOption[];
  frequencies: SelectOption[];
};

function post(body: Record<string, unknown>) {
  return fetch("/api/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function errorOf(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? fallback;
}

const BUTTON =
  "control inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition hover:bg-surface disabled:opacity-50";

export function RecurringEditButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleHidden() {
    setBusy(true);
    setError(null);
    const response = await post({ streamId: props.streamId, hidden: !props.hidden });
    setBusy(false);
    if (!response.ok) {
      setError(await errorOf(response, "Could not save the change"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={BUTTON} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden>
          <path d="M4 16h3l8.5-8.5-3-3L4 13zM11 6l3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Edit
      </button>
      {props.canToggle && (
        <button type="button" className={BUTTON} onClick={toggleHidden} disabled={busy}>
          {props.hidden ? "Track as recurring" : "Not recurring"}
        </button>
      )}
      {error && <p className="w-full text-xs text-negative">{error}</p>}
      {open && (
        <EditDialog
          {...props}
          onDone={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function EditDialog({
  streamId,
  name: initialName,
  category,
  amountCents,
  frequency: initialFrequency,
  nextDate,
  edited,
  categories,
  frequencies,
  onDone,
  onSaved,
}: Props & { onDone: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const money = useMoney();
  const initialAmount = toInputValue(amountCents, money);
  const [name, setName] = useState(initialName);
  const [pick, setPick] = useState(category);
  const [amount, setAmount] = useState(initialAmount);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [day, setDay] = useState(nextDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function close() {
    ref.current?.close();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above zero");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await post({
      streamId,
      name,
      category: pick,
      amountCents: amount === initialAmount ? amountCents : fromInputValue(value, money),
      frequency,
      nextDate: frequency === "UNKNOWN" ? null : day || null,
    });
    setBusy(false);
    if (!response.ok) {
      setError(await errorOf(response, "Could not save the changes"));
      return;
    }
    close();
    onSaved();
  }

  async function reset() {
    setBusy(true);
    await post({ streamId, reset: true });
    setBusy(false);
    close();
    onSaved();
  }

  const field =
    "control h-10 w-full px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:opacity-50";

  return (
    <dialog
      ref={ref}
      onClose={onDone}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="card m-auto w-[min(26rem,calc(100vw-2rem))] p-0 text-ink shadow-xl backdrop:bg-ink/20 backdrop:backdrop-blur-[1px]"
    >
      <form onSubmit={save} className="space-y-4 p-5">
        <h2 className="text-base font-medium">Edit recurring payment</h2>
        <label className="block space-y-1.5">
          <span className="label">Name</span>
          <input className={field} value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="label">Amount</span>
            <span className="control flex h-10 items-center gap-1 px-3 focus-within:ring-2 focus-within:ring-line">
              <span className="text-sm text-faint">{moneySymbol(money)}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step={10 ** -fractionDigits(money)}
                className="tabular w-full bg-transparent text-sm focus:outline-none"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="label">Category</span>
            <Select label="Category" value={pick} options={categories} onChange={setPick} className={`${SELECT_TRIGGER} w-full`} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="label">Repeats</span>
            <Select
              label="Repeats"
              value={frequency}
              options={frequencies}
              onChange={setFrequency}
              className={`${SELECT_TRIGGER} w-full`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Next payment</span>
            <input
              type="date"
              className={field}
              value={day}
              onChange={(event) => setDay(event.target.value)}
              disabled={frequency === "UNKNOWN"}
            />
          </label>
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          {edited && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-xs text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink disabled:opacity-50"
            >
              Reset to Plaid values
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="ml-auto h-9 rounded-lg px-3 text-sm text-muted transition hover:bg-surface hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-[oklch(0.35_0.02_65)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[oklch(0.29_0.02_65)] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
