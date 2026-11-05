# personal-finance

A local, single-user dashboard that shows where your money goes. It connects to your credit cards and bank accounts through your own Plaid account and shows your spending by category and by month.

Everything runs on your computer. Your data stays in one SQLite file in `data/`. The app only reads data. It cannot move money.

## What you get

- **Spending**: total spent in a month, change from the month before, a 12-month chart by category, and a list of categories.
- **Transactions**: every transaction of a month, with filters for category and account. Change the category of a transaction, or make a rule such as "merchant contains Uber Eats → Food & drink".
- **Accounts**: connect accounts with Plaid Link, see sync status, and fix a broken connection.

Only spending counts. Income, transfers between your accounts and credit card payments are not in the totals. A refund cancels out its original purchase. Pending charges count.

## Requirements

- Node.js 20 or later
- A Plaid account with Production access. Plaid's personal-use plan works.

## Setup

```sh
git clone <this repo>
cd personal-finance
npm install
cp .env.example .env
```

Put your Production keys from [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys) in `.env`:

```sh
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-production-secret
```

Start the app and open [http://127.0.0.1:3000](http://127.0.0.1:3000):

```sh
npm run dev
```
