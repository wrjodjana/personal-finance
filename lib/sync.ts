import { eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { AccountBase, RemovedTransaction, Transaction } from "plaid";
import { refreshBranding } from "./branding";
import { getDb, type Db } from "./db";
import { syncInvestments } from "./investments";
import { today } from "./months";
import { plaid, RECONNECT_CODES, toPlaidFailure } from "./plaid";
import { syncRecurring } from "./recurringData";
import {
  accounts,
  balanceSnapshots,
  categoryOverrides,
  deletedTransactions,
  items,
  removedTransactions,
  transactionEdits,
  transactions,
} from "./schema";

export type SyncResult = {
  itemId: string;
  institutionName: string;
  ok: boolean;
  added: number;
  modified: number;
  removed: number;
  errorCode?: string;
};

type Item = typeof items.$inferSelect;

type SyncPage = {
  accounts: AccountBase[];
  added: Transaction[];
  modified: Transaction[];
  removed: RemovedTransaction[];
  cursor: string;
  historyStatus: string;
};

const MAX_BOUND_PARAMETERS = 100;

const globalForSync = globalThis as unknown as { financeSync?: Promise<SyncResult[]> };

async function fetchChanges(item: Item): Promise<SyncPage> {
  const startCursor = item.cursor ?? undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result: SyncPage = {
      accounts: [],
      added: [],
      modified: [],
      removed: [],
      cursor: startCursor ?? "",
      historyStatus: "",
    };
    let cursor = startCursor;
    try {
      let hasMore = true;
      while (hasMore) {
        const { data } = await plaid().transactionsSync({
          access_token: item.accessToken,
          cursor,
          count: 500,
        });
        result.added.push(...data.added);
        result.modified.push(...data.modified);
        result.removed.push(...data.removed);
        result.historyStatus = data.transactions_update_status;
        cursor = data.next_cursor;
        hasMore = data.has_more;
      }
      result.cursor = cursor ?? "";
      const { data } = await plaid().accountsGet({ access_token: item.accessToken });
      result.accounts = data.accounts;
      return result;
    } catch (error) {
      if (toPlaidFailure(error).code !== "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") throw error;
    }
  }
  throw new Error("Plaid data kept changing during sync. Try again in a minute.");
}

function toRow(tx: Transaction): typeof transactions.$inferInsert {
  return {
    id: tx.transaction_id,
    accountId: tx.account_id,
    date: tx.date,
    amountCents: Math.round(tx.amount * 100),
    currency: tx.iso_currency_code ?? tx.unofficial_currency_code ?? null,
    name: tx.name,
    merchantName: tx.merchant_name ?? null,
    logoUrl: tx.logo_url ?? tx.counterparties?.find((party) => party.logo_url)?.logo_url ?? null,
    plaidCategory: tx.personal_finance_category?.primary ?? null,
    plaidCategoryDetailed: tx.personal_finance_category?.detailed ?? null,
    pending: tx.pending,
    pendingTransactionId: tx.pending_transaction_id ?? null,
  };
}

const toCents = (value: number | null | undefined) => (value === null || value === undefined ? null : Math.round(value * 100));

function toAccountRow(itemId: string, account: AccountBase): typeof accounts.$inferInsert {
  return {
    id: account.account_id,
    itemId,
    name: account.name,
    officialName: account.official_name ?? null,
    mask: account.mask ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
    currentCents: toCents(account.balances.current),
    availableCents: toCents(account.balances.available),
    limitCents: toCents(account.balances.limit),
  };
}

function upsertAccount(db: Db, itemId: string, account: AccountBase): BatchItem<"sqlite">[] {
  const row = toAccountRow(itemId, account);
  const statements: BatchItem<"sqlite">[] = [
    db.insert(accounts).values(row).onConflictDoUpdate({ target: accounts.id, set: row }),
  ];
  if (row.currentCents !== null && row.currentCents !== undefined) {
    const snapshot = { accountId: row.id, date: today(), cents: row.currentCents };
    statements.push(
      db
        .insert(balanceSnapshots)
        .values(snapshot)
        .onConflictDoUpdate({ target: [balanceSnapshots.accountId, balanceSnapshots.date], set: { cents: snapshot.cents } }),
    );
  }
  return statements;
}

export async function saveAccounts(itemId: string, list: AccountBase[]) {
  const db = getDb();
  const [first, ...rest] = list.flatMap((account) => upsertAccount(db, itemId, account));
  if (first) await db.batch([first, ...rest]);
}

function carryOverFromPending(db: Db, id: string, pendingId: string) {
  const newId = sql<string>`${id}`.as("transaction_id");
  return [
    db
      .insert(categoryOverrides)
      .select(
        db
          .select({ transactionId: newId, category: categoryOverrides.category })
          .from(categoryOverrides)
          .where(eq(categoryOverrides.transactionId, pendingId)),
      )
      .onConflictDoNothing(),
    db
      .insert(removedTransactions)
      .select(
        db
          .select({
            transactionId: newId,
            excluded: removedTransactions.excluded,
            removedAt: removedTransactions.removedAt,
          })
          .from(removedTransactions)
          .where(eq(removedTransactions.transactionId, pendingId)),
      )
      .onConflictDoNothing(),
    db
      .insert(deletedTransactions)
      .select(
        db
          .select({ transactionId: newId, deletedAt: deletedTransactions.deletedAt })
          .from(deletedTransactions)
          .where(eq(deletedTransactions.transactionId, pendingId)),
      )
      .onConflictDoNothing(),
    db
      .insert(transactionEdits)
      .select(
        db
          .select({
            transactionId: newId,
            name: transactionEdits.name,
            date: transactionEdits.date,
            amountCents: transactionEdits.amountCents,
          })
          .from(transactionEdits)
          .where(eq(transactionEdits.transactionId, pendingId)),
      )
      .onConflictDoNothing(),
  ];
}

async function applyChanges(item: Item, page: SyncPage) {
  const db = getDb();
  const statements: BatchItem<"sqlite">[] = page.accounts.flatMap((account) => upsertAccount(db, item.id, account));

  for (const plaidTx of [...page.added, ...page.modified]) {
    const row = toRow(plaidTx);
    statements.push(db.insert(transactions).values(row).onConflictDoUpdate({ target: transactions.id, set: row }));
    if (row.pendingTransactionId) statements.push(...carryOverFromPending(db, row.id!, row.pendingTransactionId));
  }

  const removedIds = page.removed.map((removed) => removed.transaction_id);
  for (let start = 0; start < removedIds.length; start += MAX_BOUND_PARAMETERS) {
    const chunk = removedIds.slice(start, start + MAX_BOUND_PARAMETERS);
    statements.push(db.delete(transactions).where(inArray(transactions.id, chunk)));
  }

  const saveCursor = db
    .update(items)
    .set({
      cursor: page.cursor,
      historyStatus: page.historyStatus,
      status: "ok",
      errorCode: null,
      lastSyncedAt: new Date().toISOString(),
    })
    .where(eq(items.id, item.id));
  await db.batch([saveCursor, ...statements]);
}

export async function syncItem(item: Item): Promise<SyncResult> {
  const base = { itemId: item.id, institutionName: item.institutionName };
  if (!item.brandingFetchedAt) {
    await refreshBranding(item).catch((error) => {
      const failure = toPlaidFailure(error);
      console.error(`[sync] ${item.institutionName} branding failed: ${failure.code} ${failure.message}`);
    });
  }
  try {
    const page = await fetchChanges(item);
    await applyChanges(item, page);
    await syncRecurring(
      item,
      page.accounts.map((account) => account.account_id),
    );
    await syncInvestments(
      item,
      page.accounts.filter((account) => account.type === "investment").map((account) => account.account_id),
    );
    return {
      ...base,
      ok: true,
      added: page.added.length,
      modified: page.modified.length,
      removed: page.removed.length,
    };
  } catch (error) {
    const failure = toPlaidFailure(error);
    console.error(
      `[sync] ${item.institutionName} failed: ${failure.code} ${failure.message}` +
        (failure.requestId ? ` (request_id ${failure.requestId})` : ""),
    );
    await getDb()
      .update(items)
      .set({
        status: RECONNECT_CODES.has(failure.code) ? "needs_reconnect" : "error",
        errorCode: failure.code,
      })
      .where(eq(items.id, item.id));
    return { ...base, ok: false, added: 0, modified: 0, removed: 0, errorCode: failure.code };
  }
}

export function syncAll(): Promise<SyncResult[]> {
  const run = async () => Promise.all((await getDb().select().from(items)).map(syncItem));
  globalForSync.financeSync ??= run().finally(() => {
    globalForSync.financeSync = undefined;
  });
  return globalForSync.financeSync;
}

export async function syncItemById(itemId: string): Promise<SyncResult | undefined> {
  await globalForSync.financeSync;
  const item = await getDb().select().from(items).where(eq(items.id, itemId)).get();
  return item ? syncItem(item) : undefined;
}
