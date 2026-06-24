import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage, STORAGE_KEYS } from "@/lib/storage";
import type { Settings } from "@/lib/types";

const DEFAULTS: Settings = {
  defaultRiskPercent: 1,
  maxRiskPercent: 2,
  startingBalance: 10_000,
  theme: "dark",
  customSetups: [],
  customConfluences: [],
  baseCurrency: "TRY",
  usdToTry: 41,
  eurToTry: 45,
  financialApiKey: "",
};

interface SettingsState extends Settings {
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  addCustomSetup: (s: string) => void;
  removeCustomSetup: (s: string) => void;
  addCustomConfluence: (c: string) => void;
  removeCustomConfluence: (c: string) => void;
  resetSettings: () => void;
}

const addUnique = (list: string[], v: string) => {
  const t = v.trim();
  return t.length === 0 || list.includes(t) ? list : [...list, t];
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      update: (patch) => set(patch),
      addCustomSetup: (s) =>
        set((st) => ({ customSetups: addUnique(st.customSetups, s) })),
      removeCustomSetup: (s) =>
        set((st) => ({ customSetups: st.customSetups.filter((x) => x !== s) })),
      addCustomConfluence: (c) =>
        set((st) => ({ customConfluences: addUnique(st.customConfluences, c) })),
      removeCustomConfluence: (c) =>
        set((st) => ({
          customConfluences: st.customConfluences.filter((x) => x !== c),
        })),
      resetSettings: () => set({ ...DEFAULTS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: zustandStorage,
      partialize: (s) => ({
        defaultRiskPercent: s.defaultRiskPercent,
        maxRiskPercent: s.maxRiskPercent,
        startingBalance: s.startingBalance,
        theme: s.theme,
        customSetups: s.customSetups,
        customConfluences: s.customConfluences,
        lastUsed: s.lastUsed,
        baseCurrency: s.baseCurrency,
        usdToTry: s.usdToTry,
        eurToTry: s.eurToTry,
        lastUsedExpense: s.lastUsedExpense,
        financialApiKey: s.financialApiKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.update({});
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
