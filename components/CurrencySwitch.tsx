"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { useMoney } from "@/components/MoneyProvider";
import { Select } from "@/components/Select";
import { CURRENCIES } from "@/lib/currency";

const OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} · ${currency.name}`,
  short: currency.code,
}));

const TRIGGERS = {
  sidebar:
    "flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-sm text-muted transition hover:bg-line/40 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:cursor-default disabled:opacity-60",
  header:
    "control flex h-8 cursor-pointer items-center gap-1 rounded-lg pr-1.5 pl-3 text-xs font-medium whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:cursor-default disabled:opacity-50",
};

export function CurrencySwitch({ variant }: { variant: keyof typeof TRIGGERS }) {
  const router = useRouter();
  const money = useMoney();
  const [code, setCode] = useOptimistic(money.code);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: string) {
    setError(null);
    startTransition(async () => {
      setCode(next);
      const response = await fetch("/api/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: next }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not change the currency");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={`relative ${variant === "sidebar" ? "space-y-1" : ""}`}>
      <Select
        label="Currency"
        value={code}
        options={OPTIONS}
        onChange={change}
        disabled={pending}
        className={TRIGGERS[variant]}
        chevron={variant === "header"}
        icon={
          variant === "sidebar" && (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5 shrink-0" aria-hidden>
              <path
                d="M10 16.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm2.25-8.75c-.3-.75-1.15-1.25-2.25-1.25-1.25 0-2.25.7-2.25 1.6 0 2.15 4.5 1.15 4.5 3.3 0 .9-1 1.6-2.25 1.6-1.1 0-1.95-.5-2.25-1.25M10 5.25v1.25m0 7v1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )
        }
      />
      {error && (
        <p
          role="alert"
          className={`text-xs text-negative ${
            variant === "header" ? "popover absolute top-full right-0 z-30 mt-2 w-max max-w-64 px-3 py-2" : "px-3"
          }`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
