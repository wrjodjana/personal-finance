import { execFileSync } from "node:child_process";

const mustBeIgnored = [".env", ".dev.vars", ".wrangler/state", "data/finance.db"];

function git(args) {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return 0;
  } catch (error) {
    return typeof error.status === "number" ? error.status : -1;
  }
}

if (git(["rev-parse", "--is-inside-work-tree"]) !== 0) {
  process.exit(0);
}

const problems = [];
for (const path of mustBeIgnored) {
  if (git(["check-ignore", "-q", "--no-index", path]) !== 0) {
    problems.push(`${path} is not listed in .gitignore`);
  }
  if (git(["ls-files", "--error-unmatch", path]) === 0) {
    problems.push(`${path} is tracked by git (run: git rm --cached ${path})`);
  }
}

if (problems.length > 0) {
  console.error("\nRefusing to start: your secrets or bank data could be pushed to GitHub.\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}
