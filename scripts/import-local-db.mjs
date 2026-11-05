import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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

const remote = process.argv.includes("--remote");
const target = remote ? "--remote" : "--local";
const source = path.join(process.cwd(), "data", "finance.db");
const wrangler = path.join(path.dirname(createRequire(import.meta.url).resolve("wrangler/package.json")), "bin", "wrangler.js");

function run(args, options = {}) {
  return execFileSync(process.execPath, [wrangler, ...args], { encoding: "utf8", ...options });
}

function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString("hex")}'`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

if (!existsSync(source)) {
  console.error(`No database found at ${source}.`);
  process.exit(1);
}

run(["d1", "migrations", "apply", "DB", target], { stdio: "inherit" });

const [{ results }] = JSON.parse(
  run(["d1", "execute", "DB", target, "--json", "--command", "select count(*) as total from items"]),
);
if (results[0].total > 0) {
  console.error("The target database already has connections. Import only into an empty database.");
  process.exit(1);
}

const db = new DatabaseSync(source, { readOnly: true });
const lines = [];
for (const table of TABLES) {
  const rows = db.prepare(`select * from "${table}"`).all();
  for (const row of rows) {
    const columns = Object.keys(row).map((column) => `"${column}"`).join(", ");
    const values = Object.values(row).map(literal).join(", ");
    lines.push(`insert into "${table}" (${columns}) values (${values});`);
  }
  console.log(`${table}: ${rows.length} rows`);
}
db.close();

const dir = mkdtempSync(path.join(tmpdir(), "finance-import-"));
const file = path.join(dir, "import.sql");
try {
  writeFileSync(file, lines.join("\n"));
  run(["d1", "execute", "DB", target, "--yes", "--file", file], { stdio: ["inherit", "ignore", "inherit"] });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`Imported ${lines.length} rows into the ${remote ? "remote" : "local"} D1 database.`);
