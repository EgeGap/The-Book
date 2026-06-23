import { create } from "zustand";
import {
  bulkInsert,
  deleteAllTrades,
  deleteTrade as dbDelete,
  getAllTrades,
  upsertTrade,
} from "@/lib/db";
import { pnlFromR, realizedRR } from "@/lib/rr";
import { uid } from "@/lib/utils";
import type { Trade } from "@/lib/types";
import type { MistakeTag, TradeResult } from "@/lib/constants";
import { useSettingsStore } from "./useSettingsStore";

/** Everything the user fills in on the New Trade form. */
export type TradeDraft = Omit<
  Trade,
  "id" | "createdAt" | "closedAt" | "realizedRR" | "pnl" | "result" | "exitPrice"
>;

export interface CloseTradePayload {
  result: TradeResult;
  exitPrice: number;
  mistakes: MistakeTag[];
  notes: string;
  screenshots: string[];
}

interface TradeState {
  trades: Trade[];
  loading: boolean;
  saving: boolean; // guards against double-tap submits
  hydrate: () => Promise<void>;
  getById: (id: string) => Trade | undefined;
  createTrade: (draft: TradeDraft) => Promise<Trade | null>;
  saveTrade: (trade: Trade) => Promise<void>;
  closeTrade: (id: string, payload: CloseTradePayload) => Promise<Trade | null>;
  removeTrade: (id: string) => Promise<void>;
  reseed: (trades: Trade[]) => Promise<void>;
}

export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  loading: true,
  saving: false,

  hydrate: async () => {
    set({ loading: true });
    const trades = await getAllTrades();
    set({ trades, loading: false });
  },

  getById: (id) => get().trades.find((t) => t.id === id),

  createTrade: async (draft) => {
    if (get().saving) return null; // double-tap protection
    set({ saving: true });
    try {
      const trade: Trade = {
        ...draft,
        id: uid(),
        realizedRR: null,
        pnl: null,
        result: null,
        exitPrice: null,
        createdAt: Date.now(),
        closedAt: null,
      };
      await upsertTrade(trade);
      set((st) => ({ trades: [trade, ...st.trades] }));
      return trade;
    } finally {
      set({ saving: false });
    }
  },

  saveTrade: async (trade) => {
    if (get().saving) return;
    set({ saving: true });
    try {
      await upsertTrade(trade);
      set((st) => ({
        trades: st.trades.map((t) => (t.id === trade.id ? trade : t)),
      }));
    } finally {
      set({ saving: false });
    }
  },

  closeTrade: async (id, payload) => {
    if (get().saving) return null;
    const existing = get().trades.find((t) => t.id === id);
    if (!existing) return null;
    if (existing.status === "closed") {
      throw new Error("Bu işlem zaten kapalı.");
    }
    set({ saving: true });
    try {
      const { startingBalance } = useSettingsStore.getState();
      const rMultiple =
        payload.result === "breakeven"
          ? 0
          : realizedRR(
              {
                direction: existing.direction,
                entry: existing.entry,
                stopLoss: existing.stopLoss,
              },
              payload.exitPrice,
            ) ?? 0;
      const closed: Trade = {
        ...existing,
        status: "closed",
        result: payload.result,
        exitPrice: payload.exitPrice,
        realizedRR: rMultiple,
        pnl: pnlFromR(rMultiple, existing.riskPercent, startingBalance),
        mistakes: payload.mistakes,
        notes: payload.notes,
        screenshots: payload.screenshots,
        closedAt: Date.now(),
      };
      await upsertTrade(closed);
      set((st) => ({
        trades: st.trades.map((t) => (t.id === id ? closed : t)),
      }));
      return closed;
    } finally {
      set({ saving: false });
    }
  },

  removeTrade: async (id) => {
    await dbDelete(id);
    set((st) => ({ trades: st.trades.filter((t) => t.id !== id) }));
  },

  reseed: async (trades) => {
    await deleteAllTrades();
    await bulkInsert(trades);
    const fresh = await getAllTrades();
    set({ trades: fresh });
  },
}));
