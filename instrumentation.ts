export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { plaidConfigured } = await import("./lib/plaid");
  if (!plaidConfigured()) return;
  const { syncAll } = await import("./lib/sync");
  syncAll().catch((error) => console.error("[sync] startup sync failed", error));
}
