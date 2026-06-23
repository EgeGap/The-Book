import { format } from "date-fns";
import type { MistakeTag } from "./constants";
import type { Trade } from "./types";

/**
 * Every function here is PURE: it takes Trade[] (or a slice) and returns a
 * plain computed object. No DB, no I/O — so they are trivially unit-testable.
 */

export interface BucketStat {
  key: string;
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number; // 0..100, computed over decided (win+loss) trades
  totalR: number;
  avgR: number;
  totalPnl: number;
}

export interface DashboardStats {
  totalTrades: number;
  closedCount: number;
  openCount: number;
  plannedCount: number;
  winRate: number;
  totalR: number;
  expectancy: number; // avg R per closed trade
  totalPnl: number;
  streak: { type: "win" | "loss" | "none"; count: number };
  profitFactor: number | null; // null == no losses yet
  bestR: number;
  worstR: number;
}

export interface EquityPoint {
  index: number;
  cumR: number;
  cumPnl: number;
  date: number;
  r: number;
}

export interface MistakeStat {
  key: MistakeTag;
  count: number;
  totalR: number;
  rLost: number; // sum of negative R only (<= 0)
  winRate: number;
}

export interface DayStat {
  dateKey: string; // yyyy-MM-dd
  r: number;
  pnl: number;
  count: number;
  wins: number;
  losses: number;
}

export interface CleanVsMistake {
  clean: BucketStat;
  withMistakes: BucketStat;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Trades that are fully resolved and contribute to performance stats. */
export function closedTrades(trades: Trade[]): Trade[] {
  return trades.filter(
    (t) => t.status === "closed" && t.result != null && t.realizedRR != null,
  );
}

/** Chronological order by close time (fallback creation time). */
function byCloseAsc(a: Trade, b: Trade): number {
  return (a.closedAt ?? a.createdAt) - (b.closedAt ?? b.createdAt);
}

/** Core reducer used by every grouped view. */
export function summarize(key: string, trades: Trade[]): BucketStat {
  let wins = 0,
    losses = 0,
    breakeven = 0,
    totalR = 0,
    totalPnl = 0;
  for (const t of trades) {
    const r = t.realizedRR ?? 0;
    totalR += r;
    totalPnl += t.pnl ?? 0;
    if (t.result === "win") wins++;
    else if (t.result === "loss") losses++;
    else if (t.result === "breakeven") breakeven++;
  }
  const decided = wins + losses;
  const count = trades.length;
  return {
    key,
    count,
    wins,
    losses,
    breakeven,
    winRate: decided > 0 ? r2((wins / decided) * 100) : 0,
    totalR: r2(totalR),
    avgR: count > 0 ? r2(totalR / count) : 0,
    totalPnl: r2(totalPnl),
  };
}

export function computeDashboardStats(trades: Trade[]): DashboardStats {
  const closed = closedTrades(trades);
  const base = summarize("all", closed);
  const grossProfit = closed
    .filter((t) => (t.realizedRR ?? 0) > 0)
    .reduce((s, t) => s + (t.realizedRR ?? 0), 0);
  const grossLoss = Math.abs(
    closed
      .filter((t) => (t.realizedRR ?? 0) < 0)
      .reduce((s, t) => s + (t.realizedRR ?? 0), 0),
  );
  const rValues = closed.map((t) => t.realizedRR ?? 0);

  return {
    totalTrades: trades.length,
    closedCount: closed.length,
    openCount: trades.filter((t) => t.status === "open").length,
    plannedCount: trades.filter((t) => t.status === "planned").length,
    winRate: base.winRate,
    totalR: base.totalR,
    expectancy: base.avgR,
    totalPnl: base.totalPnl,
    streak: currentStreak(closed),
    profitFactor: grossLoss > 0 ? r2(grossProfit / grossLoss) : null,
    bestR: rValues.length ? r2(Math.max(...rValues)) : 0,
    worstR: rValues.length ? r2(Math.min(...rValues)) : 0,
  };
}

/** Consecutive same-result run from the most recent closed trade. BE breaks it. */
export function currentStreak(
  closed: Trade[],
): { type: "win" | "loss" | "none"; count: number } {
  const ordered = [...closed].sort(byCloseAsc).reverse();
  let type: "win" | "loss" | "none" = "none";
  let count = 0;
  for (const t of ordered) {
    if (t.result !== "win" && t.result !== "loss") break;
    if (type === "none") {
      type = t.result;
      count = 1;
    } else if (t.result === type) {
      count++;
    } else {
      break;
    }
  }
  return { type, count };
}

/** Cumulative R (and P&L) over time, oldest -> newest, with a 0 baseline. */
export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  const ordered = closedTrades(trades).sort(byCloseAsc);
  const points: EquityPoint[] = [
    { index: 0, cumR: 0, cumPnl: 0, date: ordered[0]?.closedAt ?? 0, r: 0 },
  ];
  let cumR = 0;
  let cumPnl = 0;
  ordered.forEach((t, i) => {
    cumR = r2(cumR + (t.realizedRR ?? 0));
    cumPnl = r2(cumPnl + (t.pnl ?? 0));
    points.push({
      index: i + 1,
      cumR,
      cumPnl,
      date: t.closedAt ?? t.createdAt,
      r: t.realizedRR ?? 0,
    });
  });
  return points;
}

function groupBy(
  closed: Trade[],
  pick: (t: Trade) => string,
): BucketStat[] {
  const map = new Map<string, Trade[]>();
  for (const t of closed) {
    const k = pick(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()].map(([k, ts]) => summarize(k, ts));
}

/** Best-to-worst by total R — the headline "which setups make money" view. */
export function statsBySetup(trades: Trade[]): BucketStat[] {
  return groupBy(closedTrades(trades), (t) => t.setupType).sort(
    (a, b) => b.totalR - a.totalR,
  );
}

export function statsBySession(trades: Trade[]): BucketStat[] {
  return groupBy(closedTrades(trades), (t) => t.session).sort(
    (a, b) => b.winRate - a.winRate,
  );
}

/** Confluence is multi-select, so a trade contributes to several buckets. */
export function statsByConfluence(trades: Trade[]): BucketStat[] {
  const closed = closedTrades(trades);
  const map = new Map<string, Trade[]>();
  for (const t of closed) {
    for (const c of t.confluences) {
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(t);
    }
  }
  return [...map.entries()]
    .map(([k, ts]) => summarize(k, ts))
    .sort((a, b) => b.winRate - a.winRate);
}

/** Ranked by frequency; rLost is the R bled on trades carrying the mistake. */
export function mistakeStats(trades: Trade[]): MistakeStat[] {
  const closed = closedTrades(trades);
  const map = new Map<MistakeTag, Trade[]>();
  for (const t of closed) {
    for (const m of t.mistakes) {
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(t);
    }
  }
  return [...map.entries()]
    .map(([key, ts]) => {
      const s = summarize(key, ts);
      const rLost = r2(
        ts
          .filter((t) => (t.realizedRR ?? 0) < 0)
          .reduce((sum, t) => sum + (t.realizedRR ?? 0), 0),
      );
      return { key, count: ts.length, totalR: s.totalR, rLost, winRate: s.winRate };
    })
    .sort((a, b) => b.count - a.count);
}

/** Side-by-side: did clean execution actually pay better? */
export function cleanVsMistake(trades: Trade[]): CleanVsMistake {
  const closed = closedTrades(trades);
  return {
    clean: summarize("clean", closed.filter((t) => t.mistakes.length === 0)),
    withMistakes: summarize(
      "mistakes",
      closed.filter((t) => t.mistakes.length > 0),
    ),
  };
}

/** Best/worst setup with at least `minSample` closed trades. */
export function bestAndWorstSetup(
  trades: Trade[],
  minSample = 1,
): { best: BucketStat | null; worst: BucketStat | null } {
  const eligible = statsBySetup(trades).filter((s) => s.count >= minSample);
  if (eligible.length === 0) return { best: null, worst: null };
  return { best: eligible[0], worst: eligible[eligible.length - 1] };
}

/** Per-day aggregates keyed yyyy-MM-dd, for the calendar heatmap. */
export function dailyPnL(trades: Trade[]): Record<string, DayStat> {
  const out: Record<string, DayStat> = {};
  for (const t of closedTrades(trades)) {
    const dateKey = format(new Date(t.closedAt ?? t.createdAt), "yyyy-MM-dd");
    const day =
      out[dateKey] ??
      (out[dateKey] = { dateKey, r: 0, pnl: 0, count: 0, wins: 0, losses: 0 });
    day.r = r2(day.r + (t.realizedRR ?? 0));
    day.pnl = r2(day.pnl + (t.pnl ?? 0));
    day.count++;
    if (t.result === "win") day.wins++;
    else if (t.result === "loss") day.losses++;
  }
  return out;
}
