import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Expense, StockAnalysisRecord, Trade } from "./types";

/**
 * WEB fallback for the data layer.
 *
 * expo-sqlite's native module isn't available in the browser (it would need a
 * WASM build + COOP/COEP headers). Metro automatically loads THIS file on web
 * and `db.ts` (real SQLite) on iOS/Android — the public API is identical, so no
 * caller needs to know which one is in use.
 *
 * Trades are persisted as a single JSON array in AsyncStorage (localStorage on
 * web), which is plenty for a personal journal.
 */

const KEY = "smc/trades-web";

async function readAll(): Promise<Trade[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trade[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(trades: Trade[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(trades));
}

export async function initDb(): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw == null) await writeAll([]);
}

export async function getAllTrades(): Promise<Trade[]> {
  const all = await readAll();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTrade(id: string): Promise<Trade | null> {
  const all = await readAll();
  return all.find((t) => t.id === id) ?? null;
}

export async function upsertTrade(t: Trade): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex((x) => x.id === t.id);
  if (idx >= 0) all[idx] = t;
  else all.unshift(t);
  await writeAll(all);
}

export async function deleteTrade(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((t) => t.id !== id));
}

export async function countTrades(): Promise<number> {
  return (await readAll()).length;
}

export async function deleteAllTrades(): Promise<void> {
  await writeAll([]);
}

export async function bulkInsert(trades: Trade[]): Promise<void> {
  const map = new Map((await readAll()).map((t) => [t.id, t]));
  for (const t of trades) map.set(t.id, t);
  await writeAll([...map.values()]);
}

// ── Expenses ────────────────────────────────────────────────────────────────

const EXP_KEY = "smc/expenses-web";

async function readExpenses(): Promise<Expense[]> {
  try {
    const raw = await AsyncStorage.getItem(EXP_KEY);
    return raw ? (JSON.parse(raw) as Expense[]) : [];
  } catch {
    return [];
  }
}

async function writeExpenses(list: Expense[]): Promise<void> {
  await AsyncStorage.setItem(EXP_KEY, JSON.stringify(list));
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

// ── Stock analysis cache ──────────────────────────────────────────────────────

const STOCK_KEY = "smc/stock-analyses";

async function readStockAnalyses(): Promise<StockAnalysisRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STOCK_KEY);
    return raw ? (JSON.parse(raw) as StockAnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeStockAnalyses(list: StockAnalysisRecord[]): Promise<void> {
  await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(list));
}

export async function getAllStockAnalyses(): Promise<StockAnalysisRecord[]> {
  const all = await readStockAnalyses();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertStockAnalysis(record: StockAnalysisRecord): Promise<void> {
  const all = await readStockAnalyses();
  const idx = all.findIndex((x) => x.ticker === record.ticker);
  if (idx >= 0) all[idx] = record;
  else all.unshift(record);
  await writeStockAnalyses(all);
}

export async function deleteStockAnalysis(ticker: string): Promise<void> {
  await writeStockAnalyses((await readStockAnalyses()).filter((x) => x.ticker !== ticker));
}
