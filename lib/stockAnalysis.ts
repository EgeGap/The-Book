import type {
  AnalysisConfidence,
  NewsImpact,
  ScenarioOutlook,
  StockReport,
  StockVerdict,
} from "./types";

/**
 * Grounded stock research report generation.
 *
 * The model NEVER invents numbers: the request enables the Anthropic web_search
 * tool so the model can look up real, current data (news, results, price) before
 * writing, and an optional Financial Modeling Prep key (user-supplied, kept
 * local) is fetched first and handed to the model as ground truth for hard
 * fundamentals. Anything the model still can't find comes back as `null` and is
 * listed in `dataGaps` — never guessed. The model returns ONLY JSON, which we
 * parse defensively since it's untrusted LLM output.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export type StockAnalysisResult =
  | { ok: true; data: StockReport }
  | { ok: false; reason: "no-key" | "network" | "parse" };

function systemPrompt(): string {
  return [
    "Sen bir hisse senedi araştırma analistisin. Verilen hisse kodu için web_search",
    "aracını kullanarak GERÇEK ve GÜNCEL veri topla: son fiyat, piyasa değeri, son",
    "3-6 ayın haberleri, en son yıllık/çeyreklik finansal sonuçlar, sektör ve",
    "rakipler. ASLA rakam icat etme — bir veriyi bulamazsan ilgili alanı null yap",
    "ve dataGaps listesine ekle.",
    "",
    "BIST (Türkiye) hisseleri için KAP açıklamaları, şirketin yatırımcı ilişkileri",
    "sayfası ve güvenilir haber kaynaklarına dayan; verinin tarihini fundamentals.note",
    "alanına yaz.",
    "",
    "Fiyat görünümü (outlook) ASLA tek bir kesin sayı olamaz — her zaman bear/base/bull",
    "senaryosu ve base senaryo olasılığı ver. Yanlış kesinlik (false precision) yasak.",
    "",
    "Tüm metinler TÜRKÇE olmalı. Araştırmanı tamamladıktan sonra SADECE şu JSON",
    "şemasına uyan, başka hiçbir metin/markdown çevresi olmayan TEK bir JSON nesnesi",
    "döndür:",
    "{",
    '  "ticker": string, "companyName": string, "market": string, "currency": string,',
    '  "currentPrice": number|null, "marketCap": string|null, "asOfDate": string,',
    '  "summary": string,',
    '  "fundamentals": { "revenue": string|null, "netIncome": string|null,',
    '    "profitMargin": string|null, "peRatio": number|null, "pbRatio": number|null,',
    '    "debtToEquity": string|null, "revenueGrowthYoY": string|null, "note": string },',
    '  "sector": { "name": string, "positioning": string, "competitors": string[] },',
    '  "recentNews": [ { "date": string, "headline": string,',
    '    "impact": "olumlu"|"olumsuz"|"nötr" } ],',
    '  "strengths": string[], "risks": string[],',
    '  "valuation": { "verdict": "ucuz"|"makul"|"pahalı", "reasoning": string,',
    '    "fairValueRange": string|null },',
    '  "outlook": {',
    '    "short": { "bear": string, "base": string, "bull": string, "baseProbability": string },',
    '    "medium": { "bear": string, "base": string, "bull": string, "baseProbability": string },',
    '    "long": { "bear": string, "base": string, "bull": string, "baseProbability": string }',
    "  },",
    '  "sources": [ { "title": string, "url": string } ],',
    '  "confidence": "düşük"|"orta"|"yüksek", "dataGaps": string[]',
    "}",
    "short = 0-6 ay, medium = 6-24 ay, long = 2-5 yıl.",
    "Veri az/eskiyse confidence'ı dürüstçe \"düşük\" yap ve dataGaps'i doldur.",
  ].join("\n");
}

/** Optional ground-truth fundamentals from Financial Modeling Prep (user's own key). */
async function fetchFmpFundamentals(ticker: string, apiKey: string): Promise<string | null> {
  try {
    const [profileRes, quoteRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`),
    ]);
    if (!profileRes.ok || !quoteRes.ok) return null;
    const profile = (await profileRes.json()) as unknown;
    const quote = (await quoteRes.json()) as unknown;
    if (!Array.isArray(profile) || profile.length === 0) return null;
    return JSON.stringify({ profile: profile[0], quote: Array.isArray(quote) ? quote[0] ?? null : null });
  } catch {
    return null;
  }
}

interface ContentBlock {
  type: string;
  text?: string;
}

async function callAnthropic(ticker: string, fmpData: string | null): Promise<
  { ok: true; text: string } | { ok: false; reason: "no-key" | "network" }
> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "no-key" };

  const userText = fmpData
    ? `Hisse kodu: ${ticker}\n\nFinancial Modeling Prep API'den alınan ham veri (ground truth, JSON):\n${fmpData}`
    : `Hisse kodu: ${ticker}`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: systemPrompt(),
        messages: [{ role: "user", content: userText }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
      }),
    });
    if (!res.ok) return { ok: false, reason: "network" };
    const json = (await res.json()) as { content?: ContentBlock[] };
    const textBlocks = (json.content ?? []).filter((b) => b.type === "text" && b.text);
    const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text ?? "" : "";
    return { ok: true, text };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Pull a JSON object out of the model's text, tolerating stray fences/prose. */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
function inEnum<T extends string>(list: readonly T[], v: unknown, d: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d;
}

const VERDICTS: StockVerdict[] = ["ucuz", "makul", "pahalı"];
const IMPACTS: NewsImpact[] = ["olumlu", "olumsuz", "nötr"];
const CONFIDENCES: AnalysisConfidence[] = ["düşük", "orta", "yüksek"];

function normalizeScenario(v: unknown): ScenarioOutlook {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    bear: str(o.bear) || "Veri bulunamadı",
    base: str(o.base) || "Veri bulunamadı",
    bull: str(o.bull) || "Veri bulunamadı",
    baseProbability: str(o.baseProbability) || "—",
  };
}

/** Defensive normalization of untrusted LLM JSON into a safe StockReport. */
function normalizeReport(raw: Record<string, unknown>, fallbackTicker: string): StockReport {
  const fundamentals = (raw.fundamentals && typeof raw.fundamentals === "object" ? raw.fundamentals : {}) as Record<
    string,
    unknown
  >;
  const sector = (raw.sector && typeof raw.sector === "object" ? raw.sector : {}) as Record<string, unknown>;
  const valuation = (raw.valuation && typeof raw.valuation === "object" ? raw.valuation : {}) as Record<
    string,
    unknown
  >;
  const outlook = (raw.outlook && typeof raw.outlook === "object" ? raw.outlook : {}) as Record<string, unknown>;
  const news = Array.isArray(raw.recentNews) ? raw.recentNews : [];
  const sources = Array.isArray(raw.sources) ? raw.sources : [];

  return {
    ticker: str(raw.ticker) || fallbackTicker,
    companyName: str(raw.companyName) || fallbackTicker,
    market: str(raw.market) || "—",
    currency: str(raw.currency) || "—",
    currentPrice: numOrNull(raw.currentPrice),
    marketCap: strOrNull(raw.marketCap),
    asOfDate: str(raw.asOfDate) || "—",
    summary: str(raw.summary) || "Özet oluşturulamadı.",

    fundamentals: {
      revenue: strOrNull(fundamentals.revenue),
      netIncome: strOrNull(fundamentals.netIncome),
      profitMargin: strOrNull(fundamentals.profitMargin),
      peRatio: numOrNull(fundamentals.peRatio),
      pbRatio: numOrNull(fundamentals.pbRatio),
      debtToEquity: strOrNull(fundamentals.debtToEquity),
      revenueGrowthYoY: strOrNull(fundamentals.revenueGrowthYoY),
      note: str(fundamentals.note),
    },

    sector: {
      name: str(sector.name) || "—",
      positioning: str(sector.positioning),
      competitors: strArray(sector.competitors),
    },

    recentNews: news
      .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
      .map((n) => ({
        date: str(n.date) || "—",
        headline: str(n.headline),
        impact: inEnum(IMPACTS, n.impact, "nötr"),
      })),

    strengths: strArray(raw.strengths),
    risks: strArray(raw.risks),

    valuation: {
      verdict: inEnum(VERDICTS, valuation.verdict, "makul"),
      reasoning: str(valuation.reasoning) || "Değerlendirme yapılamadı.",
      fairValueRange: strOrNull(valuation.fairValueRange),
    },

    outlook: {
      short: normalizeScenario(outlook.short),
      medium: normalizeScenario(outlook.medium),
      long: normalizeScenario(outlook.long),
    },

    sources: sources
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s) => ({ title: str(s.title) || str(s.url), url: str(s.url) }))
      .filter((s) => s.url.length > 0),

    confidence: inEnum(CONFIDENCES, raw.confidence, "düşük"),
    dataGaps: strArray(raw.dataGaps),
  };
}

export async function analyzeStock(ticker: string, financialApiKey?: string): Promise<StockAnalysisResult> {
  const clean = ticker.trim().toUpperCase();
  const fmpData = financialApiKey ? await fetchFmpFundamentals(clean, financialApiKey) : null;
  const call = await callAnthropic(clean, fmpData);
  if (!call.ok) return call;
  try {
    const parsed = extractJson(call.text);
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "parse" };
    return { ok: true, data: normalizeReport(parsed as Record<string, unknown>, clean) };
  } catch {
    return { ok: false, reason: "parse" };
  }
}
