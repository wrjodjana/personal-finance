---
name: deploy
description: "Take a user through deploying their own copy of personal-finance to Cloudflare Workers with D1 and Cloudflare Access, from the command line. Use when the user asks to deploy, host, put the app online, set up Cloudflare, turn on sign-in, move local data to Cloudflare, or fix a broken deploy."
---

# Deploy to Cloudflare

The user's guide is `docs/deploy.md`. This skill is the same flow for an agent. Keep both in step: if you change one, change the other, and also the setup page in `worker.ts`.

## Rules

- **The user signs in and pastes secrets, not you.** Do not ask the user to paste a Plaid key or an API token into the chat, and do not pipe secrets through your own commands. Give the user the command and ask them to run it with the `!` prefix or in their own terminal.
- **The user runs `npx wrangler login` in their own terminal.** The `!` prefix stops after 120 s, and the browser approval often takes longer.
- **The user does the dashboard steps.** You cannot click in their Cloudflare dashboard. Give exact menu paths, and ask for a screenshot if they are lost.
- **Bank data goes up only on the user's command.** The user runs `npm run db:import -- --remote` themselves.
- `TEAM_DOMAIN` and `POLICY_AUD` are not secret. You can set them when the user sends them.
- Check each step before you go to the next one.

## Steps

Before you start, check: `npx wrangler whoami`, `npx wrangler d1 list`, `npx wrangler secret list`. Skip the steps that are already done.

### 1. Sign in

Ask the user to run `npx wrangler login` in their own terminal and click **Allow**. Check with `npx wrangler whoami`.

### 2. workers.dev subdomain

Ask the user to set it: **Compute** > **Workers & Pages** > **Account details** box > pencil next to **Subdomain**. The app address is `personal-finance.<subdomain>.workers.dev`. A workers.dev address always has the Worker name first, so it cannot be only `<subdomain>.workers.dev`.

If it is not set, `npm run deploy` fails with "Could not automatically register ... as your workers.dev subdomain".

### 3. Database

```sh
npx wrangler d1 create personal-finance
```

Put the printed `database_id` in `wrangler.jsonc` under the `DB` binding. Commit it: the ID is not secret.

### 4. Deploy

```sh
npm run deploy
```

It applies D1 migrations remotely, runs the OpenNext build and uploads the Worker. Success prints the URL and `schedule: 0 12 * * *`. A new subdomain can give SSL errors for a few minutes.

To check without a browser: `curl -s -o /dev/null -w "%{http_code}" https://personal-finance.<subdomain>.workers.dev/`. Before Access, it returns `503` (the setup page). After Access, it returns `302` to `<team>.cloudflareaccess.com`.

### 5. Plaid keys (the user runs these)

```sh
! npx wrangler secret put PLAID_CLIENT_ID
! npx wrangler secret put PLAID_SECRET
```

Check with `npx wrangler secret list`.

### 6. Local data (optional, the user runs this)

```sh
! npm run db:import -- --remote
```

It reads `data/finance.db` and refuses to run if the remote database already has connections. To check: `npx wrangler d1 execute DB --remote --command "select count(*) from transactions"`.

### 7. Sign-in (the user does this in the dashboard)

1. **Workers & Pages** > **Cloudflare Access** box > **Set up Zero Trust** > Free plan.
2. Worker > **Settings** > **Domains & Routes** > **Enable Cloudflare Access** (newer dashboards: the **Access** tab). The **Manage Worker access** box opens.
3. **Scope**: All traffic. **Authentication policy**: **Cloudflare account**. **Session duration**: 7 days. Then **Apply Access**.
   - Stop the user if they choose **Email domain** with a public domain such as `gmail.com`: it lets every Gmail user in. A full email address in that field matches nobody.
   - Tell them to turn on 2FA for their Cloudflare login. It now protects their bank data.
4. Ask for the **AUD tag** and the **JWKS** URL. Then set them:

```sh
printf '%s' "<JWKS URL or https://<team>.cloudflareaccess.com>" | npx wrangler secret put TEAM_DOMAIN
printf '%s' "<AUD tag>" | npx wrangler secret put POLICY_AUD
```

`worker.ts` keeps only the origin of `TEAM_DOMAIN`, so the full JWKS URL works.

### 8. Check

The curl from step 4 must return `302` to the Access login. Ask the user to open the app in a private window, sign in and check their transactions.

## How the app fits together

- `worker.ts` is the Worker entry. It checks the `Cf-Access-Jwt-Assertion` JWT with `jose` and fails closed: `503` setup page if `TEAM_DOMAIN` or `POLICY_AUD` is missing, `403` if the token is not valid. Its `scheduled` handler calls `/api/sync` for the daily cron.
- `wrangler.jsonc` has the `DB` binding (`migrations_dir: drizzle`), the cron and `keep_vars: true`.
- `lib/db.ts` gets D1 from `getCloudflareContext()`. Local `npm run dev` uses a local D1 in `.wrangler/` with no sign-in.

## Problems

| Symptom | Cause and fix |
| --- | --- |
| `wrangler login` times out | Approval took more than 2 minutes, or ran under `!`. Run it in the user's own terminal. |
| "Could not automatically register ... workers.dev subdomain" | No subdomain yet. Step 2, then `npx opennextjs-cloudflare deploy` (the build is already done). |
| SSL error (curl exit 35) | New or changed subdomain. Wait a few minutes. |
| Setup page after Access is on | `TEAM_DOMAIN` or `POLICY_AUD` is missing. `npx wrangler secret list`. |
| 403 "Sign in required" | `POLICY_AUD` is not this Worker's AUD tag, or `TEAM_DOMAIN` is the wrong team. |
| "Add your Plaid keys" | Step 5. |
| Subdomain changed after Access was set | Access is for a hostname. Check the Access app still covers the new address. |
