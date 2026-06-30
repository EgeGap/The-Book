import {
  addMonths,
  differenceInCalendarDays,
  lastDayOfMonth,
  setDate,
  startOfDay,
} from "date-fns";
import type { Currency, ExpenseCategory } from "./constants";
import type { Expense, PriceHistoryEntry } from "./types";

/**
 * All expense math lives here as PURE functions: Expense[] (+ FX rates + base
 * currency) in, plain numbers/objects out. No DB, no I/O — unit-testable.
 */

export interface FxRates {
  usdToTry: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const safeRate = (r: number) => (Number.isFinite(r) && r > 0 ? r : 1);

/** Any amount -> TRY using the manual rates. */
function toTry(amount: number, currency: Currency, rates: FxRates): number {
  if (currency === "USD") return amount * safeRate(rates.usdToTry);
  return amount;
}

/** Convert an amount from its currency into `base` (via a TRY pivot). */
export function convert(
  amount: number,
  currency: Currency,
  rates: FxRates,
  base: Currency,
): number {
  const tl = toTry(amount, currency, rates);
  if (base === "USD") return r2(tl / safeRate(rates.usdToTry));
  return r2(tl);
}

/** One expense normalized to a per-month cost in the base currency. */
export function monthlyAmount(e: Expense, rates: FxRates, base: Currency): number {
  const inBase = convert(e.amount, e.currency, rates, base);
  return r2(e.cycle === "yearly" ? inBase / 12 : inBase);
}

const activeOnly = (expenses: Expense[]) => expenses.filter((e) => e.active);

/** Total monthly cost of all active expenses (yearly ones counted as /12). */
export function monthlyTotal(expenses: Expense[], rates: FxRates, base: Currency): number {
  return r2(
    activeOnly(expenses).reduce((s, e) => s + monthlyAmount(e, rates, base), 0),
  );
}

export function yearlyTotal(expenses: Expense[], rates: FxRates, base: Currency): number {
  return r2(monthlyTotal(expenses, rates, base) * 12);
}

export function activeCount(expenses: Expense[]): number {
  return activeOnly(expenses).length;
}

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
}

/** Monthly base-currency spend per category (active only), biggest first. */
export function totalByCategory(
  expenses: Expense[],
  rates: FxRates,
  base: Currency,
): CategoryTotal[] {
  const map = new Map<ExpenseCategory, number>();
  for (const e of activeOnly(expenses)) {
    map.set(e.category, (map.get(e.category) ?? 0) + monthlyAmount(e, rates, base));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total: r2(total) }))
    .sort((a, b) => b.total - a.total);
}

export interface MostExpensive {
  expense: Expense;
  monthly: number;
}

export function mostExpensiveSubscriptions(
  expenses: Expense[],
  rates: FxRates,
  base: Currency,
): MostExpensive[] {
  return activeOnly(expenses)
    .map((expense) => ({ expense, monthly: monthlyAmount(expense, rates, base) }))
    .sort((a, b) => b.monthly - a.monthly);
}

/** Next calendar date a billingDay falls on (clamped to short months). */
export function nextBillingDate(billingDay: number, from: Date = new Date()): Date {
  const today = startOfDay(from);
  const clamp = (base: Date) =>
    setDate(base, Math.min(billingDay, lastDayOfMonth(base).getDate()));
  let due = clamp(today);
  if (differenceInCalendarDays(due, today) < 0) due = clamp(addMonths(today, 1));
  return startOfDay(due);
}

export interface UpcomingPayment {
  expense: Expense;
  dueDate: number; // epoch ms
  daysUntil: number;
}

/** Active expenses whose next billing date falls within `withinDays`. */
export function upcomingPayments(
  expenses: Expense[],
  withinDays = 7,
  from: Date = new Date(),
): UpcomingPayment[] {
  const today = startOfDay(from);
  return activeOnly(expenses)
    .map((expense) => {
      const due = nextBillingDate(expense.billingDay, today);
      return { expense, dueDate: due.getTime(), daysUntil: differenceInCalendarDays(due, today) };
    })
    .filter((p) => p.daysUntil >= 0 && p.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/** What this expense would save per year (base currency) if cancelled. */
export function annualSavings(expense: Expense, rates: FxRates, base: Currency): number {
  return r2(monthlyAmount(expense, rates, base) * 12);
}

/** Whether an active expense is due for a "still using this?" check-in. */
export function needsUsageCheck(
  expense: Expense,
  intervalDays: number,
  now: Date = new Date(),
): boolean {
  if (!expense.active) return false;
  const dueAt = expense.lastConfirmedAt + intervalDays * 24 * 60 * 60 * 1000;
  return now.getTime() >= dueAt;
}

export interface PriceChangeSummary {
  changeCount: number;
  firstAmount: number;
  firstDate: number;
  percentChange: number;
}

/** Summarizes how an expense's price has moved since its earliest recorded amount. */
export function priceChangeSummary(
  history: PriceHistoryEntry[],
  current: { amount: number; currency: Currency },
): PriceChangeSummary | null {
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => a.changedAt - b.changedAt);
  const first = sorted[0];
  const sameCurrencyThroughout = sorted.every((h) => h.currency === current.currency);
  const percentChange =
    sameCurrencyThroughout && first.amount !== 0
      ? r2(((current.amount - first.amount) / first.amount) * 100)
      : 0;
  return {
    changeCount: history.length,
    firstAmount: first.amount,
    firstDate: first.changedAt,
    percentChange,
  };
}

export interface MonthlyDigest {
  newExpenses: Expense[];
  priceChanges: { expense: Expense; summary: PriceChangeSummary }[];
  pausedCount: number;
  totalDeltaPct: number | null;
}

/**
 * Summarizes what changed since `sinceMs`: new expenses, price changes recorded
 * in that window, and a rough count of currently-paused expenses. `totalDeltaPct`
 * compares current monthlyTotal against the total as of `sinceMs` (reconstructed
 * from priceHistory) — null when there's nothing to compare against.
 */
export function buildMonthlyDigest(
  expenses: Expense[],
  rates: FxRates,
  base: Currency,
  sinceMs: number,
): MonthlyDigest {
  const newExpenses = expenses.filter((e) => e.createdAt >= sinceMs);

  const priceChanges = expenses
    .map((expense) => {
      const recent = expense.priceHistory.filter((h) => h.changedAt >= sinceMs);
      if (recent.length === 0) return null;
      const summary = priceChangeSummary(recent, { amount: expense.amount, currency: expense.currency });
      return summary ? { expense, summary } : null;
    })
    .filter((x): x is { expense: Expense; summary: PriceChangeSummary } => x !== null);

  const pausedCount = expenses.filter((e) => !e.active).length;

  const currentTotal = monthlyTotal(expenses, rates, base);
  const priorTotal = monthlyTotal(
    expenses.map((e) => {
      // The value effective at sinceMs is the earliest history entry recorded
      // at-or-after sinceMs (each entry holds the amount that was valid right
      // up until its own changedAt).
      const valueAtSince = [...e.priceHistory]
        .filter((h) => h.changedAt >= sinceMs)
        .sort((a, b) => a.changedAt - b.changedAt)[0];
      if (!valueAtSince) return e;
      return { ...e, amount: valueAtSince.amount, currency: valueAtSince.currency };
    }),
    rates,
    base,
  );
  const totalDeltaPct =
    priceChanges.length === 0 || priorTotal === 0
      ? null
      : r2(((currentTotal - priorTotal) / priorTotal) * 100);

  return { newExpenses, priceChanges, pausedCount, totalDeltaPct };
}
