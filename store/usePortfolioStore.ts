import { create } from "zustand";
import {
  bulkInsertHoldings,
  deleteHolding as dbDelete,
  getAllHoldings,
  getAllTransactions,
  insertTransaction,
  prunePriceSnapshots,
  upsertHolding,
} from "@/lib/db";
import { refreshAllQuotes } from "@/lib/stockPrices";
import { applyBistDelay, PRICE_SNAPSHOT_MAX_AGE_MS } from "@/lib/priceDelay";
import { schedulePriceAlert } from "@/lib/notifications";
import { uid } from "@/lib/utils";
import type { HoldingTransaction, StockHolding } from "@/lib/types";

/** Everything the user fills in on the Add Holding form. */
export type HoldingDraft = Omit<
  StockHolding,
  "id" | "createdAt" | "lastPrice" | "lastPriceCurrency" | "lastPriceAt"
>;

interface PortfolioState {
  holdings: StockHolding[];
  transactions: HoldingTransaction[];
  loading: boolean;
  saving: boolean;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  getById: (id: string) => StockHolding | undefined;
  addHolding: (draft: HoldingDraft) => Promise<StockHolding | null>;
  saveHolding: (holding: StockHolding) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  sellHolding: (id: string, quantity: number) => Promise<void>;
  buyMore: (id: string, quantity: number, pricePerUnit: number) => Promise<void>;
  importHoldings: (list: StockHolding[]) => Promise<number>;
  importTransactions: (list: HoldingTransaction[]) => Promise<number>;
  refreshPrices: () => Promise<number>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  holdings: [],
  transactions: [],
  loading: true,
  saving: false,
  refreshing: false,

  hydrate: async () => {
    set({ loading: true });
    const [holdings, existingTx] = await Promise.all([getAllHoldings(), getAllTransactions()]);
    const loggedIds = new Set(existingTx.map((t) => t.holdingId));
    const backfill: HoldingTransaction[] = [];
    for (const h of holdings) {
      if (!loggedIds.has(h.id)) {
        const tx: HoldingTransaction = {
          id: uid("tx"),
          holdingId: h.id,
          symbol: h.symbol,
          market: h.market,
          type: "buy",
          quantity: h.quantity,
          pricePerUnit: h.costBasis,
          currency: h.costCurrency,
          createdAt: h.createdAt,
        };
        backfill.push(tx);
        await insertTransaction(tx);
      }
    }
    const transactions = [...backfill, ...existingTx].sort((a, b) => b.createdAt - a.createdAt);
    set({ holdings, transactions, loading: false });
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
      const tx: HoldingTransaction = {
        id: uid("tx"),
        holdingId: holding.id,
        symbol: holding.symbol,
        market: holding.market,
        type: "buy",
        quantity: holding.quantity,
        pricePerUnit: holding.costBasis,
        currency: holding.costCurrency,
        createdAt: Date.now(),
      };
      await insertTransaction(tx);
      set((st) => ({ holdings: [holding, ...st.holdings], transactions: [tx, ...st.transactions] }));
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

  sellHolding: async (id, quantity) => {
    const holding = get().holdings.find((h) => h.id === id);
    if (!holding) return;
    const tx: HoldingTransaction = {
      id: uid("tx"),
      holdingId: id,
      symbol: holding.symbol,
      market: holding.market,
      type: "sell",
      quantity,
      pricePerUnit: holding.lastPrice ?? holding.costBasis,
      currency: holding.lastPriceCurrency ?? holding.costCurrency,
      costBasisAtSale: holding.costBasis,
      createdAt: Date.now(),
    };
    await insertTransaction(tx);
    if (quantity >= holding.quantity) {
      await dbDelete(id);
      set((st) => ({ holdings: st.holdings.filter((h) => h.id !== id), transactions: [tx, ...st.transactions] }));
    } else {
      const updated = { ...holding, quantity: holding.quantity - quantity };
      await upsertHolding(updated);
      set((st) => ({ holdings: st.holdings.map((h) => (h.id === id ? updated : h)), transactions: [tx, ...st.transactions] }));
    }
  },

  buyMore: async (id, quantity, pricePerUnit) => {
    const holding = get().holdings.find((h) => h.id === id);
    if (!holding) return;
    const newQty = holding.quantity + quantity;
    const newCostBasis = (holding.quantity * holding.costBasis + quantity * pricePerUnit) / newQty;
    const updated = { ...holding, quantity: newQty, costBasis: newCostBasis };
    const tx: HoldingTransaction = {
      id: uid("tx"),
      holdingId: id,
      symbol: holding.symbol,
      market: holding.market,
      type: "buy_more",
      quantity,
      pricePerUnit,
      currency: holding.costCurrency,
      createdAt: Date.now(),
    };
    await upsertHolding(updated);
    await insertTransaction(tx);
    set((st) => ({ holdings: st.holdings.map((h) => (h.id === id ? updated : h)), transactions: [tx, ...st.transactions] }));
  },

  importHoldings: async (list) => {
    if (list.length === 0) return 0;
    await bulkInsertHoldings(list);
    const all = await getAllHoldings();
    set({ holdings: all });
    return list.length;
  },

  importTransactions: async (list) => {
    if (list.length === 0) return 0;
    let imported = 0;
    for (const tx of list) {
      try {
        await insertTransaction(tx);
        imported++;
      } catch {
        // duplicate id — skip
      }
    }
    const all = await getAllTransactions();
    set({ transactions: all.sort((a, b) => b.createdAt - a.createdAt) });
    return imported;
  },

  refreshPrices: async () => {
    if (get().refreshing) return 0;
    set({ refreshing: true });
    try {
      const { holdings: liveHoldings, updatedCount } = await refreshAllQuotes(get().holdings);
      const resolved = await Promise.all(liveHoldings.map(resolveDisplayPrice));
      await prunePriceSnapshots(PRICE_SNAPSHOT_MAX_AGE_MS);
      for (const h of resolved) await upsertHolding(h);
      const withAlerts = await checkAndClearAlerts(resolved);
      set({ holdings: withAlerts });
      return updatedCount;
    } finally {
      set({ refreshing: false });
    }
  },
}));

async function resolveDisplayPrice(h: StockHolding): Promise<StockHolding> {
  if (h.lastPrice == null || h.lastPriceCurrency == null) return h;
  const resolved = await applyBistDelay(h.market, h.symbol, h.lastPrice, h.lastPriceCurrency, h.lastPriceAt ?? Date.now());
  return { ...h, lastPrice: resolved.price, lastPriceCurrency: resolved.currency, lastPriceAt: resolved.fetchedAt };
}

async function checkAndClearAlerts(holdings: StockHolding[]): Promise<StockHolding[]> {
  const result = [...holdings];
  for (let i = 0; i < result.length; i++) {
    const h = result[i];
    if (h.lastPrice == null) continue;
    let current = h;
    let modified = false;
    if (current.targetPrice != null && h.lastPrice >= current.targetPrice) {
      await schedulePriceAlert(h.symbol, "target", h.lastPrice, h.lastPriceCurrency ?? h.costCurrency);
      current = { ...current, targetPrice: null };
      modified = true;
    }
    if (current.stopLoss != null && h.lastPrice <= current.stopLoss) {
      await schedulePriceAlert(h.symbol, "stopLoss", h.lastPrice, h.lastPriceCurrency ?? h.costCurrency);
      current = { ...current, stopLoss: null };
      modified = true;
    }
    if (modified) {
      await upsertHolding(current);
      result[i] = current;
    }
  }
  return result;
}
