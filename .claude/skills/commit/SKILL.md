---
name: commit
description: "Write a commit in wrjodjana/personal-finance. Every commit is a title only, in the form `area: summary`. Use for every commit in this repo, in every directory and on every branch, and when the user invokes /commit."
---

# Commit

## Format

A commit is a title only, in the form `area: summary`.

- `area` is the lowercase product part the commit changes: `spending`, `transactions`, `accounts`, `sync`, `app`, `repo`.
- `summary` is lowercase and short. It says what the product does after the commit, not what code changed.
- No trailing period, no body and no co-author line.

## Examples

- `spending: refunds cancel out their original purchase instead of lowering the month they arrive in`
- `accounts: a card that needs a new sign-in shows a fix button that repairs the same connection`
- `repo: the app refuses to start if .env or the database is not git-ignored`

Not like this:
- `Fix cached client in plaid.ts` - names the code, not the behaviour, and has no area
- `spending: The chart now hides negative ticks.` - capitalised, trailing period

## Steps

1. Read the staged diff (`git diff --cached`) and pick the one area it changes most.
2. Write the title, then commit with `git commit -m "<title>"`.
3. If the diff holds two unrelated changes, make two commits.
