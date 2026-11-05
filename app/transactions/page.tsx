import { eq, inArray } from "drizzle-orm";
import { CategoryCell } from "@/components/CategoryCell";
import { MonthPicker } from "@/components/MonthPicker";
import { Rules } from "@/components/Rules";
import { SetupNotice } from "@/components/SetupNotice";
import { TransactionFilters } from "@/components/TransactionFilters";
import { CATEGORIES, CATEGORY_KEYS, categoryMeta, normalizeCategory } from "@/lib/categories";
import { getDb } from "@/lib/db";
import { accountLabel, availableMonths, listRules, loadLedger, SPENDING_ACCOUNT_TYPES } from "@/lib/ledger";
import { formatCents, formatDate, monthLabel, parseMonth } from "@/lib/months";
import { plaidConfigured } from "@/lib/plaid";
import { accounts, items } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!plaidConfigured()) return <SetupNotice />;

  const params = await searchParams;
  const month = parseMonth(params.month);
  const category = typeof params.category === "string" ? params.category : "";
  const account = typeof params.account === "string" ? params.account : "";

  const entries = loadLedger(month, month).filter(
    (entry) => (!category || entry.category === category) && (!account || entry.accountId === account),
  );
  const spendingCents = entries.filter((entry) => entry.isSpending).reduce((sum, entry) => sum + entry.amountCents, 0);

  const accountOptions = getDb()
    .select({ id: accounts.id, name: accounts.name, mask: accounts.mask, institution: items.institutionName })
    .from(accounts)
    .innerJoin(items, eq(accounts.itemId, items.id))
    .where(inArray(accounts.type, SPENDING_ACCOUNT_TYPES))
    .all()
    .map((row) => ({ value: row.id, label: accountLabel(row.institution, row.name, row.mask) }));

  const categoryOptions = CATEGORY_KEYS.map((key) => ({ value: key, label: CATEGORIES[key].label }));
  const monthOptions = availableMonths().map((value) => ({ value, label: monthLabel(value) }));
  const rules = listRules().map((rule) => ({
    id: rule.id,
    pattern: rule.pattern,
    categoryLabel: categoryMeta(normalizeCategory(rule.category)).label,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TransactionFilters categories={categoryOptions} accounts={accountOptions} category={category} account={account} />
        <MonthPicker month={month} months={monthOptions} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-baseline justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="font-semibold">
            {category ? categoryMeta(category).label : "All transactions"}
            <span className="ml-2 text-sm font-normal text-stone-400">{entries.length}</span>
          </h2>
          <p className="text-sm text-stone-500">
            Spending <span className="tabular font-medium text-stone-900">{formatCents(spendingCents)}</span>
          </p>
        </div>
        {entries.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No transactions match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                  <th className="px-6 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Merchant</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-6 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map((entry) => {
                  const meta = categoryMeta(entry.category);
                  const refund = entry.amountCents < 0;
                  return (
                    <tr key={entry.id} className={entry.isSpending ? "" : "bg-stone-50/60 text-stone-400"}>
                      <td className="tabular whitespace-nowrap px-6 py-3 align-top text-stone-500">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                          <span className={`font-medium ${entry.isSpending ? "text-stone-900" : ""}`}>{entry.merchant}</span>
                          {entry.refundMatch && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                              {entry.refundMatch.role === "purchase"
                                ? `Refunded ${formatDate(entry.refundMatch.otherDate)}`
                                : `Refund of ${formatDate(entry.refundMatch.otherDate)} purchase`}
                            </span>
                          )}
                          {entry.pending && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 pl-4 text-xs text-stone-400">{entry.accountLabel}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <CategoryCell
                          transactionId={entry.id}
                          merchant={entry.merchant}
                          category={entry.category}
                          source={entry.categorySource}
                          options={categoryOptions}
                        />
                      </td>
                      <td
                        className={`tabular whitespace-nowrap px-6 py-3 text-right align-top font-medium ${
                          !entry.isSpending ? "" : refund ? "text-emerald-600" : "text-stone-900"
                        }`}
                      >
                        {refund ? "+" : ""}
                        {formatCents(Math.abs(entry.amountCents))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Rules rules={rules} options={categoryOptions} />
    </div>
  );
}
