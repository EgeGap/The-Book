import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { TradeForm } from "@/components/TradeForm";
import { S } from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTradeStore } from "@/store/useTradeStore";
import type { TradeDraft } from "@/store/useTradeStore";

export default function NewTradeScreen() {
  const router = useRouter();
  const createTrade = useTradeStore((s) => s.createTrade);
  const saving = useTradeStore((s) => s.saving);
  const updateSettings = useSettingsStore((s) => s.update);

  const handleSubmit = async (draft: TradeDraft) => {
    const created = await createTrade(draft);
    if (!created) return;
    updateSettings({
      lastUsed: {
        symbol: draft.symbol,
        riskPercent: draft.riskPercent,
        biasTimeframe: draft.biasTimeframe,
        entryTimeframe: draft.entryTimeframe,
        htfBias: draft.htfBias,
      },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(`/trade/${created.id}`);
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <AppText variant="title">{S.trade.new}</AppText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#8E8E93" />
          </Pressable>
        </View>

        <TradeForm submitting={saving} mode="create" onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
