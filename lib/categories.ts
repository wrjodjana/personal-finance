export type CategoryMeta = { label: string; color: string; spending: boolean };

export const CATEGORIES: Record<string, CategoryMeta> = {
  UNCATEGORIZED: { label: "Uncategorized", color: "#a8a29e", spending: true },
  BILLS: { label: "Bills", color: "#eb6834", spending: true },
  ENTERTAINMENT: { label: "Entertainment", color: "#e87ba4", spending: true },
  FOOD: { label: "Food", color: "#008300", spending: true },
  HEALTHCARE: { label: "Healthcare", color: "#1baf7a", spending: true },
  HOUSING: { label: "Housing", color: "#e34948", spending: true },
  MISCELLANEOUS: { label: "Miscellaneous", color: "#78716c", spending: true },
  OTHER_INCOME: { label: "Other Income", color: "#eab308", spending: false },
  SALARY: { label: "Salary", color: "#16a34a", spending: false },
  SAVINGS: { label: "Savings", color: "#84cc16", spending: false },
  SHOPPING: { label: "Shopping", color: "#6250d6", spending: true },
  SUBSCRIPTIONS: { label: "Subscriptions", color: "#eda100", spending: true },
  TRAVEL: { label: "Travel", color: "#2a78d6", spending: true },
  TRANSFER: { label: "Other", color: "#94a3b8", spending: false },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

const LEGACY_CATEGORIES: Record<string, string> = {
  FOOD_AND_DRINK: "FOOD",
  GENERAL_MERCHANDISE: "SHOPPING",
  TRANSPORTATION: "TRAVEL",
  RENT_AND_UTILITIES: "BILLS",
  HOME_IMPROVEMENT: "HOUSING",
  MEDICAL: "HEALTHCARE",
  PERSONAL_CARE: "MISCELLANEOUS",
  GENERAL_SERVICES: "MISCELLANEOUS",
  GOVERNMENT_AND_NON_PROFIT: "MISCELLANEOUS",
  BANK_FEES: "MISCELLANEOUS",
  PAYMENT_APPS: "UNCATEGORIZED",
  INVESTING: "SAVINGS",
  NOT_SPENDING: "TRANSFER",
  INCOME: "OTHER_INCOME",
  TRANSFER_IN: "TRANSFER",
  TRANSFER_OUT: "TRANSFER",
  LOAN_PAYMENTS: "TRANSFER",
  LOAN_DISBURSEMENTS: "TRANSFER",
  OTHER: "UNCATEGORIZED",
};

const DETAILED_CATEGORIES: Record<string, string> = {
  INCOME_SALARY: "SALARY",
  INCOME_WAGES: "SALARY",
  TRANSFER_OUT_SAVINGS: "SAVINGS",
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: "SAVINGS",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "HOUSING",
  LOAN_PAYMENTS_CAR_PAYMENT: "BILLS",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "BILLS",
  RENT_AND_UTILITIES_RENT: "HOUSING",
  GENERAL_SERVICES_INSURANCE: "BILLS",
};

export function automaticCategory(tx: {
  name: string;
  merchantName: string | null;
  plaidCategory: string | null;
  plaidCategoryDetailed: string | null;
  amountCents: number;
}): string {
  const text = `${tx.merchantName ?? ""} ${tx.name}`.toLowerCase();
  const outflow = tx.amountCents > 0;
  if (!outflow && /cash ?reward|cash ?back|rewards? redemption/.test(text)) return "OTHER_INCOME";
  if (text.includes("zelle") || text.includes("venmo")) return outflow ? "UNCATEGORIZED" : "OTHER_INCOME";
  if (text.includes("robinhood")) return outflow ? "SAVINGS" : "TRANSFER";
  const detailed = tx.plaidCategoryDetailed ? DETAILED_CATEGORIES[tx.plaidCategoryDetailed] : undefined;
  if (detailed) return detailed;
  return normalizeCategory(tx.plaidCategory ?? "UNCATEGORIZED");
}

export function normalizeCategory(key: string): string {
  return LEGACY_CATEGORIES[key] ?? key;
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

export function categoryPillStyle(color: string) {
  return {
    color: `color-mix(in oklch, ${color} 58%, black)`,
    backgroundColor: `color-mix(in oklch, ${color} 10%, white)`,
    borderColor: `color-mix(in oklch, ${color} 28%, white)`,
  };
}
