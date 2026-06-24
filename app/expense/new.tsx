import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { ExpenseForm } from "@/components/ExpenseForm";
import { S } from "@/lib/strings";
import { useExpenseStore, type ExpenseDraft } from "@/store/useExpenseStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function NewExpenseScreen() {
  const router = useRouter();
  const createExpense = useExpenseStore((s) => s.createExpense);
  const saving = useExpenseStore((s) => s.saving);
  const updateSettings = useSettingsStore((s) => s.update);

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

        <ExpenseForm submitting={saving} onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
