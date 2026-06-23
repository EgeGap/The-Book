import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "zustand/middleware";

/** Zustand persistence adapter backed by AsyncStorage. */
export const zustandStorage = createJSONStorage(() => AsyncStorage);

/** Read a JSON value, returning `fallback` on miss or parse error. */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  seeded: "smc/seeded",
  settings: "smc/settings",
  auth: "smc/auth",
} as const;
