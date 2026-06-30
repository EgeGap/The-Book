// ── Expenses module (Giderler) ──────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "streaming",
  "music",
  "software",
  "housing",
  "utilities",
  "phone",
  "fitness",
  "transport",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CURRENCIES = ["TRY", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
};

export const EXPENSE_CYCLES = ["monthly", "yearly"] as const;
export type ExpenseCycle = (typeof EXPENSE_CYCLES)[number];

/** How often we ask "are you still using this?" for an active expense. */
export const SUBSCRIPTION_CHECK_INTERVAL_DAYS = 90;

/** Distinct chart colors per expense category (theme-friendly). */
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  streaming: "#EA3943",
  music: "#16C784",
  software: "#7C5CFC",
  housing: "#F0883E",
  utilities: "#2D9CDB",
  phone: "#BB6BD9",
  fitness: "#27AE60",
  transport: "#F2C94C",
  other: "#9AA0A6",
};

// ── Portfolio module ────────────────────────────────────────────────────────

export const STOCK_MARKETS = ["BIST", "US", "EMTIA"] as const;
export type StockMarket = (typeof STOCK_MARKETS)[number];

/** Fixed commodity instruments — picked from a list rather than typed, since there's no open symbol search for these. */
export const COMMODITIES = [
  { symbol: "ALTIN", label: "Altın (gram)", yahooSymbol: "GC=F" },
  { symbol: "GUMUS", label: "Gümüş (gram)", yahooSymbol: "SI=F" },
] as const;
export type CommoditySymbol = (typeof COMMODITIES)[number]["symbol"];

/** Yahoo's commodity futures (GC=F, SI=F) quote USD per troy ounce; the app tracks holdings in grams. */
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

/** Yahoo Finance expects BIST tickers suffixed with .IS (e.g. THYAO.IS); commodities map to futures tickers. */
export function toQuoteSymbol(symbol: string, market: StockMarket): string {
  if (market === "EMTIA") {
    return COMMODITIES.find((c) => c.symbol === symbol)?.yahooSymbol ?? symbol;
  }
  return market === "BIST" ? `${symbol}.IS` : symbol;
}
