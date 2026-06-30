import { create } from "zustand";
import {
  bulkInsertExpenses,
  deleteExpense as dbDelete,
  getAllExpenses,
  upsertExpense,
} from "@/lib/db";
import { requestPermissions, syncUsageNotifications } from "@/lib/notifications";
import { uid } from "@/lib/utils";
import type { Expense } from "@/lib/types";

/** Everything the user fills in on the Add Expense form. */
export type ExpenseDraft = Omit<
  Expense,
  "id" | "createdAt" | "startedAt" | "priceHistory" | "lastConfirmedAt"
>;

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  saving: boolean;
  hydrate: () => Promise<void>;
  getById: (id: string) => Expense | undefined;
  createExpense: (draft: ExpenseDraft) => Promise<Expense | null>;
  saveExpense: (expense: Expense) => Promise<void>;
  togglePause: (id: string) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  reseed: (expenses: Expense[]) => Promise<void>;
  importExpenses: (list: Expense[]) => Promise<number>;
  confirmStillUsing: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loading: true,
  saving: false,

  hydrate: async () => {
    set({ loading: true });
    const expenses = await getAllExpenses();
    set({ expenses, loading: false });
    syncUsageNotifications(expenses);
  },

  getById: (id) => get().expenses.find((e) => e.id === id),

  createExpense: async (draft) => {
    if (get().saving) return null; // double-tap protection
    set({ saving: true });
    try {
      const now = Date.now();
      const expense: Expense = {
        ...draft,
        id: uid("exp"),
        startedAt: now,
        createdAt: now,
        priceHistory: [],
        lastConfirmedAt: now,
      };
      await upsertExpense(expense);
      set((st) => ({ expenses: [expense, ...st.expenses] }));
      requestPermissions();
      syncUsageNotifications(get().expenses);
      return expense;
    } finally {
      set({ saving: false });
    }
  },

  saveExpense: async (expense) => {
    if (get().saving) return;
    set({ saving: true });
    try {
      const existing = get().expenses.find((e) => e.id === expense.id);
      const priceChanged =
        !!existing && (existing.amount !== expense.amount || existing.currency !== expense.currency);
      const updated: Expense =
        priceChanged && existing
          ? {
              ...expense,
              priceHistory: [
                ...existing.priceHistory,
                { amount: existing.amount, currency: existing.currency, changedAt: Date.now() },
              ],
            }
          : expense;
      await upsertExpense(updated);
      set((st) => ({ expenses: st.expenses.map((e) => (e.id === updated.id ? updated : e)) }));
      syncUsageNotifications(get().expenses);
    } finally {
      set({ saving: false });
    }
  },

  togglePause: async (id) => {
    const existing = get().expenses.find((e) => e.id === id);
    if (!existing) return;
    const updated = { ...existing, active: !existing.active };
    await upsertExpense(updated);
    set((st) => ({ expenses: st.expenses.map((e) => (e.id === id ? updated : e)) }));
    syncUsageNotifications(get().expenses);
  },

  removeExpense: async (id) => {
    await dbDelete(id);
    set((st) => ({ expenses: st.expenses.filter((e) => e.id !== id) }));
    syncUsageNotifications(get().expenses);
  },

  reseed: async (expenses) => {
    await bulkInsertExpenses(expenses);
    const all = await getAllExpenses();
    set({ expenses: all });
    syncUsageNotifications(all);
  },

  importExpenses: async (list) => {
    if (list.length === 0) return 0;
    await bulkInsertExpenses(list); // upsert by id — merges with existing
    const all = await getAllExpenses();
    set({ expenses: all });
    syncUsageNotifications(all);
    return list.length;
  },

  confirmStillUsing: async (id) => {
    const existing = get().expenses.find((e) => e.id === id);
    if (!existing) return;
    const updated = { ...existing, lastConfirmedAt: Date.now() };
    await upsertExpense(updated);
    set((st) => ({ expenses: st.expenses.map((e) => (e.id === id ? updated : e)) }));
    syncUsageNotifications(get().expenses);
  },
}));
