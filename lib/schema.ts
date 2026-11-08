import { sql } from "drizzle-orm";
import { blob, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name").notNull(),
  logo: blob("logo", { mode: "buffer" }),
  logoType: text("logo_type"),
  primaryColor: text("primary_color"),
  brandingFetchedAt: text("branding_fetched_at"),
  cursor: text("cursor"),
  status: text("status", { enum: ["ok", "needs_reconnect", "error"] }).notNull().default("ok"),
  errorCode: text("error_code"),
  historyStatus: text("history_status"),
  investmentsError: text("investments_error"),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  officialName: text("official_name"),
  mask: text("mask"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentCents: integer("current_cents"),
  availableCents: integer("available_cents"),
  limitCents: integer("limit_cents"),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency"),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    logoUrl: text("logo_url"),
    plaidCategory: text("plaid_category"),
    plaidCategoryDetailed: text("plaid_category_detailed"),
    pending: integer("pending", { mode: "boolean" }).notNull(),
    pendingTransactionId: text("pending_transaction_id"),
  },
  (table) => [index("transactions_date_idx").on(table.date)],
);

export const categoryOverrides = sqliteTable("category_overrides", {
  transactionId: text("transaction_id")
    .primaryKey()
    .references(() => transactions.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
});

export const removedTransactions = sqliteTable("removed_transactions", {
  transactionId: text("transaction_id")
    .primaryKey()
    .references(() => transactions.id, { onDelete: "cascade" }),
  excluded: integer("excluded", { mode: "boolean" }).notNull().default(true),
  removedAt: text("removed_at").notNull().default(sql`(datetime('now'))`),
});

export const rules = sqliteTable("rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull(),
  category: text("category").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const transactionEdits = sqliteTable("transaction_edits", {
  transactionId: text("transaction_id")
    .primaryKey()
    .references(() => transactions.id, { onDelete: "cascade" }),
  name: text("name"),
  date: text("date"),
  amountCents: integer("amount_cents"),
});

export const deletedTransactions = sqliteTable("deleted_transactions", {
  transactionId: text("transaction_id")
    .primaryKey()
    .references(() => transactions.id, { onDelete: "cascade" }),
  deletedAt: text("deleted_at").notNull().default(sql`(datetime('now'))`),
});

export const balanceSnapshots = sqliteTable(
  "balance_snapshots",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    cents: integer("cents").notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.date] })],
);

export const holdings = sqliteTable(
  "holdings",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    securityId: text("security_id").notNull(),
    ticker: text("ticker"),
    name: text("name"),
    securityType: text("security_type"),
    quantity: real("quantity").notNull(),
    priceCents: integer("price_cents").notNull(),
    valueCents: integer("value_cents").notNull(),
    costBasisCents: integer("cost_basis_cents"),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.securityId] })],
);

export const investmentTransactions = sqliteTable(
  "investment_transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    name: text("name").notNull(),
    ticker: text("ticker"),
    type: text("type").notNull(),
    subtype: text("subtype").notNull(),
    quantity: real("quantity").notNull(),
    price: real("price").notNull(),
    amountCents: integer("amount_cents").notNull(),
    feesCents: integer("fees_cents"),
  },
  (table) => [index("investment_transactions_date_idx").on(table.date)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const exchangeRates = sqliteTable("exchange_rates", {
  currency: text("currency").primaryKey(),
  rate: real("rate").notNull(),
  rateDate: text("rate_date").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});
