import { useState } from "react";
import { View } from "react-native";
import { Button } from "./ui/Button";
import { AppText } from "./ui/Text";
import { Field, TextField } from "./ui/Field";
import { Segmented } from "./ui/Segmented";
import { COMMODITIES, CURRENCIES, STOCK_MARKETS } from "@/lib/constants";
import { S } from "@/lib/strings";
import { parseNum } from "@/lib/utils";
import type { HoldingDraft } from "@/store/usePortfolioStore";

interface HoldingFormProps {
  initial?: Partial<HoldingDraft>;
  submitting: boolean;
  onSubmit: (draft: HoldingDraft) => void;
  showAlerts?: boolean;
}

export function HoldingForm({ initial, submitting, onSubmit, showAlerts = false }: HoldingFormProps) {
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [market, setMarket] = useState(initial?.market ?? "BIST");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const [costBasis, setCostBasis] = useState(initial?.costBasis?.toString() ?? "");
  const [costCurrency, setCostCurrency] = useState(initial?.costCurrency ?? "TRY");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [targetPrice, setTargetPrice] = useState(initial?.targetPrice?.toString() ?? "");
  const [stopLoss, setStopLoss] = useState(initial?.stopLoss?.toString() ?? "");

  const quantityN = parseNum(quantity);
  const costN = parseNum(costBasis);
  const canSubmit =
    symbol.trim().length > 0 &&
    Number.isFinite(quantityN) &&
    quantityN > 0 &&
    Number.isFinite(costN) &&
    costN > 0 &&
    !submitting;

  const changeMarket = (m: typeof market) => {
    setMarket(m);
    if (m === "EMTIA") setSymbol(COMMODITIES[0].symbol);
    else if (COMMODITIES.some((c) => c.symbol === symbol)) setSymbol("");
  };

  const submit = () => {
    if (!canSubmit) return;
    const tp = targetPrice.trim() ? parseNum(targetPrice) : null;
    const sl = stopLoss.trim() ? parseNum(stopLoss) : null;
    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      market,
      quantity: quantityN,
      costBasis: costN,
      costCurrency,
      purchasedAt: initial?.purchasedAt ?? Date.now(),
      notes: notes.trim(),
      targetPrice: tp != null && Number.isFinite(tp) ? tp : null,
      stopLoss: sl != null && Number.isFinite(sl) ? sl : null,
    });
  };

  return (
    <View>
      <Field label={S.portfolio.market}>
        <Segmented
          value={market}
          onChange={changeMarket}
          options={STOCK_MARKETS.map((m) => ({
            label: m === "BIST" ? S.portfolio.marketBist : m === "US" ? S.portfolio.marketUs : S.portfolio.marketEmtia,
            value: m,
          }))}
        />
      </Field>

      {market === "EMTIA" ? (
        <Field label={S.portfolio.commodity} required>
          <Segmented
            value={symbol}
            onChange={setSymbol}
            options={COMMODITIES.map((c) => ({ label: c.label, value: c.symbol }))}
          />
        </Field>
      ) : (
        <Field label={S.portfolio.symbol} required>
          <TextField
            value={symbol}
            onChangeText={setSymbol}
            placeholder={S.portfolio.symbolPlaceholder}
            autoCapitalize="characters"
          />
        </Field>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label={market === "EMTIA" ? S.portfolio.quantityGram : S.portfolio.quantity} required>
            <TextField value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" />
          </Field>
        </View>
        <View className="flex-1">
          <Field label={market === "EMTIA" ? S.portfolio.costBasisGram : S.portfolio.costBasis} required>
            <TextField value={costBasis} onChangeText={setCostBasis} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      <Field label={S.portfolio.costCurrency}>
        <Segmented value={costCurrency} onChange={setCostCurrency} options={CURRENCIES.map((c) => ({ label: c, value: c }))} />
      </Field>

      <Field label={S.portfolio.notes}>
        <TextField value={notes} onChangeText={setNotes} multiline className="h-20" style={{ textAlignVertical: "top" }} />
      </Field>

      {showAlerts && (
        <>
          <AppText variant="label" className="mb-2 mt-1">{S.portfolio.targetPrice} / {S.portfolio.stopLoss}</AppText>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={S.portfolio.targetPrice}>
                <TextField value={targetPrice} onChangeText={setTargetPrice} placeholder="—" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View className="flex-1">
              <Field label={S.portfolio.stopLoss}>
                <TextField value={stopLoss} onChangeText={setStopLoss} placeholder="—" keyboardType="decimal-pad" />
              </Field>
            </View>
          </View>
          <AppText variant="muted" className="mb-2 ml-1">{S.portfolio.alertHint}</AppText>
        </>
      )}

      <Button label={S.portfolio.save} icon="save-outline" loading={submitting} disabled={!canSubmit} onPress={submit} />
    </View>
  );
}
