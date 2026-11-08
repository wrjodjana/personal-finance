"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; short?: string };

type Props = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
  chevron?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

const GAP = 8;
const EDGE = 8;
const MAX_HEIGHT = 288;

export const SELECT_TRIGGER =
  "control flex h-10 cursor-pointer items-center justify-between gap-2 rounded-xl pr-2.5 pl-3.5 text-sm whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:cursor-default disabled:opacity-50";

export function Select({ value, options, onChange, label, className = SELECT_TRIGGER, chevron = true, disabled = false, icon }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ top: number; left: number; minWidth: number; upward: boolean } | null>(null);
  const selected = options.find((option) => option.value === value);

  function show() {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    setPlace(null);
    if (refocus) trigger.current?.focus();
  }

  function pick(index: number) {
    const option = options[index];
    close();
    if (option && option.value !== value) onChange(option.value);
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const height = Math.min(list.current.scrollHeight, MAX_HEIGHT);
    const width = Math.max(list.current.offsetWidth, rect.width);
    const upward = rect.bottom + GAP + height > window.innerHeight - EDGE && rect.top - GAP - height > EDGE;
    const left = Math.min(Math.max(rect.left, EDGE), window.innerWidth - width - EDGE);
    setPlace({ top: upward ? rect.top - GAP - height : rect.bottom + GAP, left, minWidth: rect.width, upward });
  }, [open]);

  useEffect(() => {
    if (place) list.current?.focus({ preventScroll: true });
  }, [place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !trigger.current?.contains(target)) close(false);
    };
    const onScroll = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, place]);

  function onTriggerKey(event: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      show();
    }
  }

  function onListKey(event: React.KeyboardEvent) {
    const last = options.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, last));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      close(false);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const letter = event.key.toLowerCase();
      const order = [...options.slice(active + 1), ...options.slice(0, active + 1)];
      const match = order.find((option) => option.label.toLowerCase().startsWith(letter));
      if (match) setActive(options.indexOf(match));
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
        className={className}
      >
        {icon}
        <span className="truncate">{selected?.short ?? selected?.label ?? ""}</span>
        {chevron && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5 shrink-0 text-muted" aria-hidden>
            <path d="M18 9s-4.42 6-6 6-6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {open && (
        <div
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
          className={`popover animate-hint fixed z-[60] w-max min-w-32 overflow-y-auto p-1 outline-none ${
            place?.upward ? "origin-bottom-left" : "origin-top-left"
          }`}
          style={{
            top: place?.top ?? 0,
            left: place?.left ?? 0,
            minWidth: place?.minWidth,
            maxHeight: MAX_HEIGHT,
            visibility: place ? "visible" : "hidden",
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                id={`${id}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActive(index)}
                onClick={() => pick(index)}
                className={`relative flex min-h-9 cursor-default items-center rounded-xl py-1.5 pr-8 pl-2 text-sm text-ink transition-colors select-none active:bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] ${
                  index === active ? "bg-[color-mix(in_oklab,var(--color-ink)_4%,transparent)]" : ""
                }`}
              >
                {option.label}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`absolute top-1/2 right-2 size-4 -translate-y-1/2 transition-[opacity,scale] duration-150 ${
                    isSelected ? "scale-100 opacity-100" : "scale-60 opacity-0"
                  }`}
                  aria-hidden
                >
                  <path d="M5 14l3.5 3.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
