import { InstitutionLogo } from "@/components/InstitutionLogo";
import { formatCents } from "@/lib/months";
import type { Holding } from "@/lib/netWorth";

export function Icon({ children, className = "size-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={`shrink-0 ${className}`} aria-hidden>
      {children}
    </svg>
  );
}

export function AccountName({ holding }: { holding: Holding }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{holding.name}</span>
      {holding.mask && <span className="tabular shrink-0 text-faint">{holding.mask}</span>}
    </span>
  );
}

export function AccountLogo({ holding, size }: { holding: Holding; size: number }) {
  return <InstitutionLogo name={holding.institutionName} logoUrl={holding.logoUrl} color={holding.color} size={size} />;
}

function Line({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className="tabular">{formatCents(cents)}</span>
    </div>
  );
}

export function AccountItem({
  holding,
  className,
  children,
}: {
  holding: Holding;
  className: string;
  children: React.ReactNode;
}) {
  const credit = holding.type === "credit" || holding.type === "loan";
  const limited = holding.limitCents !== null && holding.limitCents > 0;
  return (
    <li tabIndex={0} className={`group/account row-wash relative outline-none ${className}`}>
      {children}
      <div
        role="tooltip"
        className="popover pointer-events-none invisible absolute bottom-full left-0 z-30 mb-1 w-72 max-w-[calc(100vw-2rem)] origin-bottom-left scale-[0.96] p-4 opacity-0 transition-[opacity,scale,visibility] duration-100 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/account:visible group-hover/account:scale-100 group-hover/account:opacity-100 group-hover/account:delay-300 group-hover/account:duration-150 group-focus-visible/account:visible group-focus-visible/account:scale-100 group-focus-visible/account:opacity-100 group-focus-visible/account:duration-150"
      >
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <span className="shrink-0 rounded-md shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
            <AccountLogo holding={holding} size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <p className="truncate text-sm">{holding.name}</p>
              {holding.mask && <span className="tabular shrink-0 text-xs text-faint">{holding.mask}</span>}
            </div>
            <p className="label truncate">{holding.institutionName}</p>
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Line label={credit ? "Balance Owed" : "Current Balance"} cents={holding.cents} />
          {holding.availableCents !== null && (!credit || limited) && (
            <Line label={credit ? "Available Credit" : "Available"} cents={holding.availableCents} />
          )}
          {limited && <Line label="Credit Limit" cents={holding.limitCents!} />}
          {credit && !limited && <p className="label">No preset spending limit</p>}
        </div>
      </div>
    </li>
  );
}
