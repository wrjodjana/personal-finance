# personal-finance

A local, single-user dashboard that shows where your money goes. It connects to your credit cards and bank accounts through your own Plaid account and shows your spending by category and by month.

Everything runs on your computer. Your data stays in one SQLite file in `data/`. The app only reads data. It cannot move money.

## What you get

- **Spending**: total spent in a month, change from the month before, a 12-month chart by category, and a list of categories.
- **Transactions**: every transaction of a month, with filters for category and account. Change the category of a transaction, or make a rule such as "merchant contains Uber Eats → Food & drink".
- **Accounts**: connect accounts with Plaid Link, see sync status, and fix a broken connection.

Only spending counts. Income, transfers between your accounts and credit card payments are not in the totals. Refunds lower the total of their category. Pending charges count.

## Requirements

- Node.js 20 or later
- A Plaid account with API keys. For real bank data you need Production access. Plaid's personal-use plan works. For a test with fake data, Sandbox keys are enough.

## Setup

```sh
git clone <this repo>
cd personal-finance
npm install
cp .env.example .env
```

Put your keys from [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys) in `.env`:

```sh
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-secret-for-this-environment
PLAID_ENV=sandbox   # or production
```

Each environment has its own secret. Use the Production secret with `PLAID_ENV=production`.

Start the app and open [http://127.0.0.1:3000](http://127.0.0.1:3000):

```sh
npm run dev
```

In Sandbox, connect any bank and sign in with `user_good` / `pass_good`.

## How data updates

- The app syncs all connections when it starts, and when you click **Refresh**.
- A new connection asks Plaid for 24 months of history, the maximum. Some banks give less. The first full import can take a few minutes, so click Refresh again later.
- If a bank asks you to sign in again (for example after a password change), the Accounts page shows **Needs reconnect**. Click **Fix**. This repairs the same connection, so it does not use one more connection and does not duplicate transactions.

## Privacy and safety

- `.env` and `data/` are in `.gitignore`. The app does not start if they are not ignored, or if git tracks them, so you cannot push your keys or bank data by mistake.
- The server listens only on `127.0.0.1`. Other devices on your network cannot open it.
- Plaid access tokens are stored in `data/finance.db`. Use disk encryption (BitLocker, FileVault) to protect that file.

## Backups

Your data is one file: `data/finance.db`. Copy it to back up. Before a database migration, the app saves a copy as `data/finance.db.bak`.

## Development

- `npm run typecheck` checks types.
- After a change to `lib/schema.ts`, run `npm run db:generate` to create a migration in `drizzle/`. Migrations run when the app starts.
