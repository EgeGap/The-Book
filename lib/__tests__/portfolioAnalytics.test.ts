import {
  dailyChange,
  holdingCostTotal,
  holdingCurrentValue,
  holdingDailyChange,
  holdingGainPercent,
  portfolioSummary,
} from "../portfolioAnalytics";
import type { FxRates } from "../expenseAnalytics";
import type { DailyQuote, StockHolding } from "../types";

const rates: FxRates = { usdToTry: 40 };

let seq = 0;
function mkHolding(p: Partial<StockHolding> = {}): StockHolding {
  seq += 1;
  return {
    id: `h${seq}`,
    symbol: "AAPL",
    market: "US",
    quantity: 10,
    costBasis: 100,
    costCurrency: "USD",
    purchasedAt: 0,
    notes: "",
    lastPrice: null,
    lastPriceCurrency: null,
    lastPriceAt: null,
    createdAt: 0,
    ...p,
  };
}

describe("holdingCostTotal", () => {
  it("is quantity x costBasis", () => {
    expect(holdingCostTotal(mkHolding({ quantity: 10, costBasis: 100 }))).toBe(1000);
  });
});

describe("holdingCurrentValue", () => {
  it("is null without a quote", () => {
    expect(holdingCurrentValue(mkHolding())).toBeNull();
  });
  it("is quantity x lastPrice", () => {
    expect(holdingCurrentValue(mkHolding({ quantity: 10, lastPrice: 120 }))).toBe(1200);
  });
});

describe("holdingGainPercent", () => {
  it("is null without a quote", () => {
    expect(holdingGainPercent(mkHolding(), rates, "USD")).toBeNull();
  });
  it("computes percent gain in the same currency", () => {
    const h = mkHolding({
      quantity: 10,
      costBasis: 100,
      costCurrency: "USD",
      lastPrice: 120,
      lastPriceCurrency: "USD",
    });
    expect(holdingGainPercent(h, rates, "USD")).toBe(20);
  });
  it("converts across currencies via the FX pivot", () => {
    const h = mkHolding({
      quantity: 1,
      costBasis: 100,
      costCurrency: "USD", // 100 USD = 4000 TRY
      lastPrice: 110,
      lastPriceCurrency: "USD", // 110 USD = 4400 TRY
    });
    expect(holdingGainPercent(h, rates, "TRY")).toBe(10);
  });
});

describe("portfolioSummary", () => {
  it("aggregates cost and value across holdings, base currency", () => {
    const list = [
      mkHolding({ quantity: 10, costBasis: 100, costCurrency: "USD", lastPrice: 120, lastPriceCurrency: "USD" }),
      mkHolding({ quantity: 5, costBasis: 50, costCurrency: "TRY", lastPrice: null, lastPriceCurrency: null }),
    ];
    const summary = portfolioSummary(list, rates, "TRY");
    // holding 1: cost 1000 USD = 40000 TRY, value 1200 USD = 48000 TRY
    // holding 2: cost 250 TRY, no quote -> excluded from totalValue
    expect(summary.totalCost).toBe(40250);
    expect(summary.totalValue).toBe(48000);
    expect(summary.gainAmount).toBe(7750);
  });
  it("gainPercent is null when no holding has a quote yet", () => {
    const list = [mkHolding({ lastPrice: null })];
    expect(portfolioSummary(list, rates, "USD").gainPercent).toBeNull();
  });
});

describe("dailyChange", () => {
  it("is null when no holding has a quote", () => {
    const list = [mkHolding({ symbol: "AAPL", market: "US" })];
    const quotes: DailyQuote[] = [{ symbol: "MSFT", market: "US", current: 5, previousClose: 4, currency: "USD" }];
    expect(dailyChange(list, quotes, rates, "USD")).toEqual({ amount: 0, percent: null });
  });

  it("measures today's move versus the previous close, not cost basis", () => {
    // cost basis is 4, but the daily move only compares current (98) to prev close (100).
    const list = [mkHolding({ symbol: "AAPL", market: "US", quantity: 2, costBasis: 4, costCurrency: "USD" })];
    const quotes: DailyQuote[] = [
      { symbol: "AAPL", market: "US", current: 98, previousClose: 100, currency: "USD" },
    ];
    // prev value = 2*100 = 200, cur value = 2*98 = 196 -> -4 USD, -2%
    expect(dailyChange(list, quotes, rates, "USD")).toEqual({ amount: -4, percent: -2 });
  });

  it("aggregates a mixed up/down portfolio into a net daily loss, converting to base", () => {
    const list = [
      mkHolding({ symbol: "AAPL", market: "US", quantity: 1, costBasis: 50, costCurrency: "USD" }),
      mkHolding({ symbol: "GARAN", market: "BIST", quantity: 100, costBasis: 120, costCurrency: "TRY" }),
    ];
    const quotes: DailyQuote[] = [
      { symbol: "AAPL", market: "US", current: 102, previousClose: 100, currency: "USD" }, // +2 USD = +80 TRY
      { symbol: "GARAN", market: "BIST", current: 126, previousClose: 130, currency: "TRY" }, // -4*100 = -400 TRY
    ];
    // prev (TRY): 100*40 + 130*100 = 4000 + 13000 = 17000; cur: 102*40 + 126*100 = 4080 + 12600 = 16680
    // amount = -320 TRY; percent = -320/17000*100 = -1.88
    expect(dailyChange(list, quotes, rates, "TRY")).toEqual({ amount: -320, percent: -1.88 });
  });
});

describe("holdingDailyChange", () => {
  it("is null without a matching quote", () => {
    const h = mkHolding({ symbol: "AAPL", market: "US" });
    expect(holdingDailyChange(h, undefined, rates, "USD")).toBeNull();
  });

  it("measures a single holding's move versus its previous close", () => {
    const h = mkHolding({ symbol: "AAPL", market: "US", quantity: 3, costBasis: 1, costCurrency: "USD" });
    const q: DailyQuote = { symbol: "AAPL", market: "US", current: 110, previousClose: 100, currency: "USD" };
    // prev = 300, cur = 330 -> +30 USD, +10%
    expect(holdingDailyChange(h, q, rates, "USD")).toEqual({ amount: 30, percent: 10 });
  });
});
