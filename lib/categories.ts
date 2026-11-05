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
  UNCATEGORIZED: { label: "Uncategorized", color: "#a8a29e", spending: true },
  INCOME: { label: "Income", color: "#16a34a", spending: false },
  TRANSFER_IN: { label: "Transfer in", color: "#94a3b8", spending: false },
  TRANSFER_OUT: { label: "Transfer out", color: "#94a3b8", spending: false },
  LOAN_PAYMENTS: { label: "Card & loan payments", color: "#94a3b8", spending: false },
  LOAN_DISBURSEMENTS: { label: "Loan disbursements", color: "#94a3b8", spending: false },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

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
