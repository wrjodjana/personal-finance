import { and, eq, gte, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { InvestmentTransaction, Security } from "plaid";
import { getDb } from "./db";
import { today } from "./months";
import { plaid, toPlaidFailure } from "./plaid";
import { holdings, investmentTransactions, items } from "./schema";

type Item = typeof items.$inferSelect;

const HISTORY_DAYS = 730;
const PAGE_SIZE = 500;

const cents = (value: number) => Math.round(value * 100);

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function fetchActivity(item: Item, start: string) {
  const activity: InvestmentTransaction[] = [];
  const securities: Security[] = [];
  let total = Infinity;
  while (activity.length < total) {
    const { data } = await plaid().investmentsTransactionsGet({
      access_token: item.accessToken,
      start_date: start,
      end_date: today(),
      options: { count: PAGE_SIZE, offset: activity.length },
    });
    activity.push(...data.investment_transactions);
    securities.push(...data.securities);
    total = data.total_investment_transactions;
    if (data.investment_transactions.length === 0) break;
  }
  return { activity, securities };
}

export async function syncInvestments(item: Item, accountIds: string[]): Promise<void> {
  if (accountIds.length === 0) return;
  const db = getDb();
  try {
    const { data } = await plaid().investmentsHoldingsGet({ access_token: item.accessToken });
    const start = daysAgo(HISTORY_DAYS);
    const { activity, securities } = await fetchActivity(item, start);
    const byId = new Map([...data.securities, ...securities].map((security) => [security.security_id, security]));

    const statements: BatchItem<"sqlite">[] = [
      db.delete(holdings).where(inArray(holdings.accountId, accountIds)),
      db
        .delete(investmentTransactions)
        .where(and(inArray(investmentTransactions.accountId, accountIds), gte(investmentTransactions.date, start))),
    ];
    for (const holding of data.holdings) {
      const security = byId.get(holding.security_id);
      statements.push(
        db.insert(holdings).values({
          accountId: holding.account_id,
          securityId: holding.security_id,
          ticker: security?.ticker_symbol ?? null,
          name: security?.name ?? null,
          securityType: security?.type ?? null,
          quantity: holding.quantity,
          priceCents: cents(holding.institution_price),
          valueCents: cents(holding.institution_value),
          costBasisCents: holding.cost_basis === null ? null : cents(holding.cost_basis),
        }),
      );
    }
    for (const entry of activity) {
      statements.push(
        db.insert(investmentTransactions).values({
          id: entry.investment_transaction_id,
          accountId: entry.account_id,
          date: entry.date,
          name: entry.name,
          ticker: entry.security_id ? (byId.get(entry.security_id)?.ticker_symbol ?? null) : null,
          type: entry.type,
          subtype: entry.subtype,
          quantity: entry.quantity,
          price: entry.price,
          amountCents: cents(entry.amount),
          feesCents: entry.fees === null ? null : cents(entry.fees),
        }),
      );
    }
    statements.push(db.update(items).set({ investmentsError: null }).where(eq(items.id, item.id)));
    const [first, ...rest] = statements;
    await db.batch([first, ...rest]);
  } catch (error) {
    const failure = toPlaidFailure(error);
    console.error(`[sync] ${item.institutionName} investments failed: ${failure.code} ${failure.message}`);
    await db.update(items).set({ investmentsError: failure.code }).where(eq(items.id, item.id));
  }
}
