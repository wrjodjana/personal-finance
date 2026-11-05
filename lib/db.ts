import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "finance.db");
const migrationsFolder = path.join(process.cwd(), "drizzle");

type Db = BetterSQLite3Database<typeof schema>;
type Connection = { sqlite: Database.Database; db: Db };

const globalForDb = globalThis as unknown as { financeConnection?: Connection };

function pendingMigrationCount(sqlite: Database.Database): number {
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as { entries: unknown[] };
  const table = sqlite
    .prepare("select name from sqlite_master where type = 'table' and name = '__drizzle_migrations'")
    .get();
  if (!table) return journal.entries.length;
  const { count } = sqlite.prepare("select count(*) as count from __drizzle_migrations").get() as {
    count: number;
  };
  return journal.entries.length - count;
}

function migrateWithBackup({ sqlite, db }: Connection, hasData: boolean) {
  if (pendingMigrationCount(sqlite) === 0) return;
  if (hasData) {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, `${dbPath}.bak`);
  }
  migrate(db, { migrationsFolder });
}

function open(): Connection {
  fs.mkdirSync(dataDir, { recursive: true });
  const existed = fs.existsSync(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const connection = { sqlite, db: drizzle(sqlite, { schema }) };
  migrateWithBackup(connection, existed);
  return connection;
}

export function getDb(): Db {
  if (!globalForDb.financeConnection) {
    globalForDb.financeConnection = open();
  } else if (process.env.NODE_ENV === "development") {
    migrateWithBackup(globalForDb.financeConnection, true);
  }
  return globalForDb.financeConnection.db;
}
