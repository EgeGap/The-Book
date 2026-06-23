import { useMemo, useState } from "react";
import { View } from "react-native";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { Field, TextField } from "./ui/Field";
import { Segmented } from "./ui/Segmented";
import { MistakeTagger } from "./MistakeTagger";
import { ScreenshotUploader } from "./ScreenshotUploader";
import { RMultipleBadge } from "./RMultipleBadge";
import { RESULTS, type MistakeTag, type TradeResult } from "@/lib/constants";
import { RESULT_LABELS } from "@/lib/strings";
import { pnlFromR, realizedRR as calcRealizedRR } from "@/lib/rr";
import { formatMoney, parseNum } from "@/lib/utils";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { CloseTradePayload } from "@/store/useTradeStore";
import type { Trade } from "@/lib/types";

interface CloseTradeFormProps {
  trade: Trade;
  submitting: boolean;
  onConfirm: (payload: CloseTradePayload) => void;
  onCancel: () => void;
}

export function CloseTradeForm({ trade, submitting, onConfirm, onCancel }: CloseTradeFormProps) {
  const startingBalance = useSettingsStore((s) => s.startingBalance);
  const [result, setResult] = useState<TradeResult>("win");
  const [exit, setExit] = useState(trade.takeProfit.toString());
  const [mistakes, setMistakes] = useState<MistakeTag[]>(trade.mistakes);
  const [notes, setNotes] = useState(trade.notes);
  const [screenshots, setScreenshots] = useState<string[]>(trade.screenshots);

  const exitN = parseNum(exit);
  const isBE = result === "breakeven";

  const preview = useMemo(() => {
    const r = isBE
      ? 0
      : calcRealizedRR(
          { direction: trade.direction, entry: trade.entry, stopLoss: trade.stopLoss },
          exitN,
        );
    if (r == null) return null;
    return { r, pnl: pnlFromR(r, trade.riskPercent, startingBalance) };
  }, [isBE, exitN, trade, startingBalance]);

  const canConfirm = !submitting && (isBE || preview != null);

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({
      result,
      exitPrice: isBE && !Number.isFinite(exitN) ? trade.entry : exitN,
      mistakes,
      notes: notes.trim(),
      screenshots,
    });
  };

  return (
    <View>
      <Field label="Sonuç">
        <Segmented
          value={result}
          onChange={setResult}
          options={RESULTS.map((r) => ({ label: RESULT_LABELS[r], value: r }))}
        />
      </Field>

      <Field label="Çıkış fiyatı" required={!isBE} hint={isBE ? "Başabaş için yok sayılır" : undefined}>
        <TextField value={exit} onChangeText={setExit} placeholder="0.00" keyboardType="decimal-pad" />
      </Field>

      <Card className="mb-4 flex-row items-center justify-between">
        <View>
          <AppText variant="label">Gerçekleşen sonuç</AppText>
          <AppText
            className="text-base font-bold"
            style={{ color: preview && preview.pnl >= 0 ? "#16C784" : "#EA3943" }}
          >
            {preview ? formatMoney(preview.pnl) : "—"}
          </AppText>
        </View>
        <RMultipleBadge r={preview ? preview.r : null} />
      </Card>

      <Field label="Yapılan hatalar (dürüst ol!)">
        <MistakeTagger value={mistakes} onChange={setMistakes} />
      </Field>

      <Field label="Sonrası ekran görüntüsü">
        <ScreenshotUploader value={screenshots} onChange={setScreenshots} max={4} />
      </Field>

      <Field label="Notlar">
        <TextField
          value={notes}
          onChangeText={setNotes}
          placeholder="Nasıl sonuçlandı? Ne öğrendin?"
          multiline
          className="h-24"
          style={{ textAlignVertical: "top" }}
        />
      </Field>

      <View className="gap-3">
        <Button
          label="İşlemi kapat"
          onPress={confirm}
          disabled={!canConfirm}
          loading={submitting}
          variant={result === "loss" ? "danger" : "win"}
          icon="checkmark-done"
        />
        <Button label="İptal" onPress={onCancel} variant="ghost" />
      </View>
    </View>
  );
}
