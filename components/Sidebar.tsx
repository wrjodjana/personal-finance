"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS = {
  home: (
    <path d="M3.5 9 10 3.5 16.5 9M5 7.75V16.5h3.5v-4.5h3v4.5H15V7.75" strokeLinecap="round" strokeLinejoin="round" />
  ),
  spending: (
    <path d="M4 16.5V11m5 5.5V6.5m5 10v-4m5 4V4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  netWorth: (
    <path d="M3.5 15.5 8 10l3 3 5.5-6.5M13 6.5h3.5V10" strokeLinecap="round" strokeLinejoin="round" />
  ),
  investments: (
    <path d="M4 16.5h12M6 13.5v-3m4 3v-6m4 6V5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  transactions: (
    <path d="M4 6.5h12m-12 4h12m-12 4h8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  recurring: (
    <path
      d="M4 9.5a6 6 0 0 1 10.4-3.6M14.75 3v3.25H11.5M16 10.5a6 6 0 0 1-10.4 3.6M5.25 17v-3.25H8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  accounts: (
    <path
      d="M3 8.5 10 4l7 4.5M4.5 8.5v6m3.667-6v6m3.666-6v6m3.667-6v6M3 16.5h14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

const LINKS = [
  { href: "/", label: "Home", icon: ICONS.home },
  { href: "/net-worth", label: "Net Worth", icon: ICONS.netWorth },
  { href: "/investments", label: "Investments", icon: ICONS.investments },
  { href: "/spending", label: "Spending", icon: ICONS.spending },
  { href: "/transactions", label: "Transactions", icon: ICONS.transactions },
  { href: "/recurring", label: "Recurring", icon: ICONS.recurring },
  { href: "/accounts", label: "Accounts", icon: ICONS.accounts },
];

function linkIndex(path: string) {
  return LINKS.findIndex((link) => (link.href === "/" ? path === "/" : path.startsWith(link.href)));
}

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const shownPath = pending && pending.from === pathname ? pending.to : pathname;
  const activeIndex = linkIndex(shownPath);
  const currentIndex = linkIndex(pathname);

  return (
    <aside
      style={{ viewTransitionName: "tab-bar" }}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line/60 bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:bottom-auto md:z-10 md:h-screen md:w-52 md:shrink-0 md:flex-col md:border-t-0 md:border-r md:bg-surface/40 md:px-3 md:py-4"
    >
      <nav
        className="relative flex flex-[var(--tabs)] md:flex-none md:flex-col md:gap-0.5"
        style={{ "--tabs": LINKS.length } as React.CSSProperties}
      >
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="tab-glide pointer-events-none absolute inset-y-0 left-0 flex w-[calc(100%/var(--tabs))] items-center justify-center md:hidden"
            style={{ translate: `${activeIndex * 100}% 0` }}
          >
            <span className="h-9 w-[min(3.5rem,calc(100%-4px))] rounded-full bg-line/70" />
          </span>
        )}
        {LINKS.map((link, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              aria-label={link.label}
              transitionTypes={
                currentIndex < 0 || index === currentIndex ? undefined : [index > currentIndex ? "tab-forward" : "tab-back"]
              }
              onNavigate={() => setPending({ from: pathname, to: link.href })}
              className={`group relative flex flex-1 justify-center py-3.5 transition-colors md:flex-none md:items-center md:justify-start md:gap-2 md:rounded-lg md:border md:px-3 md:py-1.5 md:text-sm ${
                active
                  ? "font-medium text-ink md:control"
                  : "text-muted hover:text-ink md:border-transparent md:hover:bg-line/40"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="tab-press size-5 shrink-0"
                aria-hidden
              >
                {link.icon}
              </svg>
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      {footer && <div className="flex-1 md:mt-auto md:flex-none">{footer}</div>}
    </aside>
  );
}
