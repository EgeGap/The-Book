import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { AIQuickLog } from "@/components/AIQuickLog";
import { TradeForm } from "@/components/TradeForm";
import { S } from "@/lib/strings";
import type { AiParsedTrade } from "@/lib/aiParse";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTradeStore } from "@/store/useTradeStore";
import type { TradeDraft } from "@/store/useTradeStore";

/** AI fields -> the form's `initial` (Partial<TradeDraft>); nulls become unset. */
function toInitial(d: AiParsedTrade): Partial<TradeDraft> {
  return {
    symbol: d.symbol ?? undefined,
    direction: d.direction ?? undefined,
    setupType: d.setupType ?? undefined,
    confluences: d.confluences,
    zone: d.zone ?? undefined,
    htfBias: d.htfBias ?? undefined,
    riskPercent: d.riskPercent ?? undefined,
    entry: d.entry ?? undefined,
    stopLoss: d.stopLoss ?? undefined,
    takeProfit: d.takeProfit ?? undefined,
    entryReason: d.entryReason || undefined,
  };
}

export default function NewTradeScreen() {
  const router = useRouter();
  const createTrade = useTradeStore((s) => s.createTrade);
  const saving = useTradeStore((s) => s.saving);
  const updateSettings = useSettingsStore((s) => s.update);

  const [aiDraft, setAiDraft] = useState<Partial<TradeDraft> | null>(null);
  const [formKey, setFormKey] = useState(0);

  const onParsed = (data: AiParsedTrade) => {
    setAiDraft(toInitial(data));
    setFormKey((k) => k + 1); // remount the form so it re-initializes prefilled
  };

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

        <AIQuickLog onParsed={onParsed} />

        {aiDraft ? (
          <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800">
            <Ionicons name="sparkles" size={14} color="#16C784" />
            <AppText variant="muted" className="flex-1">
              {S.ai.filled}
            </AppText>
          </View>
        ) : null}

        <TradeForm
          key={formKey}
          initial={aiDraft ?? undefined}
          submitting={saving}
          mode="create"
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
