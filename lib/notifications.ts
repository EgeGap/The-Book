import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { SUBSCRIPTION_CHECK_INTERVAL_DAYS } from "./constants";
import { S } from "./strings";
import type { Expense } from "./types";

/**
 * Local "still using this?" reminders. Web has no local-notification support,
 * so every export here is a no-op on web — the in-app "Gözden Geçir" banner
 * (driven by needsUsageCheck) is the real mechanism there.
 */

const isSupported = Platform.OS !== "web";

if (isSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestPermissions(): Promise<void> {
  if (!isSupported) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") await Notifications.requestPermissionsAsync();
  } catch {
    // permissions are best-effort — the in-app banner still works without them
  }
}

function identifierFor(expenseId: string): string {
  return `usage-${expenseId}`;
}

/** Fires an immediate local notification when a holding hits its target or stop-loss. */
export async function schedulePriceAlert(
  symbol: string,
  type: "target" | "stopLoss",
  price: number,
  currency: string,
): Promise<void> {
  if (!isSupported) return;
  try {
    const fmt = price.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
    const title =
      type === "target"
        ? `🎯 ${symbol} — Hedef Fiyata Ulaştı`
        : `⚠️ ${symbol} — Stop-Loss Seviyesine Düştü`;
    await Notifications.scheduleNotificationAsync({
      content: { title, body: `Güncel fiyat: ${fmt} ${currency}` },
      trigger: null,
    });
  } catch {
    // best-effort
  }
}

/** (Re)schedules one "still using this?" notification per active expense. */
export async function syncUsageNotifications(expenses: Expense[]): Promise<void> {
  if (!isSupported) return;
  try {
    for (const expense of expenses) {
      await Notifications.cancelScheduledNotificationAsync(identifierFor(expense.id)).catch(() => {});
      if (!expense.active) continue;
      const dueAt =
        expense.lastConfirmedAt + SUBSCRIPTION_CHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
      if (dueAt <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: identifierFor(expense.id),
        content: {
          title: S.notifications.usageTitle,
          body: S.notifications.usageBody(expense.name),
          data: { expenseId: expense.id },
        },
        trigger: { date: new Date(dueAt) },
      });
    }
  } catch {
    // scheduling is best-effort
  }
}
