"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function clientSnapshot(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function TodayLabel() {
  const date = useSyncExternalStore(subscribe, clientSnapshot, () => " ");
  return <p className="label">{date.toUpperCase()}</p>;
}
