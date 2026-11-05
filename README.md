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

1. Click the button. Cloudflare copies this repo into your GitHub account, makes a D1 database and deploys the app. When it asks for `PLAID_CLIENT_ID` and `PLAID_SECRET`, put in your Production keys from [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys).
2. Open the app. It shows **Turn on sign-in first** and no data. Follow its steps:
   - In the Cloudflare dashboard, open **Workers & Pages**, then the `personal-finance` Worker.
   - Open **Settings** > **Domains & Routes** and click **Enable Cloudflare Access** for workers.dev. Allow only your own email.
   - Copy the two values it shows. Add them in **Settings** > **Variables and Secrets** as `TEAM_DOMAIN` and `POLICY_AUD`.
3. Open the app again, sign in with your email and connect your first account.

The app syncs every day at 12:00 UTC. **Sync now** syncs at any time.

To get updates, sync your copy of the repo with this one on GitHub. Each push deploys again and applies new database migrations.

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

### Move data from an older version

Older versions kept data in `data/finance.db`. To copy it into a new, empty database:

```sh
npm run db:import             # into the local database
npm run db:import -- --remote # into your Cloudflare database
```

For `--remote`, sign in first with `npx wrangler login`, and put your database ID in `wrangler.jsonc`.
