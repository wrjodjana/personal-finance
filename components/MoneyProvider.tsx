"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { HIDDEN_KEY } from "@/lib/hidden";
import { BASE_MONEY, formatMoney, type Money as MoneyValue } from "@/lib/currency";

const MoneyContext = createContext<MoneyValue>(BASE_MONEY);
const HiddenContext = createContext(false);

const MASK = "••••";
const listeners = new Set<() => void>();

function readHidden(): boolean {
  const match = document.cookie.match(new RegExp(`(?:^|; )${HIDDEN_KEY}=([^;]*)`));
  if (match) return match[1] === "1";
  return localStorage.getItem(HIDDEN_KEY) === "1";
}

function writeHidden(hidden: boolean) {
  const value = hidden ? "1" : "0";
  document.cookie = `${HIDDEN_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
  localStorage.setItem(HIDDEN_KEY, value);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useAmountsHidden(): [boolean, () => void] {
  const initial = useContext(HiddenContext);
  const hidden = useSyncExternalStore(subscribe, readHidden, () => initial);
  const toggle = useCallback(() => {
    writeHidden(!hidden);
    listeners.forEach((listener) => listener());
  }, [hidden]);
  return [hidden, toggle];
}

export function MoneyProvider({
  money,
  initialHidden = false,
  children,
}: {
  money: MoneyValue;
  initialHidden?: boolean;
  children: React.ReactNode;
}) {
  return (
    <MoneyContext value={money}>
      <HiddenContext value={initialHidden}>{children}</HiddenContext>
    </MoneyContext>
  );
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
