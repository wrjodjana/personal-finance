export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      <h1 className="text-lg font-semibold">Add your Plaid keys</h1>
      <p className="mt-2 text-sm text-stone-600">
        This app reads your data with your own Plaid account. Plaid keys are not set yet.
      </p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>
          Copy <code className="rounded bg-stone-100 px-1.5 py-0.5">.env.example</code> to{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5">.env</code>.
        </li>
        <li>
          Put your client ID and secret from{" "}
          <a className="font-medium underline" href="https://dashboard.plaid.com/developers/keys">
            dashboard.plaid.com
          </a>{" "}
          in it.
        </li>
        <li>
          Set <code className="rounded bg-stone-100 px-1.5 py-0.5">PLAID_ENV</code> to{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5">sandbox</code> or{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5">production</code>, then restart the app.
        </li>
      </ol>
    </div>
  );
}
