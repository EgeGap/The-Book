import * as SQLite from "expo-sqlite";
import type { Expense, HoldingTransaction, PriceHistoryEntry, PriceSnapshot, StockHolding } from "./types";
import type { Currency, ExpenseCategory, ExpenseCycle, StockMarket } from "./constants";

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
    CREATE TABLE IF NOT EXISTS holding_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      holdingId TEXT NOT NULL,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      pricePerUnit REAL NOT NULL,
      currency TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY NOT NULL,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      quantity REAL NOT NULL,
      costBasis REAL NOT NULL,
      costCurrency TEXT NOT NULL,
      purchasedAt INTEGER NOT NULL,
      notes TEXT NOT NULL,
      lastPrice REAL,
      lastPriceCurrency TEXT,
      lastPriceAt INTEGER,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      fetchedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_price_snapshots_lookup ON price_snapshots(symbol, market, fetchedAt);
  `);
  for (const stmt of [
    `ALTER TABLE expenses ADD COLUMN priceHistory TEXT NOT NULL DEFAULT '[]';`,
    `ALTER TABLE expenses ADD COLUMN lastConfirmedAt INTEGER;`,
    `ALTER TABLE holding_transactions ADD COLUMN costBasisAtSale REAL;`,
    `ALTER TABLE holdings ADD COLUMN targetPrice REAL;`,
    `ALTER TABLE holdings ADD COLUMN stopLoss REAL;`,
  ]) {
    try {
      await db.execAsync(stmt);
    } catch {
      // column already exists — fine, this is our only migration mechanism
    }
  }
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
  priceHistory: string;
  lastConfirmedAt: number | null;
}

const EXP_COLUMNS = `id, name, amount, currency, category, cycle, billingDay,
  paymentMethod, active, notes, startedAt, createdAt, priceHistory, lastConfirmedAt`;

function rowToExpense(r: ExpenseRow): Expense {
  let priceHistory: PriceHistoryEntry[] = [];
  try {
    priceHistory = JSON.parse(r.priceHistory) as PriceHistoryEntry[];
  } catch {
    priceHistory = [];
  }
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
    priceHistory,
    lastConfirmedAt: r.lastConfirmedAt ?? r.createdAt,
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
    JSON.stringify(e.priceHistory),
    e.lastConfirmedAt,
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
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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

// ── Holdings (portfolio) ───────────────────────────────────────────────────

interface HoldingRow {
  id: string;
  symbol: string;
  market: string;
  quantity: number;
  costBasis: number;
  costCurrency: string;
  purchasedAt: number;
  notes: string;
  lastPrice: number | null;
  lastPriceCurrency: string | null;
  lastPriceAt: number | null;
  createdAt: number;
  targetPrice: number | null;
  stopLoss: number | null;
}

const HOLD_COLUMNS = `id, symbol, market, quantity, costBasis, costCurrency,
  purchasedAt, notes, lastPrice, lastPriceCurrency, lastPriceAt, createdAt,
  targetPrice, stopLoss`;

function rowToHolding(r: HoldingRow): StockHolding {
  return {
    id: r.id,
    symbol: r.symbol,
    market: r.market as StockMarket,
    quantity: r.quantity,
    costBasis: r.costBasis,
    costCurrency: r.costCurrency as Currency,
    purchasedAt: r.purchasedAt,
    notes: r.notes,
    lastPrice: r.lastPrice,
    lastPriceCurrency: r.lastPriceCurrency as Currency | null,
    lastPriceAt: r.lastPriceAt,
    createdAt: r.createdAt,
    targetPrice: r.targetPrice ?? null,
    stopLoss: r.stopLoss ?? null,
  };
}

function holdingParams(h: StockHolding): (string | number | null)[] {
  return [
    h.id,
    h.symbol,
    h.market,
    h.quantity,
    h.costBasis,
    h.costCurrency,
    h.purchasedAt,
    h.notes,
    h.lastPrice,
    h.lastPriceCurrency,
    h.lastPriceAt,
    h.createdAt,
    h.targetPrice ?? null,
    h.stopLoss ?? null,
  ];
}

export async function getAllHoldings(): Promise<StockHolding[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HoldingRow>(
    `SELECT ${HOLD_COLUMNS} FROM holdings ORDER BY createdAt DESC`,
  );
  return rows.map(rowToHolding);
}

export async function getHolding(id: string): Promise<StockHolding | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<HoldingRow>(
    `SELECT ${HOLD_COLUMNS} FROM holdings WHERE id = ?`,
    [id],
  );
  return row ? rowToHolding(row) : null;
}

export async function upsertHolding(h: StockHolding): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO holdings (${HOLD_COLUMNS})
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    holdingParams(h),
  );
}

export async function bulkInsertHoldings(holdings: StockHolding[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const h of holdings) await upsertHolding(h);
  });
}

export async function deleteHolding(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM holdings WHERE id = ?`, [id]);
}

// ── Holding Transactions ───────────────────────────────────────────────────

export async function insertTransaction(t: HoldingTransaction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO holding_transactions
     (id, holdingId, symbol, market, type, quantity, pricePerUnit, currency, createdAt, costBasisAtSale)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [t.id, t.holdingId, t.symbol, t.market, t.type, t.quantity, t.pricePerUnit, t.currency, t.createdAt, t.costBasisAtSale ?? null],
  );
}

export async function getAllTransactions(): Promise<HoldingTransaction[]> {
  const db = await getDb();
  return db.getAllAsync<HoldingTransaction>(
    `SELECT * FROM holding_transactions ORDER BY createdAt DESC`,
  );
}

// ── Price snapshots (BIST 15-min-delayed display) ──────────────────────────

export async function insertPriceSnapshot(
  symbol: string,
  market: StockMarket,
  price: number,
  currency: Currency,
  fetchedAt: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO price_snapshots (symbol, market, price, currency, fetchedAt) VALUES (?,?,?,?,?)`,
    [symbol, market, price, currency, fetchedAt],
  );
}

/** Latest snapshot at or before `cutoff`; falls back to the oldest snapshot while history is still younger than the delay. */
export async function getDelayedPrice(
  symbol: string,
  market: StockMarket,
  cutoff: number,
): Promise<PriceSnapshot | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PriceSnapshot>(
    `SELECT price, currency, fetchedAt FROM price_snapshots
     WHERE symbol = ? AND market = ? AND fetchedAt <= ?
     ORDER BY fetchedAt DESC LIMIT 1`,
    [symbol, market, cutoff],
  );
  if (row) return row;
  return db.getFirstAsync<PriceSnapshot>(
    `SELECT price, currency, fetchedAt FROM price_snapshots
     WHERE symbol = ? AND market = ?
     ORDER BY fetchedAt ASC LIMIT 1`,
    [symbol, market],
  );
}

export async function prunePriceSnapshots(maxAgeMs: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM price_snapshots WHERE fetchedAt < ?`, [Date.now() - maxAgeMs]);
}
