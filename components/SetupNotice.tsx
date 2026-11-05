export function SetupNotice() {
  return (
    <div className="card mx-auto mt-16 max-w-lg px-8 py-8">
      <h1 className="text-lg font-medium">Add your Plaid keys</h1>
      <p className="mt-2 text-sm text-muted">
        This app reads your data with your own Plaid account. Plaid keys are not set yet.
      </p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Copy <code className="rounded bg-surface px-1.5 py-0.5">.env.example</code> to{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">.env</code>.
        </li>
        <li>
          Put your Production client ID and secret from{" "}
          <a className="font-medium underline underline-offset-2" href="https://dashboard.plaid.com/developers/keys">
            dashboard.plaid.com
          </a>{" "}
          in it.
        </li>
      </ol>
    </div>
  );
}
