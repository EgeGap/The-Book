import { Platform } from "react-native";
import { GRAMS_PER_TROY_OUNCE, toQuoteSymbol, type Currency, type StockMarket } from "./constants";
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
// Yahoo's endpoint sends no Access-Control-Allow-Origin header, so browsers
// block it directly; native RN fetch has no such restriction. Route web
// through a public CORS proxy — try a couple in turn since free proxies
// rate-limit hard under bursts (e.g. switching the chart period re-fetches
// every holding at once).
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUOTE_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches `url`, trying each CORS proxy in turn on web until one succeeds. */
async function fetchJson(url: string): Promise<any | null> {
  if (Platform.OS !== "web") {
    const res = await fetchWithTimeout(url);
    return res.ok ? res.json() : null;
  }
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy(url));
      if (res.ok) return await res.json();
    } catch {
      // try the next proxy
    }
  }
  return null;
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

/** Fetches daily quotes for every holding; symbols whose fetch fails are simply omitted. */
export async function fetchAllDailyQuotes(holdings: StockHolding[]): Promise<DailyQuote[]> {
  const out: DailyQuote[] = [];
  for (const h of holdings) {
    const quote = await fetchDailyQuote(h.symbol, h.market);
    if (quote) out.push(quote);
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
