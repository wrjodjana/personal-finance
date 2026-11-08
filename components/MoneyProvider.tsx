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
