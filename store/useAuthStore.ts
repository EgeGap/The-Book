import { create } from "zustand";
import { persist } from "zustand/middleware";
import { zustandStorage, STORAGE_KEYS } from "@/lib/storage";
import { uid } from "@/lib/utils";
import type { User } from "@/lib/types";

/**
 * LOCAL-ONLY auth. Accounts live in AsyncStorage on this device — there is no
 * server. The "hash" below is a lightweight obfuscation so plaintext passwords
 * are not stored verbatim; it is NOT real security. Swap in firebase.ts auth
 * if you later want real accounts (see lib/firebase.ts).
 */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

interface Account {
  id: string;
  email: string;
  passwordHash: string;
}

type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthState {
  user: User | null;
  accounts: Record<string, Account>; // keyed by lowercased email
  hydrated: boolean;
  signUp: (email: string, password: string) => AuthResult;
  signIn: (email: string, password: string) => AuthResult;
  continueAsGuest: () => void;
  signOut: () => void;
}

const normalize = (e: string) => e.trim().toLowerCase();
const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: {},
      hydrated: false,

      signUp: (email, password) => {
        const key = normalize(email);
        if (!validEmail(key)) return { ok: false, error: "Geçerli bir e-posta gir" };
        if (password.length < 6)
          return { ok: false, error: "Şifre en az 6 karakter olmalı" };
        if (get().accounts[key])
          return { ok: false, error: "Bu e-posta ile zaten bir hesap var" };
        const account: Account = {
          id: uid("u"),
          email: key,
          passwordHash: hash(password),
        };
        set((st) => ({
          accounts: { ...st.accounts, [key]: account },
          user: {
            id: account.id,
            email: key,
            isAnonymous: false,
            createdAt: Date.now(),
          },
        }));
        return { ok: true };
      },

      signIn: (email, password) => {
        const key = normalize(email);
        const account = get().accounts[key];
        if (!account || account.passwordHash !== hash(password))
          return { ok: false, error: "E-posta veya şifre hatalı" };
        set({
          user: {
            id: account.id,
            email: key,
            isAnonymous: false,
            createdAt: Date.now(),
          },
        });
        return { ok: true };
      },

      continueAsGuest: () =>
        set({
          user: {
            id: uid("guest"),
            email: null,
            isAnonymous: true,
            createdAt: Date.now(),
          },
        }),

      signOut: () => set({ user: null }),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: zustandStorage,
      partialize: (s) => ({ user: s.user, accounts: s.accounts }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
