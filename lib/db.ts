import { Platform } from "react-native";
import * as sqliteDb from "./db.sqlite";
import * as webDb from "./db.web";

/**
 * Platform-aware data layer entry point.
 *
 * We dispatch at runtime on `Platform.OS` rather than relying on Metro's
 * `.web.ts` extension resolution — that resolution can be bypassed when the
 * import comes through the `@/` path alias, which is exactly what caused the
 * web build to crash by loading native expo-sqlite.
 *
 * Importing both modules is safe: `db.sqlite` only *calls* expo-sqlite lazily
 * (inside functions), so the native module is never touched on web; `db.web`
 * only uses AsyncStorage, which is fine on native.
 */
const impl = Platform.OS === "web" ? webDb : sqliteDb;

export const initDb = impl.initDb;

export const getAllExpenses = impl.getAllExpenses;
export const getExpense = impl.getExpense;
export const upsertExpense = impl.upsertExpense;
export const deleteExpense = impl.deleteExpense;
export const countExpenses = impl.countExpenses;
export const bulkInsertExpenses = impl.bulkInsertExpenses;
export const deleteSeededExpenses = impl.deleteSeededExpenses;

export const getAllHoldings = impl.getAllHoldings;
export const getHolding = impl.getHolding;
export const upsertHolding = impl.upsertHolding;
export const bulkInsertHoldings = impl.bulkInsertHoldings;
export const deleteHolding = impl.deleteHolding;
export const insertTransaction = impl.insertTransaction;
export const getAllTransactions = impl.getAllTransactions;

export const insertPriceSnapshot = impl.insertPriceSnapshot;
export const getDelayedPrice = impl.getDelayedPrice;
export const prunePriceSnapshots = impl.prunePriceSnapshots;
