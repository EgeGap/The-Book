import type {
  Confluence,
  Currency,
  Direction,
  ExpenseCategory,
  ExpenseCycle,
  HtfBias,
  MistakeTag,
  Session,
  SetupType,
  TradeResult,
  TradeStatus,
  Zone,
} from "./constants";

/**
 * The core Trade record. Timestamps are stored as epoch-millis numbers so the
 * value round-trips cleanly through SQLite and JSON export without timezone drift.
 */
export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  status: TradeStatus;

  // Context
  session: Session;
  htfBias: HtfBias;
  biasTimeframe: string; // e.g. "4H", "1D"
  entryTimeframe: string; // e.g. "5m", "15m"

  // Setup (the ICT/SMC core)
  setupType: SetupType;
  confluences: Confluence[];
  zone: Zone;

  // Numbers
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  plannedRR: number;
  realizedRR: number | null;
  pnl: number | null; // account currency
  result: TradeResult | null;
  exitPrice: number | null;

  // Reflection
  entryReason: string;
  mistakes: MistakeTag[];
  notes: string;
  screenshots: string[]; // local file URIs (before / after)

  createdAt: number;
  closedAt: number | null;
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
}

/** Defaults pre-filled on the New Expense form from the last saved expense. */
export interface LastUsedExpense {
  currency: Currency;
  category: ExpenseCategory;
}

/** Fields pre-filled on the New Trade form from the user's most recent trade. */
export interface LastUsed {
  symbol: string;
  riskPercent: number;
  biasTimeframe: string;
  entryTimeframe: string;
  htfBias: HtfBias;
}

/** Persisted user preferences (AsyncStorage via useSettingsStore). */
export interface Settings {
  defaultRiskPercent: number;
  maxRiskPercent: number;
  startingBalance: number;
  theme: "light" | "dark";
  customSetups: string[];
  customConfluences: string[];
  /** Defaults remembered from the last saved trade (A2). */
  lastUsed?: LastUsed;

  // Expenses / currency
  baseCurrency: Currency;
  usdToTry: number; // manual FX (no auto-fetch — stays simple & offline)
  eurToTry: number;
  lastUsedExpense?: LastUsedExpense;

  /**
   * Optional Financial Modeling Prep API key for hard fundamentals on stock
   * analysis. Stored locally only (same trust model as the rest of this
   * local-first app — never sent anywhere but financialmodelingprep.com).
   */
  financialApiKey?: string;
}

/** Local-only account record (AsyncStorage via useAuthStore). */
export interface User {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: number;
}

// ── Stock analysis ───────────────────────────────────────────────────────────

export type StockVerdict = "ucuz" | "makul" | "pahalı";
export type NewsImpact = "olumlu" | "olumsuz" | "nötr";
export type AnalysisConfidence = "düşük" | "orta" | "yüksek";

/** A bear/base/bull scenario for one time horizon. False precision is banned. */
export interface ScenarioOutlook {
  bear: string;
  base: string;
  bull: string;
  baseProbability: string;
}

/**
 * The full grounded financial report for one ticker. Every hard figure must
 * trace to fetched data (web search and/or the optional fundamentals API) —
 * fields the model couldn't find are `null` and listed in `dataGaps`, never
 * guessed.
 */
export interface StockReport {
  ticker: string;
  companyName: string;
  market: string;
  currency: string;
  currentPrice: number | null;
  marketCap: string | null;
  asOfDate: string;
  summary: string;

  fundamentals: {
    revenue: string | null;
    netIncome: string | null;
    profitMargin: string | null;
    peRatio: number | null;
    pbRatio: number | null;
    debtToEquity: string | null;
    revenueGrowthYoY: string | null;
    note: string;
  };

  sector: {
    name: string;
    positioning: string;
    competitors: string[];
  };

  recentNews: {
    date: string;
    headline: string;
    impact: NewsImpact;
  }[];

  strengths: string[];
  risks: string[];

  valuation: {
    verdict: StockVerdict;
    reasoning: string;
    fairValueRange: string | null;
  };

  outlook: {
    short: ScenarioOutlook;
    medium: ScenarioOutlook;
    long: ScenarioOutlook;
  };

  sources: { title: string; url: string }[];

  confidence: AnalysisConfidence;
  dataGaps: string[];
}

/** Cached report for one ticker, persisted locally (no Firestore — local-first). */
export interface StockAnalysisRecord {
  ticker: string;
  report: StockReport;
  updatedAt: number;
}
