import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const globalForPlaid = globalThis as unknown as { plaidClient?: { key: string; api: PlaidApi } };

export function plaidEnv(): "sandbox" | "production" {
  return process.env.PLAID_ENV === "production" ? "production" : "sandbox";
}

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function plaid(): PlaidApi {
  if (!plaidConfigured()) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set in .env");
  }
  const key = `${plaidEnv()}:${process.env.PLAID_CLIENT_ID}:${process.env.PLAID_SECRET}`;
  if (globalForPlaid.plaidClient?.key !== key) {
    globalForPlaid.plaidClient = {
      key,
      api: new PlaidApi(
        new Configuration({
          basePath: PlaidEnvironments[plaidEnv()],
          baseOptions: {
            headers: {
              "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
              "PLAID-SECRET": process.env.PLAID_SECRET,
            },
          },
        }),
      ),
    };
  }
  return globalForPlaid.plaidClient.api;
}

export type PlaidFailure = { code: string; message: string; requestId?: string };

export function toPlaidFailure(error: unknown): PlaidFailure {
  const data = (error as { response?: { data?: unknown } })?.response?.data as
    | { error_code?: string; error_message?: string; display_message?: string | null; request_id?: string }
    | undefined;
  if (data?.error_code) {
    return {
      code: data.error_code,
      message: data.display_message ?? data.error_message ?? data.error_code,
      requestId: data.request_id,
    };
  }
  return { code: "UNKNOWN", message: error instanceof Error ? error.message : String(error) };
}

export const RECONNECT_CODES = new Set([
  "ITEM_LOGIN_REQUIRED",
  "PENDING_EXPIRATION",
  "PENDING_DISCONNECT",
  "ACCESS_NOT_GRANTED",
  "INSUFFICIENT_CREDENTIALS",
  "INVALID_CREDENTIALS",
  "INVALID_MFA",
  "ITEM_LOCKED",
  "USER_SETUP_REQUIRED",
]);
