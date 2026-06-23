import * as SQLite from "expo-sqlite";
import type { Expense, Trade } from "./types";
import type {
  Confluence,
  Currency,
  Direction,
  ExpenseCategory,
  ExpenseCycle,
  HtfBias,
  MistakeTag,
  Session,
  SetupType,
  TradeResult,
  TradeStatus,
  Zone,
} from "./constants";

const DB_NAME = "smc_journal.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Lazily open a single shared connection. */
function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

/** Create the schema on first launch. Safe to call repeatedly. */
export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY NOT NULL,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      status TEXT NOT NULL,
      session TEXT NOT NULL,
      htfBias TEXT NOT NULL,
      biasTimeframe TEXT NOT NULL,
      entryTimeframe TEXT NOT NULL,
      setupType TEXT NOT NULL,
      confluences TEXT NOT NULL,
      zone TEXT NOT NULL,
      entry REAL NOT NULL,
      stopLoss REAL NOT NULL,
      takeProfit REAL NOT NULL,
      riskPercent REAL NOT NULL,
      plannedRR REAL NOT NULL,
      realizedRR REAL,
      pnl REAL,
      result TEXT,
      exitPrice REAL,
      entryReason TEXT NOT NULL,
      mistakes TEXT NOT NULL,
      notes TEXT NOT NULL,
      screenshots TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      closedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_trades_createdAt ON trades (createdAt DESC);
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      cycle TEXT NOT NULL,
      billingDay INTEGER NOT NULL,
      paymentMethod TEXT NOT NULL,
      active INTEGER NOT NULL,
      notes TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
}

/** Shape of a raw SQLite row before JSON columns are parsed. */
interface TradeRow {
  id: string;
  symbol: string;
  direction: string;
  status: string;
  session: string;
  htfBias: string;
  biasTimeframe: string;
  entryTimeframe: string;
  setupType: string;
  confluences: string;
  zone: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  plannedRR: number;
  realizedRR: number | null;
  pnl: number | null;
  result: string | null;
  exitPrice: number | null;
  entryReason: string;
  mistakes: string;
  notes: string;
  screenshots: string;
  createdAt: number;
  closedAt: number | null;
}

function parseJsonArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function rowToTrade(r: TradeRow): Trade {
  return {
    id: r.id,
    symbol: r.symbol,
    direction: r.direction as Direction,
    status: r.status as TradeStatus,
    session: r.session as Session,
    htfBias: r.htfBias as HtfBias,
    biasTimeframe: r.biasTimeframe,
    entryTimeframe: r.entryTimeframe,
    setupType: r.setupType as SetupType,
    confluences: parseJsonArray<Confluence>(r.confluences),
    zone: r.zone as Zone,
    entry: r.entry,
    stopLoss: r.stopLoss,
    takeProfit: r.takeProfit,
    riskPercent: r.riskPercent,
    plannedRR: r.plannedRR,
    realizedRR: r.realizedRR,
    pnl: r.pnl,
    result: r.result as TradeResult | null,
    exitPrice: r.exitPrice,
    entryReason: r.entryReason,
    mistakes: parseJsonArray<MistakeTag>(r.mistakes),
    notes: r.notes,
    screenshots: parseJsonArray<string>(r.screenshots),
    createdAt: r.createdAt,
    closedAt: r.closedAt,
  };
}

/** Ordered newest-first for list/feed rendering. */
const COLUMNS = `id, symbol, direction, status, session, htfBias, biasTimeframe,
  entryTimeframe, setupType, confluences, zone, entry, stopLoss, takeProfit,
  riskPercent, plannedRR, realizedRR, pnl, result, exitPrice, entryReason,
  mistakes, notes, screenshots, createdAt, closedAt`;

export async function getAllTrades(): Promise<Trade[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TradeRow>(
    `SELECT ${COLUMNS} FROM trades ORDER BY createdAt DESC`,
  );
  return rows.map(rowToTrade);
}

export async function getTrade(id: string): Promise<Trade | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TradeRow>(
    `SELECT ${COLUMNS} FROM trades WHERE id = ?`,
    [id],
  );
  return row ? rowToTrade(row) : null;
}

function tradeParams(t: Trade): (string | number | null)[] {
  return [
    t.id,
    t.symbol,
    t.direction,
    t.status,
    t.session,
    t.htfBias,
    t.biasTimeframe,
    t.entryTimeframe,
    t.setupType,
    JSON.stringify(t.confluences),
    t.zone,
    t.entry,
    t.stopLoss,
    t.takeProfit,
    t.riskPercent,
    t.plannedRR,
    t.realizedRR,
    t.pnl,
    t.result,
    t.exitPrice,
    t.entryReason,
    JSON.stringify(t.mistakes),
    t.notes,
    JSON.stringify(t.screenshots),
    t.createdAt,
    t.closedAt,
  ];
}

export async function upsertTrade(t: Trade): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO trades (${COLUMNS})
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    tradeParams(t),
  );
}

export async function deleteTrade(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM trades WHERE id = ?`, [id]);
}

export async function countTrades(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM trades`,
  );
  return row?.c ?? 0;
}

export async function deleteAllTrades(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM trades`);
}

/** Insert many in one transaction (used by the seeder). */
export async function bulkInsert(trades: Trade[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of trades) await upsertTrade(t);
  });
}

// ── Expenses ────────────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  cycle: string;
  billingDay: number;
  paymentMethod: string;
  active: number;
  notes: string;
  startedAt: number;
  createdAt: number;
}

const EXP_COLUMNS = `id, name, amount, currency, category, cycle, billingDay,
  paymentMethod, active, notes, startedAt, createdAt`;

function rowToExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount,
    currency: r.currency as Currency,
    category: r.category as ExpenseCategory,
    cycle: r.cycle as ExpenseCycle,
    billingDay: r.billingDay,
    paymentMethod: r.paymentMethod,
    active: r.active === 1,
    notes: r.notes,
    startedAt: r.startedAt,
    createdAt: r.createdAt,
  };
}

function expenseParams(e: Expense): (string | number)[] {
  return [
    e.id,
    e.name,
    e.amount,
    e.currency,
    e.category,
    e.cycle,
    e.billingDay,
    e.paymentMethod,
    e.active ? 1 : 0,
    e.notes,
    e.startedAt,
    e.createdAt,
  ];
}

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    `SELECT ${EXP_COLUMNS} FROM expenses ORDER BY createdAt DESC`,
  );
  return rows.map(rowToExpense);
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>(
    `SELECT ${EXP_COLUMNS} FROM expenses WHERE id = ?`,
    [id],
  );
  return row ? rowToExpense(row) : null;
}

export async function upsertExpense(e: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO expenses (${EXP_COLUMNS})
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    expenseParams(e),
  );
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
}

export async function countExpenses(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM expenses`,
  );
  return row?.c ?? 0;
}

export async function bulkInsertExpenses(expenses: Expense[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const e of expenses) await upsertExpense(e);
  });
}

/** One-time cleanup: remove demo-seed expenses (id prefix "expseed_"). */
export async function deleteSeededExpenses(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM expenses WHERE id LIKE 'expseed\\_%' ESCAPE '\\'`);
}
