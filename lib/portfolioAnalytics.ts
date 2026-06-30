import type { Currency } from "./constants";
import type { DailyQuote, StockHolding } from "./types";
import { convert, type FxRates } from "./expenseAnalytics";

/**
 * All portfolio math lives here as PURE functions: StockHolding[] (+ FX rates +
 * base currency) in, plain numbers/objects out. No DB, no I/O — unit-testable.
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Total cost of a holding, in its own costCurrency. */
export function holdingCostTotal(holding: StockHolding): number {
  return r2(holding.quantity * holding.costBasis);
}

/** Current market value of a holding, in lastPriceCurrency — null if no quote yet. */
export function holdingCurrentValue(holding: StockHolding): number | null {
  if (holding.lastPrice == null) return null;
  return r2(holding.quantity * holding.lastPrice);
}

/** Gain/loss percent vs cost basis — null if no quote yet. */
export function holdingGainPercent(
  holding: StockHolding,
  rates: FxRates,
  base: Currency,
): number | null {
  if (holding.lastPrice == null || holding.lastPriceCurrency == null) return null;
  const cost = convert(holdingCostTotal(holding), holding.costCurrency, rates, base);
  const value = convert(
    holding.quantity * holding.lastPrice,
    holding.lastPriceCurrency,
    rates,
    base,
  );
  if (cost === 0) return null;
  return r2(((value - cost) / cost) * 100);
}

export interface PortfolioSummary {
  totalCost: number;
  totalValue: number;
  gainAmount: number;
  gainPercent: number | null;
}

/** Aggregate cost/value/gain across all holdings, converted into the base currency. */
export function portfolioSummary(
  holdings: StockHolding[],
  rates: FxRates,
  base: Currency,
): PortfolioSummary {
  let totalCost = 0;
  let totalValue = 0;
  let hasAnyValue = false;
  for (const h of holdings) {
    totalCost += convert(holdingCostTotal(h), h.costCurrency, rates, base);
    if (h.lastPrice != null && h.lastPriceCurrency != null) {
      hasAnyValue = true;
      totalValue += convert(h.quantity * h.lastPrice, h.lastPriceCurrency, rates, base);
    }
  }
  totalCost = r2(totalCost);
  totalValue = r2(totalValue);
  const gainAmount = r2(totalValue - totalCost);
  const gainPercent = !hasAnyValue || totalCost === 0 ? null : r2((gainAmount / totalCost) * 100);
  return { totalCost, totalValue, gainAmount, gainPercent };
}

/** Portfolio profit/loss for a window: an amount (in `base`) and its percent. */
export interface ProfitResult {
  amount: number;
  percent: number | null;
}

/**
 * "Today's move": how much the portfolio gained/lost versus the previous trading day's
 * close — independent of what you paid. Sums quantity × (current − previousClose) across
 * every holding with a daily quote, converted into `base`. percent is that change over
 * the previous-close value; null when no holding has a quote (nothing to measure).
 */
export function dailyChange(
  holdings: StockHolding[],
  quotes: DailyQuote[],
  rates: FxRates,
  base: Currency,
): ProfitResult {
  let prevValue = 0;
  let curValue = 0;
  let matched = false;
  for (const h of holdings) {
    const q = quotes.find((x) => x.symbol === h.symbol && x.market === h.market);
    if (!q) continue;
    matched = true;
    prevValue += convert(h.quantity * q.previousClose, q.currency, rates, base);
    curValue += convert(h.quantity * q.current, q.currency, rates, base);
  }
  if (!matched) return { amount: 0, percent: null };
  const amount = r2(curValue - prevValue);
  const percent = prevValue === 0 ? null : r2((amount / prevValue) * 100);
  return { amount, percent };
}

/** Same "today's move" math as `dailyChange`, but for a single holding's card. */
export function holdingDailyChange(
  holding: StockHolding,
  quote: DailyQuote | undefined,
  rates: FxRates,
  base: Currency,
): ProfitResult | null {
  if (!quote) return null;
  const prevValue = convert(holding.quantity * quote.previousClose, quote.currency, rates, base);
  const curValue = convert(holding.quantity * quote.current, quote.currency, rates, base);
  const amount = r2(curValue - prevValue);
  const percent = prevValue === 0 ? null : r2((amount / prevValue) * 100);
  return { amount, percent };
}
