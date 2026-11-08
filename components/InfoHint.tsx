"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WIDTH = 288;
const GUTTER = 8;
const OPEN_DELAY = 150;
const CLOSE_DELAY = 150;

export function InfoHint({ label, plain = false, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointer = useRef("");

  function show() {
    clearTimeout(timer.current);
    const rect = trigger.current!.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - WIDTH / 2, GUTTER),
      window.innerWidth - WIDTH - GUTTER,
    );
    setPosition({ top: rect.bottom + GUTTER, left });
  }

  function hoverIn(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    if (!position) timer.current = setTimeout(show, OPEN_DELAY);
  }

  function hoverOut(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPosition(null), CLOSE_DELAY);
  }

  function toggle() {
    if (pointer.current === "mouse") {
      show();
      return;
    }
    if (position) setPosition(null);
    else show();
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={position !== null}
        aria-controls={position ? id : undefined}
        onClick={toggle}
        onPointerDown={(event) => {
          pointer.current = event.pointerType;
        }}
        onKeyDown={() => {
          pointer.current = "";
        }}
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        className="-m-1 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-faint transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_4%,transparent)] hover:text-muted aria-expanded:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {position &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="dialog"
            onPointerEnter={hoverIn}
            onPointerLeave={hoverOut}
            aria-label={label}
            className={`popover animate-hint fixed z-50 rounded-xl text-left text-xs font-normal text-ink ${plain ? "px-3 py-2" : "p-3"}`}
            style={{ top: position.top, left: position.left, width: WIDTH }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

export function HintBody({ title, text, children }: { title?: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && <p className="text-sm">{title}</p>}
      <p className="text-muted">{text}</p>
      {children}
    </div>
  );
}

export function HintRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="min-w-0 truncate text-muted">{label}</span>
      <span className={`tabular shrink-0 ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
