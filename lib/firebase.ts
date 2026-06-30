/**
 * OPTIONAL cloud sync — disabled by default.
 * ---------------------------------------------------------------------------
 * This app is LOCAL-FIRST: expenses live in expo-sqlite and settings/auth live
 * in AsyncStorage. Everything works fully offline with no account and no
 * network.
 *
 * Firebase is intentionally NOT imported here so the project installs and runs
 * with zero external setup. If you later want multi-device sync, follow the
 * steps below — nothing else in the app needs to change to keep working locally.
 *
 * ── Enable Firebase (optional) ──────────────────────────────────────────────
 * 1. Install the SDK:
 *      npx expo install firebase
 * 2. Create a Firebase project at https://console.firebase.google.com and add a
 *    Web app. Enable: Authentication (Email/Password + Anonymous), Firestore,
 *    and Storage.
 * 3. Paste the web config into FIREBASE_CONFIG below and set ENABLE_FIREBASE = true.
 * 4. Uncomment the implementation block at the bottom of this file and wire the
 *    sync calls into store/useExpenseStore.ts (e.g. mirror upsertExpense/deleteExpense).
 * 5. For Firestore offline persistence on RN, initialize with
 *      initializeFirestore(app, { localCache: persistentLocalCache() })
 *    so the app keeps working without a connection and syncs when back online.
 * ---------------------------------------------------------------------------
 */

export const ENABLE_FIREBASE = false;

/** Replace the placeholders with your own project's web config. */
export const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

/** True only when sync is turned on AND real credentials are present. */
export function isFirebaseConfigured(): boolean {
  return ENABLE_FIREBASE && !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");
}

/*
// ── Reference implementation (uncomment after `npx expo install firebase`) ──
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  collection,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import type { Expense } from "./types";

const app = initializeApp(FIREBASE_CONFIG);
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });

const expensesCol = (uid: string) => collection(db, "users", uid, "expenses");

export async function syncUpsertExpense(uid: string, e: Expense) {
  await setDoc(doc(expensesCol(uid), e.id), e);
}
export async function syncDeleteExpense(uid: string, id: string) {
  await deleteDoc(doc(expensesCol(uid), id));
}
*/
