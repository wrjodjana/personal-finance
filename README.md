# personal-finance

A single-user dashboard that shows where your money goes. It connects to your credit cards and bank accounts through your own Plaid account and shows your spending by category and by month.

It runs on your own free Cloudflare account, so you can open it from your phone or laptop anywhere. Only you can sign in. Your data stays in your own Cloudflare D1 database. The app only reads data. It cannot move money.

## What you get

- **Spending**: total spent in a month, change from the month before, a 12-month chart by category, and a list of categories.
- **Transactions**: every transaction of a month, with filters for category and account. Change the category of a transaction, or make a rule such as "merchant contains Uber Eats → Food & drink".
- **Accounts**: connect accounts with Plaid Link, see sync status, and fix a broken connection.

Only spending counts. Income, transfers between your accounts and credit card payments are not in the totals. A refund cancels out its original purchase. Pending charges count.

## Requirements

- A Plaid account with Production access. Plaid's personal-use plan works.
- A Cloudflare account. The free plan is enough for one person.
- A GitHub account.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wrjodjana/personal-finance)

Follow **[docs/deploy.md](docs/deploy.md)**. It has every step, with the Deploy button or from the command line. In short:

1. Deploy the app and add your Plaid keys as secrets.
2. Turn on Cloudflare Access for the Worker with the **Cloudflare account** policy.
3. Add the Access **JWKS URL** as `TEAM_DOMAIN` and the **AUD tag** as `POLICY_AUD`.

The app syncs every day at 12:00 UTC. **Sync now** syncs at any time.

If you use Claude Code, ask it to "deploy this to Cloudflare". The `deploy` skill in `.claude/skills/` takes you through the same steps.

### How your data is kept safe

- Every request must carry a valid Cloudflare Access sign-in. The app checks it itself. Until `TEAM_DOMAIN` and `POLICY_AUD` are set, it shows no data.
- Your Plaid keys are Worker secrets. Your bank data is in your D1 database. Nothing goes to the people who made this app.

### Cost

Cloudflare Workers, D1 and Access are free at this size. If the app gets bigger than the 3 MiB free Worker limit, the Workers Paid plan costs $5 a month. Plaid charges you for each connected bank.

## Run on your computer

Requirements: Node.js 22.5 or later.

```sh
git clone <your copy of this repo>
cd personal-finance
npm install
cp .env.example .env
```

Put your Plaid keys in `.env`, then start the app and open [http://127.0.0.1:3000](http://127.0.0.1:3000):

```sh
npm run dev
```

On your computer, the app uses a local D1 database in `.wrangler/` and has no sign-in.
