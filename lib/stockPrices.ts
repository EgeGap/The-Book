import { Platform } from "react-native";
import { GRAMS_PER_TROY_OUNCE, toQuoteSymbol, type Currency, type StockMarket } from "./constants";
import { applyBistDelay } from "./priceDelay";
import type { DailyQuote, StockHolding } from "./types";

/**
 * Best-effort live quote fetching via Yahoo Finance's public chart endpoint.
 * It's unofficial (no docs, no SLA, no key) but free and covers BIST + US
 * symbols with the same .IS suffix convention. Every export here swallows
 * errors and returns null/unchanged data — Yahoo going down or rate-limiting
 * must never break the portfolio screen, since cost-basis tracking is still
 * useful without quotes.
 */

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const QUOTE_REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Yahoo's unofficial endpoint rate-limits by IP with a bare 429 and no
// Retry-After header. A short exponential backoff smooths over transient
// limiting (e.g. a burst refresh across many holdings) without hammering it.
const RATE_LIMIT_RETRY_DELAYS_MS = [1000, 2500];

// If Yahoo is still 429-ing after the retries above, the IP is very likely
// under a longer temporary ban (these have lasted well past a minute in
// practice). Retrying every minute from the portfolio auto-refresh would just
// keep the ban alive — back off entirely for a cooldown window instead, and
// let requests through again once it elapses.
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
let rateLimitedUntil = 0;

/**
 * Fetches `url`. Native RN fetch talks to Yahoo directly (no CORS there).
 * On web, browsers block Yahoo directly (no Access-Control-Allow-Origin), so
 * we route through the local `scripts/cors-proxy.js` sidecar (started
 * alongside Metro by `npm run web`) — same-machine, CORS-permissive, and
 * fetches Yahoo server-side where CORS doesn't apply.
 */
async function fetchJson(url: string): Promise<any | null> {
  if (Date.now() < rateLimitedUntil) return null; // cooling down — don't hit Yahoo at all

  const target =
    Platform.OS === "web" ? `http://localhost:8788/proxy?url=${encodeURIComponent(url)}` : url;
  try {
    for (const delay of [0, ...RATE_LIMIT_RETRY_DELAYS_MS]) {
      if (delay > 0) await sleep(delay);
      const res = await fetchWithTimeout(target);
      if (res.status === 429) continue; // rate-limited — back off and retry
      rateLimitedUntil = 0; // got a real response — any earlier ban has lifted
      return res.ok ? res.json() : null;
    }
    rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    return null;
  } catch {
    return null;
  }
}

export interface Quote {
  price: number;
  currency: Currency;
}

export async function fetchQuote(symbol: string, market: StockMarket): Promise<Quote | null> {
  try {
    const quoteSymbol = toQuoteSymbol(symbol, market);
    const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(quoteSymbol)}`;
    const data = await fetchJson(url);
    if (!data) return null;
    const meta = data?.chart?.result?.[0]?.meta;
    const rawPrice = meta?.regularMarketPrice;
    if (typeof rawPrice !== "number" || !Number.isFinite(rawPrice)) return null;
    const currency: Currency =
      meta?.currency === "TRY" || meta?.currency === "USD"
        ? meta.currency
        : market === "BIST" ? "TRY" : "USD";
    // GC=F/SI=F report USD per troy ounce; the app tracks commodity holdings in grams.
    const price = market === "EMTIA" ? rawPrice / GRAMS_PER_TROY_OUNCE : rawPrice;
    return { price, currency };
  } catch {
    return null;
  }
}

/** Best-effort current price + previous close for one symbol (for "today's move"). */
export async function fetchDailyQuote(symbol: string, market: StockMarket): Promise<DailyQuote | null> {
  try {
    const quoteSymbol = toQuoteSymbol(symbol, market);
    const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(quoteSymbol)}?range=1d&interval=1d`;
    const data = await fetchJson(url);
    if (!data) return null;
    const meta = data?.chart?.result?.[0]?.meta;
    const rawCurrent = meta?.regularMarketPrice;
    const rawPrev = meta?.previousClose ?? meta?.chartPreviousClose;
    if (typeof rawCurrent !== "number" || !Number.isFinite(rawCurrent)) return null;
    if (typeof rawPrev !== "number" || !Number.isFinite(rawPrev)) return null;
    const currency: Currency =
      meta?.currency === "TRY" || meta?.currency === "USD"
        ? meta.currency
        : market === "BIST" ? "TRY" : "USD";
    // GC=F/SI=F quote USD per troy ounce; commodity holdings are tracked in grams.
    const divisor = market === "EMTIA" ? GRAMS_PER_TROY_OUNCE : 1;
    return { symbol, market, current: rawCurrent / divisor, previousClose: rawPrev / divisor, currency };
  } catch {
    return null;
  }
}

/**
 * Fetches daily quotes for every holding; symbols whose fetch fails are simply
 * omitted. BIST's `current` is resolved through the same 15-min display delay
 * as the main refresh path; `previousClose` is yesterday's close and doesn't
 * need delaying.
 */
export async function fetchAllDailyQuotes(holdings: StockHolding[]): Promise<DailyQuote[]> {
  const out: DailyQuote[] = [];
  for (const h of holdings) {
    const quote = await fetchDailyQuote(h.symbol, h.market);
    if (!quote) continue;
    const resolved = await applyBistDelay(quote.market, quote.symbol, quote.current, quote.currency, Date.now());
    out.push({ ...quote, current: resolved.price, currency: resolved.currency });
  }
  return out;
}

export interface QuoteRefreshResult {
  holdings: StockHolding[];
  updatedCount: number;
}

/** Refreshes quotes for all holdings; holdings whose fetch fails keep their last known price. */
export async function refreshAllQuotes(holdings: StockHolding[]): Promise<QuoteRefreshResult> {
  const out: StockHolding[] = [];
  let updatedCount = 0;
  for (const holding of holdings) {
    const quote = await fetchQuote(holding.symbol, holding.market);
    if (quote) updatedCount += 1;
    out.push(
      quote
        ? {
            ...holding,
            lastPrice: quote.price,
            lastPriceCurrency: quote.currency,
            lastPriceAt: Date.now(),
          }
        : holding,
    );
  }
  return { holdings: out, updatedCount };
}
