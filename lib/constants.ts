/**
 * Single source of truth for the ICT / SMC domain vocabulary.
 * Keep these literal strings stable — analytics group on them.
 */

export const SETUP_TYPES = [
  "Range Play (Premium/Discount reaction)",
  "OTE (Optimal Trade Entry)",
  "Order Block (OB)",
  "Fair Value Gap (FVG)",
  "Breaker Block",
  "Mitigation Block",
  "Liquidity Sweep / Grab",
  "Turtle Soup",
  "HTF FVG Continuation",
  "Other",
] as const;
export type SetupType = (typeof SETUP_TYPES)[number];

export const CONFLUENCES = [
  "HTF bias aligned",
  "Liquidity swept before entry",
  "Institutional / round number level",
  "Imbalance (FVG) present",
  "Premium/Discount alignment",
  "Equilibrium reaction",
  "Previous session High/Low",
  "Confirmation candle (CHoCH/BOS)",
  "Killzone timing",
] as const;
export type Confluence = (typeof CONFLUENCES)[number];

export const MISTAKE_TAGS = [
  "FOMO entry (no setup)",
  "Moved stop loss",
  "No confirmation",
  "Over-risked (above plan)",
  "Revenge trade",
  "Entered against HTF bias",
  "Closed early / cut winner",
  "Held loser past stop",
  "Traded outside killzone",
] as const;
export type MistakeTag = (typeof MISTAKE_TAGS)[number];

export const SESSIONS = ["asia", "london", "ny_am", "ny_pm", "other"] as const;
export type Session = (typeof SESSIONS)[number];

export const ZONES = ["premium", "discount", "equilibrium"] as const;
export type Zone = (typeof ZONES)[number];

export const HTF_BIASES = ["bullish", "bearish", "neutral"] as const;
export type HtfBias = (typeof HTF_BIASES)[number];

export const DIRECTIONS = ["long", "short"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const TRADE_STATUSES = ["planned", "open", "closed"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const RESULTS = ["win", "loss", "breakeven"] as const;
export type TradeResult = (typeof RESULTS)[number];

export const TIMEFRAMES = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1H",
  "4H",
  "1D",
  "1W",
] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** Result colors used consistently across the whole app. */
export const RESULT_COLORS = {
  win: "#16C784",
  loss: "#EA3943",
  breakeven: "#9AA0A6",
  neutral: "#7C5CFC",
} as const;

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

export const CURRENCIES = ["TRY", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export const EXPENSE_CYCLES = ["monthly", "yearly"] as const;
export type ExpenseCycle = (typeof EXPENSE_CYCLES)[number];

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
