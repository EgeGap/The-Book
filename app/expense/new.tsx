import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { ExpenseForm } from "@/components/ExpenseForm";
import { AIQuickExpense } from "@/components/AIQuickExpense";
import { S } from "@/lib/strings";
import type { AiParsedExpense } from "@/lib/aiParse";
import { useExpenseStore, type ExpenseDraft } from "@/store/useExpenseStore";
import { useSettingsStore } from "@/store/useSettingsStore";

/** AI fields -> the form's `initial` (Partial<ExpenseDraft>); nulls become unset. */
function toInitial(d: AiParsedExpense): Partial<ExpenseDraft> {
  return {
    name: d.name ?? undefined,
    amount: d.amount ?? undefined,
    currency: d.currency ?? undefined,
    category: d.category ?? undefined,
    cycle: d.cycle ?? undefined,
    billingDay: d.billingDay ?? undefined,
  };
}

export default function NewExpenseScreen() {
  const router = useRouter();
  const createExpense = useExpenseStore((s) => s.createExpense);
  const saving = useExpenseStore((s) => s.saving);
  const updateSettings = useSettingsStore((s) => s.update);

  const [aiDraft, setAiDraft] = useState<Partial<ExpenseDraft> | null>(null);
  const [formKey, setFormKey] = useState(0);

  const onParsed = (data: AiParsedExpense) => {
    setAiDraft(toInitial(data));
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (draft: ExpenseDraft) => {
    const created = await createExpense(draft);
    if (!created) return;
    updateSettings({ lastUsedExpense: { currency: draft.currency, category: draft.category } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <AppText variant="title">{S.expense.add}</AppText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#8E8E93" />
          </Pressable>
        </View>

        <AIQuickExpense onParsed={onParsed} />

        {aiDraft ? (
          <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800">
            <Ionicons name="sparkles" size={14} color="#16C784" />
            <AppText variant="muted" className="flex-1">
              {S.ai.filled}
            </AppText>
          </View>
        ) : null}

        <ExpenseForm key={formKey} initial={aiDraft ?? undefined} submitting={saving} onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
