import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { HoldingForm } from "@/components/HoldingForm";
import { S } from "@/lib/strings";
import { usePortfolioStore, type HoldingDraft } from "@/store/usePortfolioStore";

export default function NewHoldingScreen() {
  const router = useRouter();
  const addHolding = usePortfolioStore((s) => s.addHolding);
  const saving = usePortfolioStore((s) => s.saving);

  const handleSubmit = async (draft: HoldingDraft) => {
    const created = await addHolding(draft);
    if (!created) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <AppText variant="title">{S.portfolio.add}</AppText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#8E8E93" />
          </Pressable>
        </View>

        <HoldingForm submitting={saving} onSubmit={handleSubmit} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
