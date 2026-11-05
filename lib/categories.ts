export type CategoryMeta = { label: string; color: string; spending: boolean };

export const CATEGORIES: Record<string, CategoryMeta> = {
  FOOD_AND_DRINK: { label: "Food & drink", color: "#f97316", spending: true },
  GENERAL_MERCHANDISE: { label: "Shopping", color: "#8b5cf6", spending: true },
  TRANSPORTATION: { label: "Transportation", color: "#0ea5e9", spending: true },
  TRAVEL: { label: "Travel", color: "#06b6d4", spending: true },
  ENTERTAINMENT: { label: "Entertainment", color: "#ec4899", spending: true },
  RENT_AND_UTILITIES: { label: "Rent & utilities", color: "#6366f1", spending: true },
  HOME_IMPROVEMENT: { label: "Home", color: "#a16207", spending: true },
  MEDICAL: { label: "Medical", color: "#ef4444", spending: true },
  PERSONAL_CARE: { label: "Personal care", color: "#d946ef", spending: true },
  GENERAL_SERVICES: { label: "Services", color: "#14b8a6", spending: true },
  GOVERNMENT_AND_NON_PROFIT: { label: "Government & donations", color: "#64748b", spending: true },
  BANK_FEES: { label: "Bank fees", color: "#78716c", spending: true },
  PAYMENT_APPS: { label: "Zelle & Venmo", color: "#eab308", spending: true },
  INVESTING: { label: "Investing", color: "#22c55e", spending: true },
  UNCATEGORIZED: { label: "Other", color: "#a8a29e", spending: true },
  NOT_SPENDING: { label: "Not spending", color: "#94a3b8", spending: false },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

const PLAID_NOT_SPENDING = new Set(["INCOME", "TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS", "LOAN_DISBURSEMENTS"]);

export function automaticCategory(tx: {
  name: string;
  merchantName: string | null;
  plaidCategory: string | null;
  plaidCategoryDetailed: string | null;
  amountCents: number;
}): string {
  const text = `${tx.merchantName ?? ""} ${tx.name}`.toLowerCase();
  const outflow = tx.amountCents > 0;
  if (!outflow && /cash ?reward|cash ?back|rewards? redemption/.test(text)) return "NOT_SPENDING";
  if (text.includes("zelle") || text.includes("venmo")) return outflow ? "PAYMENT_APPS" : "NOT_SPENDING";
  if (text.includes("robinhood") || tx.plaidCategoryDetailed === "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS") {
    return outflow ? "INVESTING" : "NOT_SPENDING";
  }
  return tx.plaidCategory ?? "UNCATEGORIZED";
}

export function normalizeCategory(key: string): string {
  if (PLAID_NOT_SPENDING.has(key)) return "NOT_SPENDING";
  if (key === "OTHER") return "UNCATEGORIZED";
  return key;
}

export function categoryMeta(key: string): CategoryMeta {
  return (
    CATEGORIES[key] ?? {
      label: key
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      color: "#a8a29e",
      spending: true,
    }
  );
}

export function isSpendingCategory(key: string): boolean {
  return categoryMeta(key).spending;
}
