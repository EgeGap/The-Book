import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage, STORAGE_KEYS } from "@/lib/storage";
import type { Settings } from "@/lib/types";

const DEFAULTS: Settings = {
  theme: "dark",
  baseCurrency: "TRY",
  usdToTry: 41,
};

interface SettingsState extends Settings {
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      update: (patch) => set(patch),
      resetSettings: () => set({ ...DEFAULTS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: zustandStorage,
      partialize: (s) => ({
        theme: s.theme,
        baseCurrency: s.baseCurrency,
        usdToTry: s.usdToTry,
        lastUsedExpense: s.lastUsedExpense,
        lastDigestSeenAt: s.lastDigestSeenAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.update({});
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
