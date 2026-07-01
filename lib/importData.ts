import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  EXPENSE_CYCLES,
  STOCK_MARKETS,
  type Currency,
  type ExpenseCategory,
  type ExpenseCycle,
  type StockMarket,
} from "./constants";
import { uid } from "./utils";
import type { Expense, HoldingTransaction, PriceHistoryEntry, StockHolding, TransactionType } from "./types";

async function readPickedFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  return Platform.OS === "web"
    ? await fetch(uri).then((r) => r.text())
    : await FileSystem.readAsStringAsync(uri);
}

/**
 * Pick a JSON file and return its parsed content as an array.
 * Returns null on cancel; throws on parse error or non-array.
 */
export async function pickJSONArray(): Promise<unknown[] | null> {
  const text = await readPickedFile();
  if (text == null) return null;
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("not-an-array");
  return parsed;
}

/**
 * Pick a JSON file and return its parsed content as any value.
 * Returns null on cancel; throws on parse error.
 */
export async function pickJSON(): Promise<unknown> {
  const text = await readPickedFile();
  if (text == null) return null;
  return JSON.parse(text);
}

const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
const numOr = (v: unknown, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
function inEnum<T extends string>(list: readonly T[], v: unknown, d: T): T {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d;
}

/**
 * Validate + normalize raw objects into Expense records. Requires at least a
 * name and a numeric amount; everything else is coerced/defaulted so a slightly
 * different export still imports cleanly. IDs are preserved (so re-importing is
 * idempotent), except old demo-seed ids which are regenerated to survive the
 * one-time seed purge.
 */
export function validateExpenses(arr: unknown[]): Expense[] {
  const out: Expense[] = [];
  const now = Date.now();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = asStr(o.name).trim();
    const amount = Number(o.amount);
    if (!name || !Number.isFinite(amount)) continue;

    const rawId = asStr(o.id);
    const id = rawId && !rawId.startsWith("expseed_") ? rawId : uid("exp");

    out.push({
      id,
      name,
      amount,
      currency: inEnum<Currency>(CURRENCIES, o.currency, "TRY"),
      category: inEnum<ExpenseCategory>(EXPENSE_CATEGORIES, o.category, "other"),
      cycle: inEnum<ExpenseCycle>(EXPENSE_CYCLES, o.cycle, "monthly"),
      billingDay: Math.min(31, Math.max(1, Math.round(numOr(o.billingDay, 1)))),
      paymentMethod: asStr(o.paymentMethod),
      active: typeof o.active === "boolean" ? o.active : true,
      notes: asStr(o.notes),
      startedAt: numOr(o.startedAt, now),
      createdAt: numOr(o.createdAt, now),
      priceHistory: Array.isArray(o.priceHistory) ? (o.priceHistory as PriceHistoryEntry[]) : [],
      lastConfirmedAt: numOr(o.lastConfirmedAt, numOr(o.createdAt, now)),
    });
  }
  return out;
}

/** Validate + normalize raw objects into portfolio holdings. */
export function validateHoldings(arr: unknown[]): StockHolding[] {
  const out: StockHolding[] = [];
  const now = Date.now();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const symbol = asStr(o.symbol).trim().toUpperCase();
    const quantity = Number(o.quantity);
    const costBasis = Number(o.costBasis);
    if (!symbol || !Number.isFinite(quantity) || !Number.isFinite(costBasis)) continue;

    out.push({
      id: asStr(o.id) || uid("hold"),
      symbol,
      market: inEnum<StockMarket>(STOCK_MARKETS, o.market, "BIST"),
      quantity,
      costBasis,
      costCurrency: inEnum<Currency>(CURRENCIES, o.costCurrency, "TRY"),
      purchasedAt: numOr(o.purchasedAt, now),
      notes: asStr(o.notes),
      lastPrice: typeof o.lastPrice === "number" && Number.isFinite(o.lastPrice) ? o.lastPrice : null,
      lastPriceCurrency:
        o.lastPriceCurrency == null ? null : inEnum<Currency>(CURRENCIES, o.lastPriceCurrency, "TRY"),
      lastPriceAt:
        typeof o.lastPriceAt === "number" && Number.isFinite(o.lastPriceAt) ? o.lastPriceAt : null,
      createdAt: numOr(o.createdAt, now),
    });
  }
  return out;
}

const TX_TYPES: readonly TransactionType[] = ["buy", "buy_more", "sell"];

/** Validate + normalize raw objects into holding transactions. */
export function validateTransactions(arr: unknown[]): HoldingTransaction[] {
  const out: HoldingTransaction[] = [];
  const now = Date.now();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const holdingId = asStr(o.holdingId);
    const symbol = asStr(o.symbol).trim().toUpperCase();
    const quantity = Number(o.quantity);
    const pricePerUnit = Number(o.pricePerUnit);
    if (!holdingId || !symbol || !Number.isFinite(quantity) || !Number.isFinite(pricePerUnit)) continue;

    out.push({
      id: asStr(o.id) || uid("tx"),
      holdingId,
      symbol,
      market: inEnum<StockMarket>(STOCK_MARKETS, o.market, "BIST"),
      type: inEnum<TransactionType>(TX_TYPES, o.type, "buy"),
      quantity,
      pricePerUnit,
      currency: inEnum<Currency>(CURRENCIES, o.currency, "TRY"),
      createdAt: numOr(o.createdAt, now),
      costBasisAtSale:
        typeof o.costBasisAtSale === "number" && Number.isFinite(o.costBasisAtSale)
          ? o.costBasisAtSale
          : undefined,
    });
  }
  return out;
}

export interface UnifiedBackup {
  expenses: Expense[];
  holdings: StockHolding[];
  transactions: HoldingTransaction[];
}

/**
 * Validate and extract all data from a unified backup object.
 * Tolerant: missing sections default to empty arrays so a partial backup
 * still imports cleanly.
 */
export function validateUnifiedBackup(raw: unknown): UnifiedBackup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("invalid-format");
  }
  const o = raw as Record<string, unknown>;
  return {
    expenses: Array.isArray(o.expenses) ? validateExpenses(o.expenses) : [],
    holdings: Array.isArray(o.holdings) ? validateHoldings(o.holdings) : [],
    transactions: Array.isArray(o.transactions) ? validateTransactions(o.transactions) : [],
  };
}
