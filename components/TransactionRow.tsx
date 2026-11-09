import { CategoryCell } from "@/components/CategoryCell";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { MerchantAvatar } from "@/components/MerchantAvatar";
import { Money } from "@/components/MoneyProvider";
import { PendingIcon } from "@/components/PendingIcon";
import { RowMenu } from "@/components/RowMenu";
import { formatMoney, type Money as MoneyValue } from "@/lib/currency";
import { accountLabel, type LedgerEntry } from "@/lib/ledger";
import { formatDate, formatDay } from "@/lib/months";

export type Option = { value: string; label: string };

function EditedIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-3.5" aria-label="Edited">
      <path d="m10.5 3 2.5 2.5-7 7H3.5V10l7-7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function TransactionRow({
  entry,
  options,
  money,
  showDate = false,
}: {
  entry: LedgerEntry;
  options: Option[];
  money: MoneyValue;
  showDate?: boolean;
}) {
  const moneyIn = entry.amountCents < 0;
  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors last:rounded-b-[calc(0.875rem-1px)] hover:bg-surface/50 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,14rem)_7rem_1.75rem] ${
        entry.removed ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <MerchantAvatar name={entry.merchant} logoUrl={entry.logoUrl} size={24} shape="square" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm" title={entry.description}>
              {entry.merchant}
            </p>
            {entry.edited && (
              <span
                className="shrink-0 text-faint"
                title={`Edited. Bank: ${entry.bank.name}, ${formatDate(entry.bank.date)}, ${entry.bank.amountCents < 0 ? "+" : ""}${formatMoney(Math.abs(entry.bank.amountCents), money)}`}
              >
                <EditedIcon />
              </span>
            )}
          </div>
          {(showDate || entry.refundMatch) && (
            <p className="truncate text-xs text-faint">
              {[
                showDate ? formatDay(entry.date) : "",
                entry.refundMatch
                  ? entry.refundMatch.role === "purchase"
                    ? `Refunded ${formatDate(entry.refundMatch.otherDate)}`
                    : `Refund of ${formatDate(entry.refundMatch.otherDate)} purchase`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="col-start-1 row-start-2 min-w-0 sm:col-start-auto sm:row-start-auto">
        <CategoryCell
          transactionId={entry.id}
          merchant={entry.merchant}
          category={entry.category}
          source={entry.categorySource}
          options={options}
        />
      </div>
      <div
        className="col-span-2 col-start-2 row-start-2 flex w-0 min-w-full items-center justify-end gap-2 sm:col-span-1 sm:w-auto sm:min-w-0 sm:col-start-auto sm:row-start-auto sm:justify-start"
        title={accountLabel(entry.account.institution, entry.account.name, entry.account.mask)}
      >
        <InstitutionLogo name={entry.account.institution} logoUrl={entry.account.logoUrl} color={entry.account.color} size={16} />
        <span className="truncate text-xs text-muted">{entry.account.name}</span>
        {entry.account.mask && <span className="tabular shrink-0 text-xs text-faint">{entry.account.mask}</span>}
      </div>
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 sm:col-start-auto sm:row-start-auto">
        {entry.pending && (
          <span className="text-faint" title="Pending">
            <PendingIcon />
          </span>
        )}
        <span
          className={`tabular whitespace-nowrap text-sm ${
            entry.removed ? "text-faint line-through" : moneyIn ? "text-positive" : ""
          }`}
        >
          {moneyIn ? "+" : ""}
          <Money cents={Math.abs(entry.amountCents)} />
        </span>
      </div>
      <div className="col-start-3 row-start-1 flex justify-end sm:col-start-auto sm:row-start-auto">
        <RowMenu
          transactionId={entry.id}
          merchant={entry.merchant}
          date={entry.date}
          amountCents={entry.amountCents}
          category={entry.category}
          removed={entry.removed}
          edited={entry.edited}
          categoryEdited={entry.categorySource === "override"}
          options={options}
        />
      </div>
    </li>
  );
}
