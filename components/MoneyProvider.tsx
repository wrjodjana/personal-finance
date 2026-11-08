"use client";

import { createContext, useContext } from "react";
import { BASE_MONEY, formatMoney, type Money as MoneyValue } from "@/lib/currency";

const MoneyContext = createContext<MoneyValue>(BASE_MONEY);

export function MoneyProvider({ money, children }: { money: MoneyValue; children: React.ReactNode }) {
  return <MoneyContext value={money}>{children}</MoneyContext>;
}

export function useMoney(): MoneyValue {
  return useContext(MoneyContext);
}

export function useFormatMoney(): (cents: number) => string {
  const money = useMoney();
  return (cents) => formatMoney(cents, money);
}

export function Money({ cents }: { cents: number }) {
  return formatMoney(cents, useMoney());
}

const CHAR_WIDTH_EM = 0.5;

export function FittedMoney({ cents }: { cents: number }) {
  const text = formatMoney(cents, useMoney());
  return (
    <span
      className="block whitespace-nowrap"
      style={{ fontSize: `min(var(--fit-max), calc(100cqw / ${text.length * CHAR_WIDTH_EM}))` }}
    >
      {text}
    </span>
  );
}
