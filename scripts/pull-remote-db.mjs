import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const TABLES = [
  "items",
  "accounts",
  "transactions",
  "category_overrides",
  "removed_transactions",
  "deleted_transactions",
  "transaction_edits",
  "rules",
];

const wrangler = path.join(path.dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");

function run(args, options = {}) {
  return execFileSync(process.execPath, [wrangler, ...args], { encoding: "utf8", ...options });
}

run(["d1", "migrations", "apply", "DB", "--local"], { stdio: "inherit" });

const dir = mkdtempSync(path.join(tmpdir(), "finance-pull-"));
const exported = path.join(dir, "export.sql");
const script = path.join(dir, "pull.sql");
try {
  run(
    ["d1", "export", "DB", "--remote", "--no-schema", "--output", exported, ...TABLES.flatMap((table) => ["--table", table])],
    { stdio: ["inherit", "ignore", "inherit"] },
  );
  const inserts = readFileSync(exported, "utf8");
  const clear = [...TABLES].reverse().map((table) => `delete from "${table}";`);
  writeFileSync(script, ["PRAGMA defer_foreign_keys = true;", ...clear, inserts].join("\n"));
  run(["d1", "execute", "DB", "--local", "--yes", "--file", script], { stdio: ["inherit", "ignore", "inherit"] });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const [{ results }] = JSON.parse(
  run(["d1", "execute", "DB", "--local", "--json", "--command", "select (select count(*) from items) as items, (select count(*) from transactions) as transactions"]),
);
console.log(`Copied the remote database to the local one: ${results[0].items} connections, ${results[0].transactions} transactions.`);
