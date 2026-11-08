# Deploy your own copy

This guide puts the app on your own Cloudflare account. When you finish, you can open it from any device at `https://personal-finance.<your-subdomain>.workers.dev`, and only you can sign in.

If you use Claude Code, it can do most of this for you. See [Deploy with Claude Code](../README.md#deploy-with-claude-code).

It takes about 20 minutes. It costs $0 on Cloudflare's free plan. Plaid charges you for each connected bank.

## What you need

- A Plaid account with **Production** access. Plaid's personal-use plan works.
- A Cloudflare account. The free plan is enough.
- A GitHub account.
- For the command-line way: Node.js 22.5 or later and git.

There are two ways to deploy. Choose one:

- **[A. Deploy button](#a-deploy-button)**: the fastest way. Cloudflare copies the repo into your GitHub account and deploys again on each push.
- **[B. Command line](#b-command-line)**: you deploy from your computer. Use this if you already run the app on your computer and want to move its data.

Both ways end with the same step: [turn on sign-in](#turn-on-sign-in).

## A. Deploy button

1. Click this button:

   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wrjodjana/personal-finance)

2. Sign in to Cloudflare and GitHub when it asks.
3. When it asks for `PLAID_CLIENT_ID` and `PLAID_SECRET`, enter your Production keys from [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys).
4. Click **Deploy**. Cloudflare makes the D1 database, applies the migrations and deploys the app.
5. Go to [Turn on sign-in](#turn-on-sign-in).

## B. Command line

### 1. Get the code

```sh
git clone https://github.com/<you>/personal-finance.git
cd personal-finance
npm install
```

Use your own fork, so you can deploy your own changes.

### 2. Sign in to Cloudflare

Run this in your own terminal:

```sh
npx wrangler login
```

Your browser opens. Sign in and click **Allow**, then wait for "Successfully logged in". Wrangler stops after 2 minutes, so do not wait too long. If it stops, run it again.

### 3. Choose your workers.dev subdomain

Do this one time for your account. If you skip it, the first deploy fails with "Could not automatically register ... as your workers.dev subdomain".

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com) and go to **Compute** > **Workers & Pages**.
2. In the **Account details** box on the right, click the pencil next to **Subdomain**.
3. Enter a name, for example your GitHub name, and save.

The app address is `personal-finance.<subdomain>.workers.dev`. A new subdomain can take a few minutes to start working.

### 4. Make the database

```sh
npx wrangler d1 create personal-finance
```

Do not change `wrangler.jsonc`. Wrangler finds the database by its name, `personal-finance`.

### 5. Deploy

```sh
npm run deploy
```

This applies the database migrations, builds the app and uploads it. At the end it prints your address and the daily sync schedule.

Building on Windows works, but OpenNext does not fully support it. If the build fails on Windows, use WSL or the Deploy button.

### 6. Add your Plaid keys

Each command asks you to paste a value:

```sh
npx wrangler secret put PLAID_CLIENT_ID
npx wrangler secret put PLAID_SECRET
```

### 7. Copy data from your computer (optional)

If you already used the app on your computer, copy your data into the new, empty database:

```sh
npm run db:import -- --remote
```

It copies from `data/finance.db` (older versions). It stops if the database already has connections.

### 8. Deploy on each push (optional)

Do this to stop running `npm run deploy` by hand. Cloudflare then deploys each push to `main` and applies new migrations.

1. Open **Workers & Pages** > **personal-finance** > **Settings** > **Builds** and click **Connect**.
2. Choose GitHub, sign in, and choose your `personal-finance` repo.
3. Set:
   - **Branch**: `main`
   - **Build command**: leave it empty
   - **Deploy command**: `npm run deploy`
   - **Enable Preview builds**: off. The preview command does not build the app, and a preview uses your real database.
   - **API token** (under **Advanced settings**): **Create new token**. The new token has D1 access, which the migration step needs.
4. Click **Connect**.

Push a commit to check. The build log is in **Settings** > **Builds** > **View build history**.

## Turn on sign-in

Until you do this, the app shows **Turn on sign-in first** and no data.

### 1. Set up Zero Trust

1. In the dashboard, go to **Compute** > **Workers & Pages**.
2. In the **Cloudflare Access** box on the right, click **Set up Zero Trust**.
3. Choose a team name and the **Free** plan. It can ask for a card, but the free plan costs $0.

### 2. Protect the Worker

1. Open **Workers & Pages** > **personal-finance**. Then open **Settings** > **Domains & Routes** and click **Enable Cloudflare Access**. (On newer dashboards, it is on the Worker's **Access** tab.)
2. The **Manage Worker access** box opens. Set:
   - **Scope**: **All traffic**
   - **Authentication policy**: **Cloudflare account**
   - **Session duration**: **7 days** (the longest choice)
3. Click **Apply Access**.

Do not use the **Email domain** policy with `gmail.com` or another public email domain. It lets every user of that domain sign in.

With the **Cloudflare account** policy, you sign in with your Cloudflare login. Turn on two-factor authentication for it in **Manage account** > **Profile** > **Authentication**.

### 3. Give the app the two values

After you apply, Cloudflare shows an **AUD tag** and a **JWKS** URL. If you closed the box, open **Zero Trust** > **Access** > **Applications**, then the personal-finance app.

```sh
npx wrangler secret put TEAM_DOMAIN   # paste the JWKS URL, or https://<team>.cloudflareaccess.com
npx wrangler secret put POLICY_AUD    # paste the AUD tag
```

If you used the Deploy button and do not use the command line, add them in the dashboard instead: **Workers & Pages** > **personal-finance** > **Settings** > **Variables and Secrets** > **Add**, with type **Secret**.

### 4. Check

Open `https://personal-finance.<subdomain>.workers.dev` in a private window. It must send you to a Cloudflare sign-in page. After you sign in, you see the app.

## Set your time zone

The app uses UTC for "today" and "this month" until you set your time zone.

1. Open **Workers & Pages** > **personal-finance** > **Settings** > **Variables and Secrets** and click **Add**.
2. Set **Type** to **Text**, **Variable name** to `TIME_ZONE` and **Value** to your IANA time zone, for example `America/New_York`.
3. Click **Deploy**.

Deploys keep this value, because `wrangler.jsonc` has `keep_vars: true`.

From the command line, this does the same: `npx wrangler secret put TIME_ZONE`, then paste your time zone.

## Use your own domain (optional)

If you have a domain on your Cloudflare account, you can open the app at it, for example `finance.example.com`. Add the domain to the deploy command:

- **Command line:** `npm run deploy -- --domain finance.example.com`
- **Deploy on each push or Deploy button:** in **Settings** > **Builds**, set **Deploy command** to `npm run deploy -- --domain finance.example.com`.

With a domain, the deploy turns off the workers.dev address. Make sure the Access app of the Worker covers the new domain: open **Zero Trust** > **Access** > **Applications** and check its hostnames.

## After setup

- The app syncs every day at 12:00 UTC. **Sync now** syncs at any time.
- **Deploy button:** to get updates, sync your GitHub copy with this repo. Each push deploys again and applies new migrations.
- **Command line:** run `git pull`, then `npm run deploy`. If you did [Deploy on each push](#8-deploy-on-each-push-optional), push to `main` instead.
- To see logs, open **Workers & Pages** > **personal-finance** > **Observability**.

## Problems

| What you see | What to do |
| --- | --- |
| **Turn on sign-in first** | `TEAM_DOMAIN` or `POLICY_AUD` is not set. See [Give the app the two values](#3-give-the-app-the-two-values). |
| **Sign in required** (403) | The sign-in token does not match. Make sure `POLICY_AUD` is the AUD tag of this Worker's Access app and `TEAM_DOMAIN` is your team domain. |
| **Add your Plaid keys** | `PLAID_CLIENT_ID` or `PLAID_SECRET` is not set. See [Add your Plaid keys](#6-add-your-plaid-keys). |
| SSL error just after you set or change the subdomain | Wait a few minutes. |
| `wrangler login` says "Timed out waiting for authorization code" | Run it again in your own terminal and click **Allow** within 2 minutes. |
| A build fails at the migration step with "not authorized" (code 7403) | The build token has no D1 access. In **Settings** > **Builds** > **Advanced settings**, choose **Create new token**. |
