"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Spending" },
  { href: "/transactions", label: "Transactions" },
  { href: "/accounts", label: "Accounts" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
