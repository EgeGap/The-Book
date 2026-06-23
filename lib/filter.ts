import type { Trade } from "./types";
import type { Session, TradeResult } from "./constants";

export interface TradeCriteria {
  query: string;
  result: "all" | TradeResult;
  session: "all" | Session;
  setup: "all" | string;
  period: "all" | "7" | "30" | "90";
  mistakesOnly: boolean;
}

export const DEFAULT_CRITERIA: TradeCriteria = {
  query: "",
  result: "all",
  session: "all",
  setup: "all",
  period: "all",
  mistakesOnly: false,
};

/** Pure, order-preserving filter used by the Trades screen (and testable). */
export function applyTradeFilters(trades: Trade[], c: TradeCriteria): Trade[] {
  const q = c.query.trim().toLowerCase();
  const cutoff =
    c.period === "all" ? 0 : Date.now() - Number(c.period) * 86_400_000;

  return trades.filter((t) => {
    if (cutoff && (t.closedAt ?? t.createdAt) < cutoff) return false;
    if (c.result !== "all" && t.result !== c.result) return false;
    if (c.session !== "all" && t.session !== c.session) return false;
    if (c.setup !== "all" && t.setupType !== c.setup) return false;
    if (c.mistakesOnly && t.mistakes.length === 0) return false;
    if (q) {
      const haystack =
        `${t.symbol} ${t.setupType} ${t.notes} ${t.entryReason}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function activeFilterCount(c: TradeCriteria): number {
  let n = 0;
  if (c.result !== "all") n++;
  if (c.session !== "all") n++;
  if (c.setup !== "all") n++;
  if (c.period !== "all") n++;
  if (c.mistakesOnly) n++;
  return n;
}
