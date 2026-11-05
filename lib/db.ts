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

const globalForDb = globalThis as unknown as { financeDb?: Db };

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

function open(): Db {
  fs.mkdirSync(dataDir, { recursive: true });
  const existed = fs.existsSync(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  if (existed && pendingMigrationCount(sqlite) > 0) {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, `${dbPath}.bak`);
  }

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}

export function getDb(): Db {
  globalForDb.financeDb ??= open();
  return globalForDb.financeDb;
}
