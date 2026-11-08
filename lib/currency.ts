export type Money = { code: string; rate: number };

export const BASE_CURRENCY = "USD";

export const BASE_MONEY: Money = { code: BASE_CURRENCY, rate: 1 };

type Currency = { code: string; name: string; narrow?: boolean; digits?: number };

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar" },
  { code: "IDR", name: "Indonesian Rupiah", narrow: true, digits: 0 },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "KRW", name: "South Korean Won" },
  { code: "MYR", name: "Malaysian Ringgit", narrow: true },
  { code: "PHP", name: "Philippine Peso" },
  { code: "THB", name: "Thai Baht", narrow: true },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty", narrow: true },
  { code: "CZK", name: "Czech Koruna", narrow: true },
  { code: "HUF", name: "Hungarian Forint", narrow: true, digits: 0 },
  { code: "RON", name: "Romanian Leu", narrow: true },
  { code: "TRY", name: "Turkish Lira", narrow: true },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand", narrow: true },
];

const BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code, currency]));

export function isCurrency(code: unknown): code is string {
  return typeof code === "string" && BY_CODE.has(code);
}

function formatter(code: string, compact: boolean): Intl.NumberFormat {
  const currency = BY_CODE.get(code);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: currency?.narrow ? "narrowSymbol" : "symbol",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : currency?.digits === undefined
        ? {}
        : { minimumFractionDigits: currency.digits, maximumFractionDigits: currency.digits }),
  });
}

const cache = new Map<string, Intl.NumberFormat>();

function cached(code: string, compact: boolean): Intl.NumberFormat {
  const key = `${code}:${compact}`;
  let format = cache.get(key);
  if (!format) {
    format = formatter(code, compact);
    cache.set(key, format);
  }
  return format;
}

export function convert(cents: number, money: Money): number {
  return (cents / 100) * money.rate;
}

export function formatAmount(amount: number, code: string, { compact = false } = {}): string {
  return cached(code, compact).format(amount);
}

export function formatMoney(cents: number, money: Money, { compact = false } = {}): string {
  return formatAmount(convert(cents, money), money.code, { compact });
}

export function moneyParts(cents: number, money: Money): { symbol: string; number: string } {
  const parts = cached(money.code, false).formatToParts(convert(cents, money));
  return {
    symbol: parts.find((part) => part.type === "currency")?.value ?? money.code,
    number: parts
      .filter((part) => part.type !== "currency" && part.type !== "literal" && part.type !== "minusSign")
      .map((part) => part.value)
      .join(""),
  };
}

export function moneySymbol(money: Money): string {
  return moneyParts(0, money).symbol;
}

export function fractionDigits(money: Money): number {
  return cached(money.code, false).resolvedOptions().maximumFractionDigits ?? 2;
}

export function toInputValue(cents: number, money: Money): string {
  return convert(cents, money).toFixed(fractionDigits(money));
}

export function fromInputValue(value: number, money: Money): number {
  return Math.round((value * 100) / money.rate);
}
