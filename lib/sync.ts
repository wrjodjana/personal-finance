import { eq, inArray } from "drizzle-orm";
import type { AccountBase, RemovedTransaction, Transaction } from "plaid";
import { getDb } from "./db";
import { plaid, RECONNECT_CODES, toPlaidFailure } from "./plaid";
import {
  accounts,
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
        result.accounts = data.accounts;
        result.added.push(...data.added);
        result.modified.push(...data.modified);
        result.removed.push(...data.removed);
        result.historyStatus = data.transactions_update_status;
        cursor = data.next_cursor;
        hasMore = data.has_more;
      }
      result.cursor = cursor ?? "";
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

function toAccountRow(itemId: string, account: AccountBase): typeof accounts.$inferInsert {
  return {
    id: account.account_id,
    itemId,
    name: account.name,
    officialName: account.official_name ?? null,
    mask: account.mask ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
  };
}

export function saveAccounts(itemId: string, list: AccountBase[]) {
  const db = getDb();
  for (const account of list) {
    const row = toAccountRow(itemId, account);
    db.insert(accounts).values(row).onConflictDoUpdate({ target: accounts.id, set: row }).run();
  }
}

function applyChanges(item: Item, page: SyncPage) {
  const db = getDb();
  db.transaction((tx) => {
    for (const account of page.accounts) {
      const row = toAccountRow(item.id, account);
      tx.insert(accounts).values(row).onConflictDoUpdate({ target: accounts.id, set: row }).run();
    }

    for (const plaidTx of [...page.added, ...page.modified]) {
      const row = toRow(plaidTx);
      tx.insert(transactions).values(row).onConflictDoUpdate({ target: transactions.id, set: row }).run();

      if (row.pendingTransactionId) {
        const pendingOverride = tx
          .select()
          .from(categoryOverrides)
          .where(eq(categoryOverrides.transactionId, row.pendingTransactionId))
          .get();
        if (pendingOverride) {
          tx.insert(categoryOverrides)
            .values({ transactionId: row.id!, category: pendingOverride.category })
            .onConflictDoNothing()
            .run();
        }
        const pendingRemoved = tx
          .select()
          .from(removedTransactions)
          .where(eq(removedTransactions.transactionId, row.pendingTransactionId))
          .get();
        if (pendingRemoved) {
          tx.insert(removedTransactions).values({ transactionId: row.id! }).onConflictDoNothing().run();
        }
        const pendingDeleted = tx
          .select()
          .from(deletedTransactions)
          .where(eq(deletedTransactions.transactionId, row.pendingTransactionId))
          .get();
        if (pendingDeleted) {
          tx.insert(deletedTransactions).values({ transactionId: row.id! }).onConflictDoNothing().run();
        }
        const pendingEdit = tx
          .select()
          .from(transactionEdits)
          .where(eq(transactionEdits.transactionId, row.pendingTransactionId))
          .get();
        if (pendingEdit) {
          tx.insert(transactionEdits)
            .values({ ...pendingEdit, transactionId: row.id! })
            .onConflictDoNothing()
            .run();
        }
      }
    }

    const removedIds = page.removed.map((removed) => removed.transaction_id);
    if (removedIds.length > 0) {
      tx.delete(transactions).where(inArray(transactions.id, removedIds)).run();
    }

    tx.update(items)
      .set({
        cursor: page.cursor,
        historyStatus: page.historyStatus,
        status: "ok",
        errorCode: null,
        lastSyncedAt: new Date().toISOString(),
      })
      .where(eq(items.id, item.id))
      .run();
  });
}

export async function syncItem(item: Item): Promise<SyncResult> {
  const base = { itemId: item.id, institutionName: item.institutionName };
  try {
    const page = await fetchChanges(item);
    applyChanges(item, page);
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
    getDb()
      .update(items)
      .set({
        status: RECONNECT_CODES.has(failure.code) ? "needs_reconnect" : "error",
        errorCode: failure.code,
      })
      .where(eq(items.id, item.id))
      .run();
    return { ...base, ok: false, added: 0, modified: 0, removed: 0, errorCode: failure.code };
  }
}

export function syncAll(): Promise<SyncResult[]> {
  const run = async () => Promise.all(getDb().select().from(items).all().map(syncItem));
  globalForSync.financeSync ??= run().finally(() => {
    globalForSync.financeSync = undefined;
  });
  return globalForSync.financeSync;
}

export async function syncItemById(itemId: string): Promise<SyncResult | undefined> {
  await globalForSync.financeSync;
  const item = getDb().select().from(items).where(eq(items.id, itemId)).get();
  return item ? syncItem(item) : undefined;
}
