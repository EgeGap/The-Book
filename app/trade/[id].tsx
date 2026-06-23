import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { isToday } from "date-fns";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import { TradeDetailView } from "@/components/TradeDetailView";
import { TradeForm } from "@/components/TradeForm";
import { CloseTradeForm } from "@/components/CloseTradeForm";
import { useTradeStore, type CloseTradePayload, type TradeDraft } from "@/store/useTradeStore";

type Mode = "view" | "edit" | "close";

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trade = useTradeStore((s) => s.trades.find((t) => t.id === id));
  const saving = useTradeStore((s) => s.saving);
  const { saveTrade, closeTrade, removeTrade } = useTradeStore();
  const [mode, setMode] = useState<Mode>("view");
  const [notes, setNotes] = useState(trade?.notes ?? "");

  if (!trade) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <AppText variant="heading">İşlem bulunamadı</AppText>
          <Button label="Geri dön" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const isClosed = trade.status === "closed";

  const confirmDelete = () => {
    const today = isToday(new Date(trade.createdAt));
    Alert.alert(
      "İşlem silinsin mi?",
      today
        ? "Bu, bugünün işlemlerinden biri. Silme işlemi kalıcıdır."
        : "Bu işlem kalıcı olarak silinecek.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            await removeTrade(trade.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleEditSubmit = async (draft: TradeDraft, status: "planned" | "open") => {
    await saveTrade({ ...trade, ...draft, status });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMode("view");
  };

  const handleClose = async (payload: CloseTradePayload) => {
    try {
      const closed = await closeTrade(trade.id, payload);
      if (closed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setMode("view");
      }
    } catch (e) {
      Alert.alert("Kapatılamıyor", e instanceof Error ? e.message : "Bilinmeyen hata");
    }
  };

  const saveNotes = async () => {
    await saveTrade({ ...trade, notes: notes.trim() });
    Haptics.selectionAsync().catch(() => {});
    setMode("view");
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable onPress={() => (mode === "view" ? router.back() : setMode("view"))} hitSlop={12}>
            <Ionicons name={mode === "view" ? "chevron-back" : "close"} size={26} color="#8E8E93" />
          </Pressable>
          <AppText variant="heading">
            {mode === "close" ? "İşlemi kapat" : mode === "edit" ? "İşlemi düzenle" : "İşlem detayı"}
          </AppText>
          <Pressable onPress={confirmDelete} hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color="#EA3943" />
          </Pressable>
        </View>

        {mode === "view" ? (
          <View className="gap-4">
            <TradeDetailView trade={trade} />
            {!isClosed ? (
              <View className="gap-3">
                <Button label="İşlemi kapat" icon="checkmark-done" onPress={() => setMode("close")} />
                <Button
                  label="İşlemi düzenle"
                  variant="secondary"
                  icon="create-outline"
                  onPress={() => setMode("edit")}
                />
              </View>
            ) : (
              <Button
                label="Notları düzenle"
                variant="secondary"
                icon="create-outline"
                onPress={() => {
                  setNotes(trade.notes);
                  setMode("edit");
                }}
              />
            )}
          </View>
        ) : null}

        {mode === "edit" && !isClosed ? (
          <TradeForm
            initial={trade}
            submitting={saving}
            mode="edit"
            onSubmit={handleEditSubmit}
          />
        ) : null}

        {mode === "edit" && isClosed ? (
          <View>
            <Field label="Notlar (kapandıktan sonra düzenlenebilen tek alan)">
              <TextField
                value={notes}
                onChangeText={setNotes}
                multiline
                className="h-32"
                style={{ textAlignVertical: "top" }}
              />
            </Field>
            <Button label="Notları kaydet" icon="save-outline" loading={saving} onPress={saveNotes} />
          </View>
        ) : null}

        {mode === "close" ? (
          <CloseTradeForm
            trade={trade}
            submitting={saving}
            onConfirm={handleClose}
            onCancel={() => setMode("view")}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
