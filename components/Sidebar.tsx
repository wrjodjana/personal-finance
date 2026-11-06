"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
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
  accounts: (
    <path
      d="M3 8.5 10 4l7 4.5M4.5 8.5v6m3.667-6v6m3.666-6v6m3.667-6v6M3 16.5h14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

const LINKS = [
  { href: "/", label: "Spending", icon: ICONS.spending },
  { href: "/net-worth", label: "Net worth", icon: ICONS.netWorth },
  { href: "/investments", label: "Investments", icon: ICONS.investments },
  { href: "/transactions", label: "Transactions", icon: ICONS.transactions },
  { href: "/accounts", label: "Accounts", icon: ICONS.accounts },
];

export function Sidebar({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line/60 bg-canvas/90 px-3 py-2 backdrop-blur md:h-screen md:w-52 md:flex-col md:items-stretch md:gap-0 md:border-r md:border-b-0 md:bg-surface/40 md:px-3 md:py-4">
      <nav className="flex gap-0.5 md:flex-col">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              aria-label={link.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? "control font-medium text-ink" : "border border-transparent text-muted hover:bg-line/40 hover:text-ink"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5 shrink-0" aria-hidden>
                {link.icon}
              </svg>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      {footer && <div className="ml-auto md:mt-auto md:ml-0">{footer}</div>}
    </aside>
  );
}
