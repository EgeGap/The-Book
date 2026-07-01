import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import * as Notifications from "expo-notifications";
import { deleteSeededExpenses, initDb } from "@/lib/db";
import { useExpenseStore } from "@/store/useExpenseStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * react-native-web warns when RN touch-responder props (used internally by the
 * chart library) reach a DOM node. The props are simply ignored on web and the
 * warning is harmless — silence just that one family of messages so the dev
 * console stays readable. No effect on native or production.
 */
if (Platform.OS === "web") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && (
      args[0].includes("Unknown event handler property") ||
      args[0].includes("Can't perform a React state update on a component that hasn't mounted yet")
    )) {
      return;
    }
    origError(...args);
  };
}

/** Redirect between the auth screen and the app based on local auth state. */
function useAuthRedirect(ready: boolean) {
  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authHydrated) return;
    const inAuth = segments[0] === "auth";
    if (!user && !inAuth) router.replace("/auth/sign-in");
    else if (user && inAuth) router.replace("/");
  }, [ready, authHydrated, user, segments, router]);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const theme = useSettingsStore((s) => s.theme);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateExpenses = useExpenseStore((s) => s.hydrate);
  const hydrateHoldings = usePortfolioStore((s) => s.hydrate);
  const refreshFxRates = useSettingsStore((s) => s.refreshFxRates);
  const { setColorScheme } = useColorScheme();

  // One-time data bootstrap: schema -> seed -> load into memory.
  useEffect(() => {
    (async () => {
      try {
        await initDb();
        await deleteSeededExpenses(); // one-time cleanup of the old demo expenses
        await hydrateExpenses();
        await hydrateHoldings();
        refreshFxRates(); // fire-and-forget; updates usdToTry in background
      } finally {
        setReady(true);
      }
    })();
  }, [hydrateExpenses, hydrateHoldings]);

  // Keep the rendered scheme in sync with the saved preference (dark default).
  useEffect(() => {
    if (settingsHydrated) setColorScheme(theme);
  }, [theme, settingsHydrated, setColorScheme]);

  useAuthRedirect(ready);

  // Tapping a "still using this?" notification opens that expense's detail screen.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const expenseId = response.notification.request.content.data?.expenseId;
      if (typeof expenseId === "string") router.push(`/expense/${expenseId}`);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        {!ready ? (
          <View className="flex-1 items-center justify-center bg-black">
            <ActivityIndicator color="#7C5CFC" size="large" />
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/sign-in" />
            <Stack.Screen name="expense/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="expense/[id]" />
            <Stack.Screen name="portfolio/new" options={{ presentation: "modal" }} />
            <Stack.Screen name="portfolio/[id]" />
            <Stack.Screen name="portfolio/history" />
            <Stack.Screen name="portfolio/report" />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
