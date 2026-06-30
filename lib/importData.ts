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
import type { Expense, PriceHistoryEntry, StockHolding } from "./types";

/**
 * Import data exported from another device. Picks a JSON file, reads it
 * (browser download on web, file system on native) and returns the parsed
 * array. Throws on cancel-less read/parse errors; returns null when cancelled.
 */
export async function pickJSONArray(): Promise<unknown[] | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  const text =
    Platform.OS === "web"
      ? await fetch(uri).then((r) => r.text())
      : await FileSystem.readAsStringAsync(uri);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("not-an-array");
  return parsed;
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
