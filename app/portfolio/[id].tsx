import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { HoldingForm } from "@/components/HoldingForm";
import { S } from "@/lib/strings";
import { usePortfolioStore, type HoldingDraft } from "@/store/usePortfolioStore";

export default function HoldingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const holding = usePortfolioStore((s) => s.holdings.find((h) => h.id === id));
  const saving = usePortfolioStore((s) => s.saving);
  const { saveHolding, removeHolding } = usePortfolioStore();

  if (!holding) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <AppText variant="heading">{S.portfolio.notFound}</AppText>
          <Button label={S.common.back} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const handleSubmit = async (draft: HoldingDraft) => {
    await saveHolding({ ...holding, ...draft });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert(S.portfolio.deleteTitle, S.portfolio.deleteBody, [
      { text: S.common.cancel, style: "cancel" },
      {
        text: S.portfolio.delete,
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          await removeHolding(holding.id);
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
          <AppText variant="heading">{S.portfolio.editTitle}</AppText>
          <Pressable onPress={confirmDelete} hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color="#EA3943" />
          </Pressable>
        </View>

        <HoldingForm initial={holding} submitting={saving} onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
