"use client";

import { useAmountsHidden } from "@/components/MoneyProvider";

export function HideAmountsButton() {
  const [hidden, toggle] = useAmountsHidden();
  const label = hidden ? "Show amounts" : "Hide amounts";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={hidden}
      className="flex w-full items-center justify-start gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm text-muted transition hover:bg-line/40 hover:text-ink md:py-1.5"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5 shrink-0" aria-hidden>
        <path
          d="M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="10" r="2.25" />
        {hidden && <path d="M3.5 16.5l13-13" strokeLinecap="round" />}
      </svg>
      <span>{label}</span>
    </button>
  );
}
