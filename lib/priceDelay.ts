import { getDelayedPrice, insertPriceSnapshot } from "./db";
import type { Currency, StockMarket } from "./constants";

/**
 * BIST data is deliberately shown 15 minutes stale — a compliance choice, not
 * a source-freshness one. Every live-fetched BIST price (from either the
 * "Tümü" refresh or the "Günlük" daily-quote fetch) is logged to
 * `price_snapshots`, and both call sites look up the snapshot from this long
 * ago instead of using what they just fetched. Non-BIST markets pass through
 * untouched.
 */
export const BIST_DISPLAY_DELAY_MS = 15 * 60 * 1000;
export const PRICE_SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

export interface ResolvedPrice {
  price: number;
  currency: Currency;
  fetchedAt: number;
}

export async function applyBistDelay(
  market: StockMarket,
  symbol: string,
  price: number,
  currency: Currency,
  fetchedAt: number,
): Promise<ResolvedPrice> {
  if (market !== "BIST") return { price, currency, fetchedAt };
  await insertPriceSnapshot(symbol, market, price, currency, fetchedAt);
  const delayed = await getDelayedPrice(symbol, market, Date.now() - BIST_DISPLAY_DELAY_MS);
  return delayed ?? { price, currency, fetchedAt };
}
