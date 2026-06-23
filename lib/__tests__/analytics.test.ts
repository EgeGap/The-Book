import {
  bestAndWorstSetup,
  buildEquityCurve,
  cleanVsMistake,
  closedTrades,
  computeDashboardStats,
  currentStreak,
  dailyPnL,
  mistakeStats,
  statsBySetup,
  summarize,
} from "../analytics";
import type { Trade } from "../types";

let seq = 0;
function mk(p: Partial<Trade> = {}): Trade {
  seq += 1;
  return {
    id: `t${seq}`,
    symbol: "BTCUSDT",
    direction: "long",
    status: "closed",
    session: "ny_am",
    htfBias: "bullish",
    biasTimeframe: "4H",
    entryTimeframe: "5m",
    setupType: "Order Block (OB)",
    confluences: ["HTF bias aligned"],
    zone: "discount",
    entry: 100,
    stopLoss: 90,
    takeProfit: 130,
    riskPercent: 1,
    plannedRR: 3,
    realizedRR: 2,
    pnl: 200,
    result: "win",
    exitPrice: 120,
    entryReason: "Clean OB tap after sweep",
    mistakes: [],
    notes: "",
    screenshots: [],
    createdAt: 1_700_000_000_000 + seq * 86_400_000,
    closedAt: 1_700_000_000_000 + seq * 86_400_000 + 3_600_000,
    ...p,
  };
}

describe("closedTrades", () => {
  it("excludes planned/open and result-less trades", () => {
    const trades = [
      mk(),
      mk({ status: "open", result: null, realizedRR: null }),
      mk({ status: "planned", result: null, realizedRR: null }),
    ];
    expect(closedTrades(trades)).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("computes win rate over decided trades only (BE excluded)", () => {
    const s = summarize("x", [
      mk({ result: "win", realizedRR: 2 }),
      mk({ result: "loss", realizedRR: -1 }),
      mk({ result: "breakeven", realizedRR: 0 }),
    ]);
    expect(s.count).toBe(3);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBe(50); // 1 win / (1 win + 1 loss)
    expect(s.totalR).toBe(1);
  });

  it("never divides by zero", () => {
    const s = summarize("empty", []);
    expect(s.winRate).toBe(0);
    expect(s.avgR).toBe(0);
  });
});

describe("computeDashboardStats", () => {
  it("derives expectancy, total R and profit factor", () => {
    const trades = [
      mk({ result: "win", realizedRR: 2, pnl: 200 }),
      mk({ result: "win", realizedRR: 1, pnl: 100 }),
      mk({ result: "loss", realizedRR: -1, pnl: -100 }),
    ];
    const s = computeDashboardStats(trades);
    expect(s.closedCount).toBe(3);
    expect(s.totalR).toBe(2);
    expect(s.expectancy).toBeCloseTo(0.67, 2);
    expect(s.winRate).toBeCloseTo(66.67, 1);
    expect(s.profitFactor).toBe(3); // (2+1) / 1
    expect(s.bestR).toBe(2);
    expect(s.worstR).toBe(-1);
  });

  it("returns null profit factor with no losses", () => {
    expect(computeDashboardStats([mk({ realizedRR: 2 })]).profitFactor).toBeNull();
  });
});

describe("currentStreak", () => {
  it("counts the most-recent consecutive run", () => {
    const trades = [
      mk({ result: "loss", realizedRR: -1, closedAt: 1 }),
      mk({ result: "win", realizedRR: 2, closedAt: 2 }),
      mk({ result: "win", realizedRR: 1, closedAt: 3 }),
    ];
    expect(currentStreak(closedTrades(trades))).toEqual({ type: "win", count: 2 });
  });
});

describe("buildEquityCurve", () => {
  it("accumulates R from a zero baseline in chronological order", () => {
    const trades = [
      mk({ realizedRR: 2, closedAt: 30 }),
      mk({ realizedRR: -1, closedAt: 10 }),
      mk({ realizedRR: 3, closedAt: 20 }),
    ];
    const pts = buildEquityCurve(trades);
    expect(pts.map((p) => p.cumR)).toEqual([0, -1, 2, 4]);
  });
});

describe("statsBySetup", () => {
  it("sorts best-to-worst by total R", () => {
    const trades = [
      mk({ setupType: "Turtle Soup", result: "loss", realizedRR: -2 }),
      mk({ setupType: "OTE (Optimal Trade Entry)", result: "win", realizedRR: 3 }),
    ];
    const rows = statsBySetup(trades);
    expect(rows[0].key).toBe("OTE (Optimal Trade Entry)");
    expect(rows[rows.length - 1].key).toBe("Turtle Soup");
  });
});

describe("mistakeStats", () => {
  it("ranks by frequency and sums only negative R into rLost", () => {
    const trades = [
      mk({ mistakes: ["Revenge trade"], result: "loss", realizedRR: -1 }),
      mk({ mistakes: ["Revenge trade"], result: "win", realizedRR: 2 }),
      mk({ mistakes: ["Moved stop loss"], result: "loss", realizedRR: -3 }),
    ];
    const rows = mistakeStats(trades);
    expect(rows[0].key).toBe("Revenge trade");
    expect(rows[0].count).toBe(2);
    expect(rows[0].rLost).toBe(-1); // only the losing leg counts toward damage
    expect(rows[0].totalR).toBe(1); // -1 + 2
  });
});

describe("cleanVsMistake", () => {
  it("separates clean execution from flagged trades", () => {
    const trades = [
      mk({ mistakes: [], realizedRR: 2, result: "win" }),
      mk({ mistakes: ["FOMO entry (no setup)"], realizedRR: -1, result: "loss" }),
    ];
    const cmp = cleanVsMistake(trades);
    expect(cmp.clean.count).toBe(1);
    expect(cmp.clean.avgR).toBe(2);
    expect(cmp.withMistakes.count).toBe(1);
    expect(cmp.withMistakes.avgR).toBe(-1);
  });
});

describe("bestAndWorstSetup", () => {
  it("returns nulls when no closed trades", () => {
    expect(bestAndWorstSetup([])).toEqual({ best: null, worst: null });
  });
});

describe("dailyPnL", () => {
  it("aggregates R and P&L per calendar day", () => {
    const day = new Date("2024-03-01T12:00:00Z").getTime();
    const trades = [
      mk({ closedAt: day, realizedRR: 2, pnl: 200, result: "win" }),
      mk({ closedAt: day + 3_600_000, realizedRR: -1, pnl: -100, result: "loss" }),
    ];
    const map = dailyPnL(trades);
    const key = Object.keys(map)[0];
    expect(map[key].count).toBe(2);
    expect(map[key].r).toBe(1);
    expect(map[key].pnl).toBe(100);
    expect(map[key].wins).toBe(1);
    expect(map[key].losses).toBe(1);
  });
});
