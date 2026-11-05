"use client";

import { useEffect, useId, useRef, useState } from "react";
import { categoryMeta, categoryPillStyle } from "@/lib/categories";

type Option = { value: string; label: string };

const RESET = "__reset";

type Props = {
  label: string;
  category: string | null;
  options: Option[];
  reset?: { label: string; first?: boolean };
  align?: "left" | "right";
  disabled?: boolean;
  onPick: (value: string | null) => void;
  children: React.ReactNode;
};

export function CategoryPicker({ label, category, options, reset, align = "left", disabled = false, onPick, children }: Props) {
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const current = category ?? RESET;
  const items = itemsFor(query.trim().toLowerCase());

  function itemsFor(needle: string): Option[] {
    const resetItems = reset && !needle ? [{ value: RESET, label: reset.label }] : [];
    const matches = options.filter((option) => !needle || option.label.toLowerCase().includes(needle));
    return reset?.first ? [...resetItems, ...matches] : [...matches, ...resetItems];
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    setUpward(Boolean(rect && rect.bottom + 340 > window.innerHeight && rect.top > 340));
    setQuery("");
    setActive(Math.max(0, itemsFor("").findIndex((item) => item.value === current)));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function pick(value: string) {
    close();
    if (value !== current) onPick(value === RESET ? null : value);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[active];
      if (item) pick(item.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative max-w-full">
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex max-w-full cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:cursor-default disabled:opacity-50"
      >
        {children}
      </button>
      {open && (
        <div
          className={`card absolute z-[6] w-56 ${align === "right" ? "right-0" : "left-0"} overflow-hidden shadow-xl ${upward ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
        >
          <label className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0 text-faint" aria-hidden>
              <circle cx="9" cy="9" r="5.5" />
              <path d="m13.5 13.5 3 3" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search categories..."
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={items[active] ? `${id}-${active}` : undefined}
              aria-label="Search categories"
              className="w-full bg-transparent text-sm placeholder:text-faint focus:outline-none"
            />
          </label>
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Categories" className="max-h-64 overflow-y-auto p-1.5">
            {items.length === 0 && <li className="px-3 py-6 text-center text-xs text-muted">No category matches.</li>}
            {items.map((item, index) => {
              const selected = item.value === current;
              const highlighted = index === active;
              return (
                <li
                  key={item.value}
                  id={`${id}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  onPointerMove={() => setActive(index)}
                  onClick={() => pick(item.value)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${
                    highlighted ? "border-ink/70 bg-surface" : "border-transparent"
                  } ${item.value === RESET ? `text-xs text-muted ${reset?.first ? "mb-1" : "mt-1"}` : ""}`}
                >
                  {item.value === RESET ? (
                    <span>{reset?.first ? item.label : `↺ ${item.label}`}</span>
                  ) : (
                    <span
                      className="truncate rounded-full border px-2 py-px text-xs leading-5"
                      style={categoryPillStyle(categoryMeta(item.value).color)}
                    >
                      {item.label}
                    </span>
                  )}
                  {selected && (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3.5 shrink-0 text-muted" aria-hidden>
                      <path d="m3.5 8.25 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
