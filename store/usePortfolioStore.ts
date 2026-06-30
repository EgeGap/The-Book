import { create } from "zustand";
import {
  bulkInsertHoldings,
  deleteHolding as dbDelete,
  getAllHoldings,
  upsertHolding,
} from "@/lib/db";
import { refreshAllQuotes } from "@/lib/stockPrices";
import { uid } from "@/lib/utils";
import type { StockHolding } from "@/lib/types";

/** Everything the user fills in on the Add Holding form. */
export type HoldingDraft = Omit<
  StockHolding,
  "id" | "createdAt" | "lastPrice" | "lastPriceCurrency" | "lastPriceAt"
>;

interface PortfolioState {
  holdings: StockHolding[];
  loading: boolean;
  saving: boolean;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  getById: (id: string) => StockHolding | undefined;
  addHolding: (draft: HoldingDraft) => Promise<StockHolding | null>;
  saveHolding: (holding: StockHolding) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  importHoldings: (list: StockHolding[]) => Promise<number>;
  refreshPrices: () => Promise<number>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: [],
  loading: true,
  saving: false,
  refreshing: false,

  hydrate: async () => {
    set({ loading: true });
    const holdings = await getAllHoldings();
    set({ holdings, loading: false });
  },

  getById: (id) => get().holdings.find((h) => h.id === id),

  addHolding: async (draft) => {
    if (get().saving) return null; // double-tap protection
    set({ saving: true });
    try {
      const holding: StockHolding = {
        ...draft,
        id: uid("hold"),
        createdAt: Date.now(),
        lastPrice: null,
        lastPriceCurrency: null,
        lastPriceAt: null,
      };
      await upsertHolding(holding);
      set((st) => ({ holdings: [holding, ...st.holdings] }));
      return holding;
    } finally {
      set({ saving: false });
    }
  },

  saveHolding: async (holding) => {
    if (get().saving) return;
    set({ saving: true });
    try {
      await upsertHolding(holding);
      set((st) => ({ holdings: st.holdings.map((h) => (h.id === holding.id ? holding : h)) }));
    } finally {
      set({ saving: false });
    }
  },

  removeHolding: async (id) => {
    await dbDelete(id);
    set((st) => ({ holdings: st.holdings.filter((h) => h.id !== id) }));
  },

  importHoldings: async (list) => {
    if (list.length === 0) return 0;
    await bulkInsertHoldings(list);
    const all = await getAllHoldings();
    set({ holdings: all });
    return list.length;
  },

  refreshPrices: async () => {
    if (get().refreshing) return 0;
    set({ refreshing: true });
    try {
      const { holdings: updated, updatedCount } = await refreshAllQuotes(get().holdings);
      for (const h of updated) await upsertHolding(h);
      set({ holdings: updated });
      return updatedCount;
    } finally {
      set({ refreshing: false });
    }
  },
}));
