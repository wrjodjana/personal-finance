"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { value: string; label: string };
type Rule = { id: number; pattern: string; categoryLabel: string };

export function Rules({ rules, options }: { rules: Rule[]; options: Option[] }) {
  const router = useRouter();
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState(options[0]?.value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, category }),
    });
    if (response.ok) {
      setPattern("");
      router.refresh();
    } else {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not save the rule");
    }
    setBusy(false);
  }

  async function remove(id: number) {
    await fetch("/api/rules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  const field =
    "control h-10 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-line";

  return (
    <section className="card">
      <div className="border-b border-line/70 px-5 py-4">
        <h2 className="text-sm font-medium">Rules</h2>
        <p className="label mt-1">
          A rule sets the category of every transaction whose merchant contains the text. Newer rules win. A category
          you pick by hand always wins.
        </p>
      </div>
      <form onSubmit={add} className="flex flex-wrap items-center gap-2 px-5 py-4">
        <span className="text-sm text-muted">Merchant contains</span>
        <input
          className={`${field} w-48`}
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder="e.g. Uber Eats"
        />
        <span className="text-sm text-muted">→</span>
        <select className={`${field} cursor-pointer`} value={category} onChange={(event) => setCategory(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || pattern.trim().length < 2}
          className="h-10 rounded-lg bg-[oklch(0.35_0.02_65)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[oklch(0.29_0.02_65)] disabled:opacity-40"
        >
          Add rule
        </button>
        {error && <p className="w-full text-xs text-negative">{error}</p>}
      </form>
      {rules.length > 0 && (
        <ul className="divide-y divide-line/60 border-t border-line/70">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span>
                <span className="font-medium">“{rule.pattern}”</span>
                <span className="text-faint"> → </span>
                {rule.categoryLabel}
              </span>
              <button
                type="button"
                onClick={() => remove(rule.id)}
                className="text-xs text-faint hover:text-negative"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
