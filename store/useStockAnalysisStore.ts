import { create } from "zustand";
import { getAllStockAnalyses, upsertStockAnalysis, deleteStockAnalysis as dbDelete } from "@/lib/db";
import { analyzeStock } from "@/lib/stockAnalysis";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { StockAnalysisRecord } from "@/lib/types";

export type AnalysisStep = "idle" | "fetching" | "news" | "writing";
export type AnalysisError = "no-key" | "network" | "parse" | null;

interface StockAnalysisState {
  reports: Record<string, StockAnalysisRecord>;
  hydrated: boolean;
  loading: boolean;
  step: AnalysisStep;
  activeTicker: string | null;
  error: AnalysisError;
  hydrate: () => Promise<void>;
  analyze: (ticker: string, force?: boolean) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
}

export const useStockAnalysisStore = create<StockAnalysisState>((set, get) => ({
  reports: {},
  hydrated: false,
  loading: false,
  step: "idle",
  activeTicker: null,
  error: null,

  hydrate: async () => {
    const all = await getAllStockAnalyses();
    set({
      reports: Object.fromEntries(all.map((r) => [r.ticker, r])),
      hydrated: true,
    });
  },

  analyze: async (rawTicker, force = false) => {
    const ticker = rawTicker.trim().toUpperCase();
    if (!ticker || get().loading) return;

    if (!force && get().reports[ticker]) {
      set({ activeTicker: ticker });
      return;
    }

    set({ loading: true, step: "fetching", error: null, activeTicker: ticker });
    // The actual request is one network call (the API runs web search
    // server-side); these timers only drive the progress copy so the long
    // wait doesn't look frozen.
    const t1 = setTimeout(() => {
      if (get().loading) set({ step: "news" });
    }, 1500);
    const t2 = setTimeout(() => {
      if (get().loading) set({ step: "writing" });
    }, 4500);

    try {
      const apiKey = useSettingsStore.getState().financialApiKey;
      const result = await analyzeStock(ticker, apiKey || undefined);
      if (!result.ok) {
        set({ loading: false, step: "idle", error: result.reason });
        return;
      }
      const record: StockAnalysisRecord = { ticker, report: result.data, updatedAt: Date.now() };
      await upsertStockAnalysis(record);
      set((st) => ({
        reports: { ...st.reports, [ticker]: record },
        loading: false,
        step: "idle",
      }));
    } catch {
      set({ loading: false, step: "idle", error: "parse" });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  },

  remove: async (ticker) => {
    await dbDelete(ticker);
    set((st) => {
      const next = { ...st.reports };
      delete next[ticker];
      return { reports: next };
    });
  },
}));
