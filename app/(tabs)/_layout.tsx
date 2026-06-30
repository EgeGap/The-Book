import { Pressable } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/theme";
import { S } from "@/lib/strings";

function NewExpenseButton() {
  const router = useRouter();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        router.push("/expense/new");
      }}
      className="mr-4 h-9 w-9 items-center justify-center rounded-full bg-accent"
    >
      <Ionicons name="add" size={22} color="white" />
    </Pressable>
  );
}

function NewHoldingButton() {
  const router = useRouter();
  return (
    <Pressable
      hitSlop={12}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        router.push("/portfolio/new");
      }}
      className="mr-4 h-9 w-9 items-center justify-center rounded-full bg-accent"
    >
      <Ionicons name="add" size={22} color="white" />
    </Pressable>
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { color: c.text, fontWeight: "700" },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: S.expense.tab,
          headerRight: () => <NewExpenseButton />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: S.portfolio.tab,
          headerRight: () => <NewHoldingButton />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: S.tabs.settings,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
