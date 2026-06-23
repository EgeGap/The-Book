import { create } from "zustand";
import {
  bulkInsertExpenses,
  deleteExpense as dbDelete,
  getAllExpenses,
  upsertExpense,
} from "@/lib/db";
import { uid } from "@/lib/utils";
import type { Expense } from "@/lib/types";

/** Everything the user fills in on the Add Expense form. */
export type ExpenseDraft = Omit<Expense, "id" | "createdAt" | "startedAt">;

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
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loading: true,
  saving: false,

  hydrate: async () => {
    set({ loading: true });
    set({ expenses: await getAllExpenses(), loading: false });
  },

  getById: (id) => get().expenses.find((e) => e.id === id),

  createExpense: async (draft) => {
    if (get().saving) return null; // double-tap protection
    set({ saving: true });
    try {
      const now = Date.now();
      const expense: Expense = { ...draft, id: uid("exp"), startedAt: now, createdAt: now };
      await upsertExpense(expense);
      set((st) => ({ expenses: [expense, ...st.expenses] }));
      return expense;
    } finally {
      set({ saving: false });
    }
  },

  saveExpense: async (expense) => {
    if (get().saving) return;
    set({ saving: true });
    try {
      await upsertExpense(expense);
      set((st) => ({ expenses: st.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
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
  },

  removeExpense: async (id) => {
    await dbDelete(id);
    set((st) => ({ expenses: st.expenses.filter((e) => e.id !== id) }));
  },

  reseed: async (expenses) => {
    await bulkInsertExpenses(expenses);
    set({ expenses: await getAllExpenses() });
  },
}));
