import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { TextField } from "./ui/Field";
import { parseExpenseSentence, type AiParsedExpense } from "@/lib/aiParse";
import { S } from "@/lib/strings";

interface AIQuickExpenseProps {
  onParsed: (data: AiParsedExpense) => void;
}

/** "Hızlı Gider Ekle (AI)" — reuses the shared aiParse infra (optional feature). */
export function AIQuickExpense({ onParsed }: AIQuickExpenseProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (busy || text.trim().length === 0) return;
    setBusy(true);
    setError(null);
    const res = await parseExpenseSentence(text.trim());
    setBusy(false);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onParsed(res.data);
    } else {
      setError(
        res.reason === "no-key" ? S.ai.noKey : res.reason === "network" ? S.ai.network : S.ai.failed,
      );
    }
  };

  // Voice input stub (see AIQuickLog.tsx) — text-only for now.
  const onMic = () => Alert.alert(S.ai.mic, S.ai.micOff);

  return (
    <Card className="mb-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Ionicons name="sparkles" size={18} color="#7C5CFC" />
        <AppText variant="heading">{S.expense.aiTitle}</AppText>
      </View>
      <AppText variant="muted" className="mb-3">
        {S.expense.aiIntro}
      </AppText>

      <View className="flex-row items-start gap-2">
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={S.expense.aiPlaceholder}
          multiline
          className="h-20 flex-1"
          style={{ textAlignVertical: "top" }}
        />
        <Pressable
          onPress={onMic}
          className="h-12 w-12 items-center justify-center rounded-xl bg-neutral-200 dark:bg-neutral-800"
        >
          <Ionicons name="mic-outline" size={20} color="#8E8E93" />
        </Pressable>
      </View>

      {error ? <AppText className="mt-2 text-sm text-loss">{error}</AppText> : null}
      {busy ? <AppText variant="muted" className="mt-2">{S.ai.parsing}</AppText> : null}

      <View className="mt-3">
        <Button label={S.ai.parse} icon="sparkles" onPress={run} loading={busy} disabled={text.trim().length === 0} />
      </View>
    </Card>
  );
}
