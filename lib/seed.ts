import { bulkInsert, countTrades } from "./db";
import {
  plannedRR as calcPlannedRR,
  realizedRR as calcRealizedRR,
  pnlFromR,
} from "./rr";
import { uid } from "./utils";
import type { Trade } from "./types";
import type {
  Confluence,
  Direction,
  HtfBias,
  MistakeTag,
  Session,
  SetupType,
  TradeResult,
  TradeStatus,
  Zone,
} from "./constants";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const START_BALANCE = 10_000;

interface RawSeed {
  symbol: string;
  direction: Direction;
  status: TradeStatus;
  session: Session;
  htfBias: HtfBias;
  biasTimeframe: string;
  entryTimeframe: string;
  setupType: SetupType;
  confluences: Confluence[];
  zone: Zone;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  exitPrice: number | null;
  result: TradeResult | null;
  mistakes: MistakeTag[];
  entryReason: string;
  notes: string;
  daysAgo: number;
}

const RAW: RawSeed[] = [
  {
    symbol: "BTCUSDT", direction: "long", status: "open", session: "ny_am",
    htfBias: "bullish", biasTimeframe: "4H", entryTimeframe: "15m",
    setupType: "Order Block (OB)", zone: "discount",
    confluences: ["HTF bias aligned", "Liquidity swept before entry", "Killzone timing"],
    entry: 62000, stopLoss: 61200, takeProfit: 64000, riskPercent: 1,
    exitPrice: null, result: null, mistakes: [],
    entryReason: "4H yükseliş, NY killzone'da Asya dibini süpürüp discount OB'ye girdim.",
    notes: "Runner hâlâ açık, 15m yapının altından trail ediyorum.", daysAgo: 0,
  },
  {
    symbol: "XAUUSD", direction: "long", status: "closed", session: "ny_am",
    htfBias: "bullish", biasTimeframe: "1D", entryTimeframe: "5m",
    setupType: "OTE (Optimal Trade Entry)", zone: "discount",
    confluences: ["HTF bias aligned", "Imbalance (FVG) present", "Premium/Discount alignment"],
    entry: 2330, stopLoss: 2326, takeProfit: 2342, riskPercent: 1,
    exitPrice: 2342, result: "win", mistakes: [],
    entryReason: "Günlük yükseliş, altında FVG ile 0.705 OTE bölgesine geri çekiliş.",
    notes: "Ders kitabı OTE, hedefe tam ulaştı.", daysAgo: 2,
  },
  {
    symbol: "EURUSD", direction: "short", status: "closed", session: "london",
    htfBias: "bearish", biasTimeframe: "4H", entryTimeframe: "5m",
    setupType: "Fair Value Gap (FVG)", zone: "premium",
    confluences: ["HTF bias aligned", "Killzone timing"],
    entry: 1.085, stopLoss: 1.088, takeProfit: 1.079, riskPercent: 1,
    exitPrice: 1.088, result: "loss", mistakes: ["No confirmation"],
    entryReason: "Premium bölgede 5m FVG'den sattım.",
    notes: "CHoCH onayı almadan girdim, stop oldu.", daysAgo: 4,
  },
  {
    symbol: "BTCUSDT", direction: "short", status: "closed", session: "ny_pm",
    htfBias: "bearish", biasTimeframe: "4H", entryTimeframe: "15m",
    setupType: "Liquidity Sweep / Grab", zone: "premium",
    confluences: ["Liquidity swept before entry", "Previous session High/Low", "Confirmation candle (CHoCH/BOS)"],
    entry: 65000, stopLoss: 65600, takeProfit: 63000, riskPercent: 1.5,
    exitPrice: 63920, result: "win", mistakes: [],
    entryReason: "PM seans tepesini süpürdü, ardından aşağı CHoCH.",
    notes: "HTF imbalance içinde 1.8R'de kapattım.", daysAgo: 6,
  },
  {
    symbol: "NAS100", direction: "long", status: "closed", session: "ny_am",
    htfBias: "bullish", biasTimeframe: "1H", entryTimeframe: "5m",
    setupType: "Breaker Block", zone: "equilibrium",
    confluences: ["Equilibrium reaction"],
    entry: 18250, stopLoss: 18200, takeProfit: 18400, riskPercent: 2,
    exitPrice: 18200, result: "loss", mistakes: ["Moved stop loss", "Revenge trade"],
    entryReason: "Equilibrium'da breaker retesti.",
    notes: "EURUSD kaybının ardından intikam, stop'u genişlettim. Berbat.", daysAgo: 8,
  },
  {
    symbol: "EURUSD", direction: "long", status: "closed", session: "london",
    htfBias: "bullish", biasTimeframe: "4H", entryTimeframe: "15m",
    setupType: "Range Play (Premium/Discount reaction)", zone: "discount",
    confluences: ["Premium/Discount alignment", "Institutional / round number level"],
    entry: 1.08, stopLoss: 1.078, takeProfit: 1.085, riskPercent: 1,
    exitPrice: 1.0824, result: "win", mistakes: [],
    entryReason: "1.0800 yuvarlak seviyeden range dibi discount reaksiyonu.",
    notes: "Kısmi kâr aldım, +1.2R.", daysAgo: 11,
  },
  {
    symbol: "XAUUSD", direction: "short", status: "closed", session: "asia",
    htfBias: "neutral", biasTimeframe: "4H", entryTimeframe: "5m",
    setupType: "Turtle Soup", zone: "premium",
    confluences: ["Previous session High/Low"],
    entry: 2350, stopLoss: 2356, takeProfit: 2335, riskPercent: 1,
    exitPrice: 2356, result: "loss", mistakes: ["Traded outside killzone", "FOMO entry (no setup)"],
    entryReason: "Asya tepesini fade ettim.",
    notes: "Düşük güvenli Asya scalp'i, burada işim yoktu.", daysAgo: 14,
  },
  {
    symbol: "GBPUSD", direction: "long", status: "closed", session: "ny_am",
    htfBias: "bullish", biasTimeframe: "1D", entryTimeframe: "15m",
    setupType: "HTF FVG Continuation", zone: "discount",
    confluences: ["HTF bias aligned", "Imbalance (FVG) present", "Killzone timing", "Confirmation candle (CHoCH/BOS)"],
    entry: 1.27, stopLoss: 1.267, takeProfit: 1.278, riskPercent: 1,
    exitPrice: 1.2766, result: "win", mistakes: [],
    entryReason: "Günlük FVG'ye devam, BOS onaylandı.",
    notes: "Temiz +2.2R, haftanın en iyi okuması.", daysAgo: 18,
  },
  {
    symbol: "BTCUSDT", direction: "long", status: "closed", session: "london",
    htfBias: "bullish", biasTimeframe: "4H", entryTimeframe: "15m",
    setupType: "Mitigation Block", zone: "discount",
    confluences: ["HTF bias aligned", "Liquidity swept before entry"],
    entry: 61000, stopLoss: 60400, takeProfit: 62500, riskPercent: 1,
    exitPrice: 61000, result: "breakeven", mistakes: ["Closed early / cut winner"],
    entryReason: "Süpürmenin ardından mitigation block teması.",
    notes: "Gerildim ve BE'de kapattım, sonra hedefe gitti. Sabır.", daysAgo: 22,
  },
  {
    symbol: "SOLUSDT", direction: "short", status: "closed", session: "ny_pm",
    htfBias: "bearish", biasTimeframe: "4H", entryTimeframe: "5m",
    setupType: "Order Block (OB)", zone: "premium",
    confluences: ["HTF bias aligned", "Institutional / round number level", "Confirmation candle (CHoCH/BOS)"],
    entry: 150, stopLoss: 153, takeProfit: 142, riskPercent: 1.5,
    exitPrice: 145.5, result: "win", mistakes: [],
    entryReason: "$150 yuvarlak seviyede düşüş OB'si, 5m'de CHoCH.",
    notes: "+1.5R, kısmi kâr sonra trail.", daysAgo: 26,
  },
];

function build(raw: RawSeed, now: number): Trade {
  const plannedRR = calcPlannedRR({
    direction: raw.direction,
    entry: raw.entry,
    stopLoss: raw.stopLoss,
    takeProfit: raw.takeProfit,
  });
  const closed = raw.status === "closed" && raw.result != null;
  const realizedRR = !closed
    ? null
    : raw.result === "breakeven"
      ? 0
      : (calcRealizedRR(
          { direction: raw.direction, entry: raw.entry, stopLoss: raw.stopLoss },
          raw.exitPrice as number,
        ) ?? 0);
  const closedAt = closed ? now - raw.daysAgo * DAY : null;
  const createdAt = closedAt ? closedAt - 2 * HOUR : now - raw.daysAgo * DAY;

  return {
    id: uid("seed"),
    symbol: raw.symbol,
    direction: raw.direction,
    status: raw.status,
    session: raw.session,
    htfBias: raw.htfBias,
    biasTimeframe: raw.biasTimeframe,
    entryTimeframe: raw.entryTimeframe,
    setupType: raw.setupType,
    confluences: raw.confluences,
    zone: raw.zone,
    entry: raw.entry,
    stopLoss: raw.stopLoss,
    takeProfit: raw.takeProfit,
    riskPercent: raw.riskPercent,
    plannedRR,
    realizedRR,
    pnl: realizedRR == null ? null : pnlFromR(realizedRR, raw.riskPercent, START_BALANCE),
    result: raw.result,
    exitPrice: closed ? raw.exitPrice : null,
    entryReason: raw.entryReason,
    mistakes: raw.mistakes,
    notes: raw.notes,
    screenshots: [],
    createdAt,
    closedAt,
  };
}

/** Build the 10 sample trades against "now". */
export function sampleTrades(now = Date.now()): Trade[] {
  return RAW.map((r) => build(r, now));
}

/** Insert samples only when the DB is empty (first launch). */
export async function seedIfEmpty(): Promise<void> {
  if ((await countTrades()) > 0) return;
  await bulkInsert(sampleTrades());
}
