"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { BASE_MONEY, formatMoney, type Money as MoneyValue } from "@/lib/currency";

const MoneyContext = createContext<MoneyValue>(BASE_MONEY);

const HIDDEN_KEY = "hide-amounts";
const MASK = "••••";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useAmountsHidden(): [boolean, () => void] {
  const hidden = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(HIDDEN_KEY) === "1",
    () => false,
  );
  const toggle = useCallback(() => {
    localStorage.setItem(HIDDEN_KEY, hidden ? "0" : "1");
    listeners.forEach((listener) => listener());
  }, [hidden]);
  return [hidden, toggle];
}

export function MoneyProvider({ money, children }: { money: MoneyValue; children: React.ReactNode }) {
  return <MoneyContext value={money}>{children}</MoneyContext>;
}

export function useMoney(): MoneyValue {
  return useContext(MoneyContext);
}

export function useFormatMoney(): (cents: number) => string {
  const money = useMoney();
  const [hidden] = useAmountsHidden();
  return (cents) => (hidden ? MASK : formatMoney(cents, money));
}

export function Money({ cents }: { cents: number }) {
  const [hidden] = useAmountsHidden();
  return hidden ? MASK : formatMoney(cents, useMoney());
}

const CHAR_WIDTH_EM = 0.5;

export function FittedMoney({ cents }: { cents: number }) {
  const [hidden] = useAmountsHidden();
  const text = hidden ? MASK : formatMoney(cents, useMoney());
  return (
    <span
      className="block whitespace-nowrap"
      style={{ fontSize: `min(var(--fit-max), calc(100cqw / ${text.length * CHAR_WIDTH_EM}))` }}
    >
      {text}
    </span>
  );
}
