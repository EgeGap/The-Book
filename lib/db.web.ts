import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Expense, StockHolding } from "./types";

/**
 * WEB fallback for the data layer.
 *
 * expo-sqlite's native module isn't available in the browser (it would need a
 * WASM build + COOP/COEP headers). Metro automatically loads THIS file on web
 * and `db.sqlite.ts` (real SQLite) on iOS/Android — the public API is
 * identical, so no caller needs to know which one is in use.
 */

const EXP_KEY = "smc/expenses-web";
const HOLD_KEY = "smc/holdings-web";

async function readExpenses(): Promise<Expense[]> {
  try {
    const raw = await AsyncStorage.getItem(EXP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    return parsed.map((e) => ({
      ...e,
      priceHistory: e.priceHistory ?? [],
      lastConfirmedAt: e.lastConfirmedAt ?? e.createdAt,
    }));
  } catch {
    return [];
  }
}

async function writeExpenses(list: Expense[]): Promise<void> {
  await AsyncStorage.setItem(EXP_KEY, JSON.stringify(list));
}

export async function initDb(): Promise<void> {
  const raw = await AsyncStorage.getItem(EXP_KEY);
  if (raw == null) await writeExpenses([]);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const all = await readExpenses();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getExpense(id: string): Promise<Expense | null> {
  return (await readExpenses()).find((e) => e.id === id) ?? null;
}

export async function upsertExpense(e: Expense): Promise<void> {
  const all = await readExpenses();
  const idx = all.findIndex((x) => x.id === e.id);
  if (idx >= 0) all[idx] = e;
  else all.unshift(e);
  await writeExpenses(all);
}

export async function deleteExpense(id: string): Promise<void> {
  await writeExpenses((await readExpenses()).filter((e) => e.id !== id));
}

export async function countExpenses(): Promise<number> {
  return (await readExpenses()).length;
}

export async function bulkInsertExpenses(expenses: Expense[]): Promise<void> {
  const map = new Map((await readExpenses()).map((e) => [e.id, e]));
  for (const e of expenses) map.set(e.id, e);
  await writeExpenses([...map.values()]);
}

/** One-time cleanup: remove demo-seed expenses (id prefix "expseed_"). */
export async function deleteSeededExpenses(): Promise<void> {
  await writeExpenses((await readExpenses()).filter((e) => !e.id.startsWith("expseed_")));
}

// ── Holdings (portfolio) ───────────────────────────────────────────────────

async function readHoldings(): Promise<StockHolding[]> {
  try {
    const raw = await AsyncStorage.getItem(HOLD_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StockHolding[];
  } catch {
    return [];
  }
}

async function writeHoldings(list: StockHolding[]): Promise<void> {
  await AsyncStorage.setItem(HOLD_KEY, JSON.stringify(list));
}

export async function getAllHoldings(): Promise<StockHolding[]> {
  const all = await readHoldings();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getHolding(id: string): Promise<StockHolding | null> {
  return (await readHoldings()).find((h) => h.id === id) ?? null;
}

export async function upsertHolding(h: StockHolding): Promise<void> {
  const all = await readHoldings();
  const idx = all.findIndex((x) => x.id === h.id);
  if (idx >= 0) all[idx] = h;
  else all.unshift(h);
  await writeHoldings(all);
}

export async function bulkInsertHoldings(holdings: StockHolding[]): Promise<void> {
  const map = new Map((await readHoldings()).map((h) => [h.id, h]));
  for (const h of holdings) map.set(h.id, h);
  await writeHoldings([...map.values()]);
}

export async function deleteHolding(id: string): Promise<void> {
  await writeHoldings((await readHoldings()).filter((h) => h.id !== id));
}
