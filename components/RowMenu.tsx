"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Select, SELECT_TRIGGER } from "@/components/Select";
import { categoryMeta } from "@/lib/categories";

type Option = { value: string; label: string };

type Props = {
  transactionId: string;
  merchant: string;
  date: string;
  amountCents: number;
  category: string;
  removed: boolean;
  edited: boolean;
  categoryEdited: boolean;
  options: Option[];
};

const ICON = "size-4 shrink-0";

function post(url: string, body: Record<string, unknown>) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function RowMenu(props: Props) {
  const { transactionId, merchant, removed } = props;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const rect = trigger.current?.getBoundingClientRect();
    setUpward(Boolean(rect && rect.bottom + 160 > window.innerHeight));
    setOpen(!open);
  }

  async function act(url: string, body: Record<string, unknown>) {
    setOpen(false);
    setBusy(true);
    await post(url, { transactionId, ...body });
    setBusy(false);
    router.refresh();
  }

  function onMenuKey(event: React.KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors focus:outline-none";

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${merchant}`}
        className={`grid size-7 place-items-center rounded-md text-faint transition hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:opacity-40 ${
          open ? "bg-surface text-ink" : ""
        }`}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
          <circle cx="3.5" cy="8" r="1.1" />
          <circle cx="8" cy="8" r="1.1" />
          <circle cx="12.5" cy="8" r="1.1" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${merchant}`}
          onKeyDown={onMenuKey}
          className={`card absolute right-0 z-[5] w-40 p-1 shadow-lg ${upward ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          <button
            type="button"
            role="menuitem"
            className={`${item} hover:bg-surface focus:bg-surface`}
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={`${ICON} text-muted`} aria-hidden>
              <path d="m10.5 3 2.5 2.5-7 7H3.5V10l7-7Z" strokeLinejoin="round" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} hover:bg-surface focus:bg-surface`}
            onClick={() => act("/api/removed", { removed: !removed })}
          >
            {removed ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={`${ICON} text-muted`} aria-hidden>
                <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
                <path d="m5.5 8 1.75 1.75L10.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={`${ICON} text-muted`} aria-hidden>
                <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
                <path d="m6 6 4 4m0-4-4 4" strokeLinecap="round" />
              </svg>
            )}
            {removed ? "Include" : "Exclude"}
          </button>
          <div className="mx-1.5 my-1 border-t border-line" role="separator" />
          <button
            type="button"
            role="menuitem"
            className={`${item} text-negative hover:bg-negative/5 focus:bg-negative/5`}
            onClick={() => act("/api/deleted", { deleted: true })}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={ICON} aria-hidden>
              <path d="M2.75 4.5h10.5M6.5 4.5V3.25h3V4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m4 4.5.6 8.1a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.1M6.75 7v4m2.5-4v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </button>
        </div>
      )}
      {editing && <EditDialog {...props} onDone={() => setEditing(false)} onSaved={() => router.refresh()} />}
    </div>
  );
}

function toDollars(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

function EditDialog({
  transactionId,
  merchant,
  date,
  amountCents,
  category,
  edited,
  categoryEdited,
  options,
  onDone,
  onSaved,
}: Props & { onDone: () => void; onSaved: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(merchant);
  const [day, setDay] = useState(date);
  const [amount, setAmount] = useState(toDollars(amountCents));
  const [direction, setDirection] = useState(amountCents < 0 ? "in" : "out");
  const [pick, setPick] = useState(category);
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
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError("Enter a valid amount");
      return;
    }
    const cents = Math.round(dollars * 100) * (direction === "in" ? -1 : 1);
    setBusy(true);
    setError(null);
    const response = await post("/api/edits", { transactionId, name, date: day, amountCents: cents });
    if (response.ok && pick !== category) {
      await post("/api/overrides", { transactionId, category: pick });
    }
    setBusy(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not save the changes");
      return;
    }
    close();
    onSaved();
  }

  async function restore() {
    setBusy(true);
    await post("/api/edits", { transactionId, reset: true });
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
        <h2 className="text-base font-medium">Edit transaction</h2>
        <label className="block space-y-1.5">
          <span className="label">Name</span>
          <input className={field} value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="label">Date</span>
            <input type="date" className={field} value={day} onChange={(event) => setDay(event.target.value)} required />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Category</span>
            <Select
              label="Category"
              value={pick}
              options={[
                ...(options.some((option) => option.value === category)
                  ? []
                  : [{ value: category, label: categoryMeta(category).label }]),
                ...options,
              ]}
              onChange={setPick}
              className={`${SELECT_TRIGGER} w-full`}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="label">Amount</span>
            <span className="control flex h-10 items-center gap-1 px-3 focus-within:ring-2 focus-within:ring-line">
              <span className="text-sm text-faint">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="tabular w-full bg-transparent text-sm focus:outline-none"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="label">Type</span>
            <Select
              label="Type"
              value={direction}
              options={[
                { value: "out", label: "Money out" },
                { value: "in", label: "Money in" },
              ]}
              onChange={setDirection}
              className={`${SELECT_TRIGGER} w-full`}
            />
          </label>
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          {(edited || categoryEdited) && (
            <button
              type="button"
              onClick={restore}
              disabled={busy}
              className="text-xs text-muted underline decoration-line underline-offset-2 hover:text-ink hover:decoration-ink disabled:opacity-50"
            >
              Reset to bank values
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
