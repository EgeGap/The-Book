import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { ExpenseForm } from "@/components/ExpenseForm";
import { S } from "@/lib/strings";
import { useExpenseStore, type ExpenseDraft } from "@/store/useExpenseStore";

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const expense = useExpenseStore((s) => s.expenses.find((e) => e.id === id));
  const saving = useExpenseStore((s) => s.saving);
  const { saveExpense, togglePause, removeExpense } = useExpenseStore();

  if (!expense) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <AppText variant="heading">{S.expense.notFound}</AppText>
          <Button label={S.common.back} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const handleSubmit = async (draft: ExpenseDraft) => {
    await saveExpense({ ...expense, ...draft });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert(S.expense.deleteTitle, S.expense.deleteBody, [
      { text: S.common.cancel, style: "cancel" },
      {
        text: S.expense.delete,
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          await removeExpense(expense.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color="#8E8E93" />
          </Pressable>
          <AppText variant="heading">{S.expense.editTitle}</AppText>
          <Pressable onPress={confirmDelete} hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color="#EA3943" />
          </Pressable>
        </View>

        {/* Pause is emphasized over delete — stop counting without cancelling */}
        <View className="mb-4">
          <Button
            label={expense.active ? S.expense.pause : S.expense.resume}
            variant={expense.active ? "secondary" : "win"}
            icon={expense.active ? "pause" : "play"}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              togglePause(expense.id);
            }}
          />
        </View>

        <ExpenseForm initial={expense} submitting={saving} onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
