import {
  CONFLUENCES,
  CURRENCIES,
  DIRECTIONS,
  EXPENSE_CATEGORIES,
  EXPENSE_CYCLES,
  HTF_BIASES,
  SETUP_TYPES,
  ZONES,
  type Confluence,
  type Currency,
  type Direction,
  type ExpenseCategory,
  type ExpenseCycle,
  type HtfBias,
  type SetupType,
  type Zone,
} from "./constants";

/**
 * AI one-line trade entry.
 *
 * Sends a single Turkish/English sentence to the Anthropic Messages API and
 * parses the reply into trade-form fields the user then reviews. The numeric
 * fields are NEVER auto-saved — the caller pre-fills the form and the user
 * confirms before saving.
 *
 * The API key is read from the environment (EXPO_PUBLIC_ANTHROPIC_API_KEY) and
 * is never hardcoded here. `anthropic-dangerous-direct-browser-access` lets the
 * call work from the web build too.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export interface AiParsedTrade {
  symbol: string | null;
  direction: Direction | null;
  setupType: SetupType | null;
  confluences: Confluence[];
  zone: Zone | null;
  htfBias: HtfBias | null;
  riskPercent: number | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryReason: string;
}

export type AiParseResult =
  | { ok: true; data: AiParsedTrade }
  | { ok: false; reason: "no-key" | "network" | "parse" };

function systemPrompt(): string {
  const setups = SETUP_TYPES.map((s) => `"${s}"`).join(", ");
  const confs = CONFLUENCES.map((c) => `"${c}"`).join(", ");
  return [
    "You parse a single-sentence ICT/SMC trade description (Turkish or English)",
    "into ONE JSON object. Return ONLY valid JSON — no prose, no markdown fences.",
    "Shape:",
    "{",
    '  "symbol": string|null,',
    '  "direction": "long"|"short"|null,',
    '  "setupType": one of the SetupType values below or null,',
    '  "confluences": array (subset) of the Confluence values below,',
    '  "zone": "premium"|"discount"|"equilibrium"|null,',
    '  "htfBias": "bullish"|"bearish"|"neutral"|null,',
    '  "riskPercent": number|null,',
    '  "entry": number|null, "stopLoss": number|null, "takeProfit": number|null,',
    '  "entryReason": string',
    "}",
    `SetupType values: [${setups}].`,
    `Confluence values: [${confs}].`,
    "Use the EXACT strings above; if a value isn't clearly present, use null (or [] for confluences).",
    "entryReason: a short natural-language reason in the user's own language.",
  ].join("\n");
}

/** Pull a JSON object out of the model's text, tolerating stray fences/prose. */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Map raw model output onto the app's exact enums; drop anything unrecognized. */
function normalize(obj: Record<string, unknown>): AiParsedTrade {
  const inEnum = <T extends string>(list: readonly T[], v: unknown): T | null =>
    typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

  const confluences = Array.isArray(obj.confluences)
    ? (obj.confluences.filter((c) =>
        (CONFLUENCES as readonly string[]).includes(c as string),
      ) as Confluence[])
    : [];

  return {
    symbol: typeof obj.symbol === "string" ? obj.symbol.trim().toUpperCase() : null,
    direction: inEnum(DIRECTIONS, obj.direction),
    setupType: inEnum(SETUP_TYPES, obj.setupType),
    confluences,
    zone: inEnum(ZONES, obj.zone),
    htfBias: inEnum(HTF_BIASES, obj.htfBias),
    riskPercent: num(obj.riskPercent),
    entry: num(obj.entry),
    stopLoss: num(obj.stopLoss),
    takeProfit: num(obj.takeProfit),
    entryReason: typeof obj.entryReason === "string" ? obj.entryReason.trim() : "",
  };
}

type CallResult = { ok: true; text: string } | { ok: false; reason: "no-key" | "network" };

/** Shared one-shot call to the Anthropic Messages API (claude-sonnet-4-6). */
async function callAnthropic(system: string, text: string): Promise<CallResult> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "no-key" };
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
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) return { ok: false, reason: "network" };
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return { ok: true, text: json.content?.find((b) => b.type === "text")?.text ?? "" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function parseTradeSentence(text: string): Promise<AiParseResult> {
  const call = await callAnthropic(systemPrompt(), text);
  if (!call.ok) return call;
  try {
    const parsed = extractJson(call.text);
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "parse" };
    return { ok: true, data: normalize(parsed as Record<string, unknown>) };
  } catch {
    return { ok: false, reason: "parse" };
  }
}

// ── Expense one-line entry (reuses the same infra) ───────────────────────────

export interface AiParsedExpense {
  name: string | null;
  amount: number | null;
  currency: Currency | null;
  category: ExpenseCategory | null;
  cycle: ExpenseCycle | null;
  billingDay: number | null;
}

export type AiExpenseResult =
  | { ok: true; data: AiParsedExpense }
  | { ok: false; reason: "no-key" | "network" | "parse" };

function expenseSystemPrompt(): string {
  const cats = EXPENSE_CATEGORIES.map((c) => `"${c}"`).join(", ");
  return [
    "You parse a single-sentence recurring-expense description (Turkish or English)",
    "into ONE JSON object. Return ONLY valid JSON — no prose, no markdown fences.",
    "Shape:",
    "{",
    '  "name": string|null, "amount": number|null,',
    '  "currency": "TRY"|"USD"|"EUR"|null,',
    '  "category": one of the categories below or null,',
    '  "cycle": "monthly"|"yearly"|null, "billingDay": integer 1-31 or null',
    "}",
    `Category values: [${cats}].`,
    "Map: dolar/$ -> USD, euro/€ -> EUR, TL/lira/₺ -> TRY; 'ayda'/'aylık' -> monthly,",
    "'yılda'/'yıllık' -> yearly; 'her ayın 25'i' -> billingDay 25. Unsure -> null.",
  ].join("\n");
}

function normalizeExpense(obj: Record<string, unknown>): AiParsedExpense {
  const inEnum = <T extends string>(list: readonly T[], v: unknown): T | null =>
    typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;
  const day = num(obj.billingDay);
  return {
    name: typeof obj.name === "string" ? obj.name.trim() : null,
    amount: num(obj.amount),
    currency: inEnum(CURRENCIES, obj.currency),
    category: inEnum(EXPENSE_CATEGORIES, obj.category),
    cycle: inEnum(EXPENSE_CYCLES, obj.cycle),
    billingDay: day == null ? null : Math.min(31, Math.max(1, Math.round(day))),
  };
}

export async function parseExpenseSentence(text: string): Promise<AiExpenseResult> {
  const call = await callAnthropic(expenseSystemPrompt(), text);
  if (!call.ok) return call;
  try {
    const parsed = extractJson(call.text);
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "parse" };
    return { ok: true, data: normalizeExpense(parsed as Record<string, unknown>) };
  } catch {
    return { ok: false, reason: "parse" };
  }
}
