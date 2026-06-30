import type { Currency, ExpenseCategory, ExpenseCycle, StockMarket } from "./constants";

/** A historical amount, recorded whenever an expense's amount/currency changes. */
export interface PriceHistoryEntry {
  amount: number;
  currency: Currency;
  changedAt: number;
}

/**
 * A recurring fixed expense (subscription, rent, gym…). Defined once and counted
 * automatically every period. Amount is stored in the expense's OWN currency.
 */
export interface Expense {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  cycle: ExpenseCycle;
  billingDay: number; // 1-31
  paymentMethod: string;
  active: boolean; // pause without deleting
  notes: string;
  startedAt: number;
  createdAt: number;
  priceHistory: PriceHistoryEntry[];
  lastConfirmedAt: number; // last time the user confirmed they're still using this
}

/** Defaults pre-filled on the New Expense form from the last saved expense. */
export interface LastUsedExpense {
  currency: Currency;
  category: ExpenseCategory;
}

/** Persisted user preferences (AsyncStorage via useSettingsStore). */
export interface Settings {
  theme: "light" | "dark";

  // Expenses / currency
  baseCurrency: Currency;
  usdToTry: number; // manual FX (no auto-fetch — stays simple & offline)
  lastUsedExpense?: LastUsedExpense;
  lastDigestSeenAt?: number;
}

/** A user-entered holding: cost basis is what they paid, lastPrice is the latest fetched quote. */
export interface StockHolding {
  id: string;
  symbol: string; // e.g. "THYAO" or "AAPL"
  market: StockMarket;
  quantity: number;
  costBasis: number; // per-share cost, in costCurrency
  costCurrency: Currency;
  purchasedAt: number;
  notes: string;
  lastPrice: number | null;
  lastPriceCurrency: Currency | null;
  lastPriceAt: number | null;
  createdAt: number;
}

/** A current price paired with the previous trading day's close, for daily P&L. */
export interface DailyQuote {
  symbol: string;
  market: StockMarket;
  current: number;
  previousClose: number;
  currency: Currency;
}

/** Local-only account record (AsyncStorage via useAuthStore). */
export interface User {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: number;
}
