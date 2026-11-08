---
name: deploy
description: "Take a user from nothing to their own running copy of personal-finance on Cloudflare Workers with D1 and Cloudflare Access: fork, clone, install, deploy, Plaid keys, time zone, sign-in and checks. Use when the user asks to set up, deploy, host, put the app online, set up Cloudflare, turn on sign-in, move local data to Cloudflare, or fix a broken deploy."
---

# Deploy to Cloudflare

The user's guide is `docs/deploy.md`. This skill is the same flow for an agent. Keep both in step: if you change one, change the other, and also the setup page in `worker.ts`.

The user is often not a developer. Do every step you can. For each step only the user can do, say so plainly before the step, with the label **You do this:**, and give exact clicks or one command to paste. Then wait, and check the result yourself before you go on.

## Rules

- **The user signs in and pastes secrets, not you.** Do not ask the user to paste a Plaid key or an API token into the chat, and do not pipe secrets through your own commands. Give the user the command and ask them to run it with the `!` prefix or in their own terminal.
- **The user runs `npx wrangler login` and `gh auth login` in their own terminal.** The `!` prefix stops after 120 s, and the browser approval often takes longer.
- **The user does the dashboard steps.** You cannot click in their Cloudflare or Plaid dashboard. Give exact menu paths, and ask for a screenshot if they are lost.
- **Bank data goes up only on the user's command.** The user runs `npm run db:import -- --remote` themselves.
- `TEAM_DOMAIN`, `POLICY_AUD` and `TIME_ZONE` are not secret. You can set them when the user sends them.
- Do not put a database ID, domain or time zone in `wrangler.jsonc`. Those stay in the user's Cloudflare account, so the fork stays the same as this repo and updates merge cleanly.
- Check each step before you go to the next one. Skip the steps that are already done.

## Before you start

Tell the user, in a short list, what they will do by hand, so nothing is a surprise:

1. Get Plaid **Production** keys. Plaid can take a few days to approve Production access, so start this first.
2. Sign in to GitHub and Cloudflare in their own terminal (two commands).
3. Choose a workers.dev subdomain in the Cloudflare dashboard (one minute).
4. Paste their two Plaid keys into a command (no key goes into the chat).
5. Turn on sign-in in the Cloudflare dashboard and send you two values (about five minutes).
6. Open the app and connect their banks.

Everything else is your work. It costs $0 on Cloudflare's free plan. Plaid charges for each connected bank.

Then check what is already done: `node --version`, `git --version`, `gh auth status`, `npx wrangler whoami`, `npx wrangler d1 list`, `npx wrangler secret list`.

## Steps

### 1. Plaid account

**You do this:** sign up at [dashboard.plaid.com](https://dashboard.plaid.com/signup) and ask for **Production** access (the personal-use plan works). When it is approved, the keys are at [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys). Sandbox keys do not connect real banks.

You can do steps 2 to 6 while Plaid approves.

### 2. Tools

Needs Node.js 22.5 or later, git and the GitHub CLI (`gh`). If one is missing, install it for the user with the system's package manager (`winget`, `brew` or `apt`), or give the download link if that fails.

**You do this:** `gh auth login` in your own terminal, if `gh auth status` says you are not signed in. Choose GitHub.com, HTTPS and "Login with a web browser".

### 3. Fork and clone

A fork lets the user get updates and deploy on each push.

- If the current folder is not this repo: `gh repo fork wrjodjana/personal-finance --clone`, then work in `personal-finance/`.
- If the current folder is a clone of `wrjodjana/personal-finance` (check `git remote -v`): `gh repo fork --remote`. This makes `origin` the user's fork and `upstream` this repo.
- If `origin` is already the user's fork: skip.

Then run `npm install`.

### 4. Sign in to Cloudflare

**You do this:** if you have no Cloudflare account, sign up at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up). Then run `npx wrangler login` in your own terminal (in the `personal-finance` folder), and click **Allow** in the browser within 2 minutes.

Check with `npx wrangler whoami`.

### 5. workers.dev subdomain

**You do this:** in the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Compute** > **Workers & Pages**. In the **Account details** box on the right, click the pencil next to **Subdomain**, enter a name and save. Skip this if a subdomain is already there.

The app address is `personal-finance.<subdomain>.workers.dev`. A workers.dev address always has the Worker name first, so it cannot be only `<subdomain>.workers.dev`. If it is not set, `npm run deploy` fails with "Could not automatically register ... as your workers.dev subdomain".

### 6. Database and deploy

```sh
npx wrangler d1 create personal-finance
npm run deploy
```

Do not copy the printed `database_id` into `wrangler.jsonc`. Wrangler finds the database by its `database_name`, and the deploy links it to the Worker.

`npm run deploy` applies D1 migrations remotely, runs the OpenNext build and uploads the Worker. Success prints the URL and `schedule: 0 12 * * *`. A new subdomain can give SSL errors for a few minutes.

On Windows, OpenNext does not fully support the build. If it fails there, use WSL, or do step 13 (deploy on each push) now: Cloudflare then builds on Linux.

To check without a browser: `curl -s -o /dev/null -w "%{http_code}" https://personal-finance.<subdomain>.workers.dev/`. Before sign-in is on, it returns `503` (the setup page).

### 7. Plaid keys

**You do this:** run these two commands. Each one asks you to paste a key from [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys) (the **Production** client ID, then the **Production** secret):

```sh
! npx wrangler secret put PLAID_CLIENT_ID
! npx wrangler secret put PLAID_SECRET
```

Check with `npx wrangler secret list`.

### 8. Time zone

Find the user's time zone with `node -e "console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)"` and ask them to confirm it. Then set it:

```sh
printf '%s' "<IANA time zone>" | npx wrangler secret put TIME_ZONE
```

The app reads it the same way as a dashboard variable. Without it, the app uses UTC for "today" and "this month".

### 9. Sign-in

Until this is done, the app shows **Turn on sign-in first** and no data.

**You do this**, in the Cloudflare dashboard:

1. **Compute** > **Workers & Pages**. In the **Cloudflare Access** box on the right, click **Set up Zero Trust**. Choose a team name and the **Free** plan. It can ask for a card, but the free plan costs $0.
2. Open the **personal-finance** Worker > **Settings** > **Domains & Routes** > **Enable Cloudflare Access** (newer dashboards: the **Access** tab). The **Manage Worker access** box opens.
3. Set **Scope** to **All traffic**, **Authentication policy** to **Cloudflare account** and **Session duration** to **7 days**. Then click **Apply Access**.
4. Send me the **AUD tag** and the **JWKS** URL that it shows. They are not secret.

- Stop the user if they choose **Email domain** with a public domain such as `gmail.com`: it lets every Gmail user in. A full email address in that field matches nobody.
- Tell them to turn on two-factor authentication for their Cloudflare login (**Manage account** > **Profile** > **Authentication**). It now protects their bank data.

Then set the two values:

```sh
printf '%s' "<JWKS URL or https://<team>.cloudflareaccess.com>" | npx wrangler secret put TEAM_DOMAIN
printf '%s' "<AUD tag>" | npx wrangler secret put POLICY_AUD
```

`worker.ts` keeps only the origin of `TEAM_DOMAIN`, so the full JWKS URL works.

### 10. Check

The curl from step 6 must now return `302` to `<team>.cloudflareaccess.com`.

**You do this:** open `https://personal-finance.<subdomain>.workers.dev` in a private window. It must send you to a Cloudflare sign-in page. Sign in with your Cloudflare login, and you see the app.

### 11. Connect banks

**You do this:** in the app, open **Accounts** and click **New connection**. Plaid opens. Choose your bank and sign in to it. Do this for each bank or card.

The app syncs every day at 12:00 UTC. **Sync now** syncs at any time.

### 12. Local data (optional)

Only if the user already ran the app on their computer.

**You do this:** `! npm run db:import -- --remote`

It reads `data/finance.db` and refuses to run if the remote database already has connections. To check: `npx wrangler d1 execute DB --remote --command "select count(*) from transactions"`.

### 13. Deploy on each push (recommended)

Then a push to `main` deploys, and getting updates is one sync of the fork.

**You do this:** open **Workers & Pages** > **personal-finance** > **Settings** > **Builds** and click **Connect**. Choose GitHub and the `personal-finance` fork. Set:

- **Branch**: `main`
- **Build command**: empty
- **Deploy command**: `npm run deploy`
- **Enable Preview builds**: off. A preview uses the real database.
- **API token** (under **Advanced settings**): **Create new token**. It has the D1 access that migrations need.

Then click **Connect**.

### 14. Own domain (optional)

Only for a domain that is on the user's Cloudflare account. Pass it to the deploy: `npm run deploy -- --domain <domain>`. With Workers Builds, set the deploy command to the same. Do not put the domain in `wrangler.jsonc`. With a domain, wrangler turns off workers.dev. Check that the Worker's Access app covers the domain.

## Updates

- With step 13: `gh repo sync <user>/personal-finance`, or **Sync fork** on GitHub. Cloudflare deploys and applies new migrations.
- Without it: `git pull upstream main`, then `npm run deploy`.

## How the app fits together

- `worker.ts` is the Worker entry. It checks the `Cf-Access-Jwt-Assertion` JWT with `jose` and fails closed: `503` setup page if `TEAM_DOMAIN` or `POLICY_AUD` is missing, `403` if the token is not valid. Its `scheduled` handler calls `/api/sync` for the daily cron.
- `wrangler.jsonc` has the `DB` binding (`database_name` only, `migrations_dir: drizzle`), the cron and `keep_vars: true`. It has no database ID, domain or time zone.
- `lib/db.ts` gets D1 from `getCloudflareContext()`. Local `npm run dev` uses a local D1 in `.wrangler/` with no sign-in.

## Problems

| Symptom | Cause and fix |
| --- | --- |
| `wrangler login` or `gh auth login` times out | Approval took too long, or ran under `!`. Run it in the user's own terminal. |
| "Could not automatically register ... workers.dev subdomain" | No subdomain yet. Step 5, then `npx opennextjs-cloudflare deploy` (the build is already done). |
| Build fails on Windows | Use WSL, or step 13 so Cloudflare builds it. |
| SSL error (curl exit 35) | New or changed subdomain. Wait a few minutes. |
| Setup page after Access is on | `TEAM_DOMAIN` or `POLICY_AUD` is missing. `npx wrangler secret list`. |
| 403 "Sign in required" | `POLICY_AUD` is not this Worker's AUD tag, or `TEAM_DOMAIN` is the wrong team. |
| "Add your Plaid keys" | Step 7. |
| Plaid Link fails for a real bank | The keys are Sandbox, or Production access is not approved yet. Step 1. |
| A build fails at the migration step with "not authorized" (code 7403) | The build token has no D1 access. **Settings** > **Builds** > **Advanced settings** > **Create new token**. |
| Subdomain changed after Access was set | Access is for a hostname. Check the Access app still covers the new address. |
