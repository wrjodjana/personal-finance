# personal-finance

A single-user dashboard that shows where your money goes. It connects to your credit cards and bank accounts through your own Plaid account and shows your spending by category and by month.

It runs on your own free Cloudflare account, so you can open it from your phone or laptop anywhere. Only you can sign in. Your data stays in your own Cloudflare D1 database. The app only reads data. It cannot move money.

## What you get

- **Spending**: total spent in a month, change from the month before, a 12-month chart by category, and a list of categories.
- **Transactions**: every transaction of a month, with filters for category and account. Change the category of a transaction.
- **Accounts**: connect accounts with Plaid Link, see sync status, and fix a broken connection.

Only spending counts. Income, transfers between your accounts and credit card payments are not in the totals. A refund cancels out its original purchase. Pending charges count.

## Requirements

- A Plaid account with Production access. Plaid's personal-use plan works.
- A Cloudflare account. The free plan is enough for one person.
- A GitHub account.

## Deploy with Claude Code

The easiest way. In an empty folder, start [Claude Code](https://claude.com/claude-code) and paste:

```text
Set up my own copy of https://github.com/wrjodjana/personal-finance. Fork it, clone it, then read .claude/skills/deploy/SKILL.md in the clone and follow it.
```

Claude forks the repo, installs it and deploys it to your Cloudflare account. It stops and tells you each time you must do something yourself:

- Get Plaid **Production** keys. Plaid can take a few days to approve, so start this first.
- Sign in to GitHub and Cloudflare in your terminal.
- Choose a workers.dev subdomain and turn on sign-in in the Cloudflare dashboard.
- Paste your Plaid keys into a command. Your keys never go into the chat.
- Open the app and connect your banks.

The app syncs every day at 12:00 UTC. **Sync now** syncs at any time.

## How your data is kept safe

- Every request must carry a valid Cloudflare Access sign-in. The app checks it itself. Until sign-in is set up, it shows no data.
- Your Plaid keys are Worker secrets. Your bank data is in your D1 database. Nothing goes to the people who made this app.

## Cost

Cloudflare Workers, D1 and Access are free at this size. If the app gets bigger than the 3 MiB free Worker limit, the Workers Paid plan costs $5 a month. Plaid charges you for each connected bank.
