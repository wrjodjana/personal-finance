import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { TransactionStream } from "plaid";
import { institutionLogoUrl } from "./branding";
import { automaticCategory, normalizeCategory } from "./categories";
import { getDb } from "./db";
import { accountLabel, loadActiveEntries, type LedgerEntry } from "./ledger";
import { today } from "./months";
import { plaid, toPlaidFailure } from "./plaid";
import { buildStream, type RecurringStream } from "./recurring";
import { accounts, items, recurringEdits, recurringStreams } from "./schema";

type Item = typeof items.$inferSelect;

const cents = (value: number | undefined) => Math.round((value ?? 0) * 100);

function toRow(itemId: string, direction: "inflow" | "outflow", stream: TransactionStream): typeof recurringStreams.$inferInsert {
  return {
    id: stream.stream_id,
    itemId,
    accountId: stream.account_id,
    direction,
    description: stream.description,
    merchantName: stream.merchant_name || null,
    frequency: stream.frequency,
    averageCents: cents(stream.average_amount.amount),
    lastCents: cents(stream.last_amount.amount),
    firstDate: stream.first_date,
    lastDate: stream.last_date,
    predictedNextDate: stream.predicted_next_date ?? null,
    status: stream.status,
    isActive: stream.is_active,
    plaidCategory: stream.personal_finance_category?.primary ?? null,
    plaidCategoryDetailed: stream.personal_finance_category?.detailed ?? null,
    transactionIds: stream.transaction_ids,
  };
}

export async function syncRecurring(item: Item, accountIds: string[]): Promise<void> {
  const db = getDb();
  try {
    const { data } = await plaid().transactionsRecurringGet({ access_token: item.accessToken });
    const known = new Set(accountIds);
    const rows = [
      ...data.inflow_streams.map((stream) => toRow(item.id, "inflow", stream)),
      ...data.outflow_streams.map((stream) => toRow(item.id, "outflow", stream)),
    ].filter((row) => known.has(row.accountId));
    const statements: BatchItem<"sqlite">[] = [
      db.delete(recurringStreams).where(eq(recurringStreams.itemId, item.id)),
      ...rows.map((row) => db.insert(recurringStreams).values(row)),
      db.update(items).set({ recurringError: null }).where(eq(items.id, item.id)),
    ];
    const [first, ...rest] = statements;
    await db.batch([first, ...rest]);
  } catch (error) {
    const failure = toPlaidFailure(error);
    console.error(`[sync] ${item.institutionName} recurring failed: ${failure.code} ${failure.message}`);
    await db.update(items).set({ recurringError: failure.code }).where(eq(items.id, item.id));
  }
}

export type StreamAccount = { label: string; logoUrl: string | null; color: string | null };

export async function loadRecurring({ withoutEdits = false } = {}): Promise<{
  streams: RecurringStream[];
  accounts: Map<string, StreamAccount>;
  entries: Map<string, LedgerEntry>;
}> {
  const [rows, entries] = await Promise.all([
    getDb()
      .select({
        stream: recurringStreams,
        edit: recurringEdits,
        accountName: accounts.name,
        accountMask: accounts.mask,
        item: items,
      })
      .from(recurringStreams)
      .innerJoin(accounts, eq(recurringStreams.accountId, accounts.id))
      .innerJoin(items, eq(recurringStreams.itemId, items.id))
      .leftJoin(recurringEdits, eq(recurringEdits.streamId, recurringStreams.id))
      .all(),
    loadActiveEntries(),
  ]);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const now = today();
  const accountMap = new Map<string, StreamAccount>();

  const streams = rows.map(({ stream, edit, accountName, accountMask, item }) => {
    accountMap.set(stream.accountId, {
      label: accountLabel(item.institutionName, accountName, accountMask),
      logoUrl: institutionLogoUrl(item),
      color: item.primaryColor,
    });
    const charges = stream.transactionIds.flatMap((id) => {
      const entry = byId.get(id);
      return entry ? [entry] : [];
    });
    const latest = [...charges].sort((a, b) => b.date.localeCompare(a.date))[0];
    return buildStream(
      {
        id: stream.id,
        accountId: stream.accountId,
        direction: stream.direction,
        name: latest?.merchant ?? (stream.merchantName || stream.description),
        logoUrl: charges.find((entry) => entry.logoUrl)?.logoUrl ?? null,
        category:
          latest?.category ??
          normalizeCategory(
            automaticCategory({
              name: stream.description,
              merchantName: stream.merchantName,
              plaidCategory: stream.plaidCategory,
              plaidCategoryDetailed: stream.plaidCategoryDetailed,
              amountCents: stream.lastCents,
            }),
          ),
        frequency: stream.frequency,
        lastCents: stream.lastCents,
        lastDate: stream.lastDate,
        predictedNextDate: stream.predictedNextDate,
        status: stream.status,
        isActive: stream.isActive,
        charges: charges.map((entry) => ({ id: entry.id, date: entry.date, amountCents: entry.amountCents })),
      },
      withoutEdits ? null : edit,
      now,
    );
  });
  return { streams: streams.sort((a, b) => a.name.localeCompare(b.name)), accounts: accountMap, entries: byId };
}
