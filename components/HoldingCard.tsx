import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { CurrencyToggle } from "./CurrencyToggle";
import type { Currency } from "@/lib/constants";
import {
  holdingCostTotal,
  holdingCurrentValue,
  holdingDailyChange,
  holdingGainPercent,
} from "@/lib/portfolioAnalytics";
import { convert, type FxRates } from "@/lib/expenseAnalytics";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { useColors } from "@/lib/theme";
import type { DailyQuote, StockHolding } from "@/lib/types";
import type { ProfitMode } from "./ProfitCard";

interface HoldingCardProps {
  holding: StockHolding;
  /** Currency this card shows on first render; each card then toggles independently. */
  defaultCurrency: Currency;
  rates: FxRates;
  /** When true, masks every amount on the card — only the gain% stays visible. */
  hideBalance: boolean;
  /** Mirrors the ProfitCard toggle above: "all" = vs. cost, "daily" = vs. previous close. */
  mode: ProfitMode;
  dailyQuote: DailyQuote | undefined;
  dailyLoading: boolean;
  onPress: () => void;
  onDelete: () => void;
  onSell: (quantity: number) => void;
  onBuyMore: (quantity: number, pricePerUnit: number) => void;
}

export function HoldingCard({
  holding,
  defaultCurrency,
  rates,
  hideBalance,
  mode,
  dailyQuote,
  dailyLoading,
  onPress,
  onDelete,
  onSell,
  onBuyMore,
}: HoldingCardProps) {
  const c = useColors();
  const [currency, setCurrency] = useState(defaultCurrency);
  const [showSell, setShowSell] = useState(false);
  const [sellQty, setSellQty] = useState("");
  const [showBuy, setShowBuy] = useState(false);
  const [buyQty, setBuyQty] = useState("");
  const [buyPrice, setBuyPrice] = useState("");

  const unit = holding.market === "EMTIA" ? "gram" : "adet";

  const handleBuyConfirm = () => {
    const qty = parseFloat(buyQty.replace(",", "."));
    const price = parseFloat(buyPrice.replace(",", "."));
    if (!qty || qty <= 0 || !price || price <= 0) {
      Alert.alert(S.portfolio.buyMoreTitle, S.portfolio.buyMoreInvalid);
      return;
    }
    setShowBuy(false);
    setBuyQty("");
    setBuyPrice("");
    onBuyMore(qty, price);
  };

  const handleSellConfirm = () => {
    const qty = parseFloat(sellQty.replace(",", "."));
    if (!qty || qty <= 0) {
      Alert.alert(S.portfolio.sellTitle, S.portfolio.sellInvalid);
      return;
    }
    if (qty > holding.quantity) {
      Alert.alert(S.portfolio.sellTitle, S.portfolio.sellExceeds(holding.quantity, unit));
      return;
    }
    setShowSell(false);
    setSellQty("");
    onSell(qty);
  };

  // Both totals are converted into this card's own selected currency, so each
  // holding can be read in ₺ or $ independently of the others.
  const cost = convert(holdingCostTotal(holding), holding.costCurrency, rates, currency);
  const rawValue = holdingCurrentValue(holding);
  const value =
    rawValue != null && holding.lastPriceCurrency != null
      ? convert(rawValue, holding.lastPriceCurrency, rates, currency)
      : null;
  const gainPct = holdingGainPercent(holding, rates, currency);
  const daily = mode === "daily" ? holdingDailyChange(holding, dailyQuote, rates, currency) : null;

  const pct = mode === "daily" ? daily?.percent ?? null : gainPct;
  const tone = pct == null ? "" : pct >= 0 ? "text-win" : "text-loss";
  const pctBg = pct == null ? "" : pct >= 0 ? "bg-green-500" : "bg-red-500";

  const marketAccent =
    holding.market === "BIST" ? "bg-red-500" :
    holding.market === "US"   ? "bg-blue-500" :
                                "bg-amber-500";
  const marketBadgeBg =
    holding.market === "BIST" ? "bg-red-100 dark:bg-red-900/30" :
    holding.market === "US"   ? "bg-blue-100 dark:bg-blue-900/30" :
                                "bg-amber-100 dark:bg-amber-900/30";
  const marketBadgeText =
    holding.market === "BIST" ? "text-red-600 dark:text-red-400" :
    holding.market === "US"   ? "text-blue-600 dark:text-blue-400" :
                                "text-amber-600 dark:text-amber-400";

  const dailyValue = dailyQuote ? convert(holding.quantity * dailyQuote.current, dailyQuote.currency, rates, currency) : null;
  const rightValue = mode === "daily" ? dailyValue : value ?? cost;
  const subLabel =
    mode === "daily"
      ? daily
        ? `${daily.amount >= 0 ? "+" : ""}${formatAmount(daily.amount, currency)}`
        : null
      : formatAmount(cost, currency);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className={`h-10 w-1.5 rounded-full ${marketAccent}`} />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="heading" numberOfLines={1} className="max-w-[60%]">
            {holding.symbol}
          </AppText>
          <View className={`rounded-md px-2 py-0.5 ${marketBadgeBg}`}>
            <AppText className={`text-[10px] font-bold ${marketBadgeText}`}>
              {holding.market === "BIST"
                ? S.portfolio.marketBist
                : holding.market === "US"
                  ? S.portfolio.marketUs
                  : S.portfolio.marketEmtia}
            </AppText>
          </View>
        </View>
        <AppText variant="muted" numberOfLines={1} className="mt-0.5">
          {S.portfolio.costLabel(
            hideBalance ? S.portfolio.hiddenValue : String(holding.quantity),
            hideBalance ? S.portfolio.hiddenValue : subLabel ?? S.portfolio.priceUnavailable,
            holding.market === "EMTIA" ? "gram" : "adet",
          )}
        </AppText>
      </View>

      <CurrencyToggle value={currency} onChange={setCurrency} />

      {/* Fixed width (not min-width): TRY amounts run longer than USD ones, and a
          width that changes with the formatted text would push the CurrencyToggle
          sideways every time the currency is switched. */}
      <View className="w-28 items-end">
        {mode === "daily" && dailyLoading && !dailyQuote ? (
          <ActivityIndicator size="small" color={c.accent} />
        ) : (
          <>
            <AppText
              variant="body"
              className="font-semibold"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {hideBalance ? S.portfolio.hiddenValue : rightValue != null ? formatAmount(rightValue, currency) : "—"}
            </AppText>
            {pct != null ? (
              <View className={`mt-0.5 rounded-md dark:border-2 dark:border-black px-1.5 py-0.5 ${pctBg}`}>
                <AppText
                  className="text-xs font-bold text-white"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ textShadowColor: "#000", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 }}
                >
                  {pct >= 0 ? "+" : ""}
                  {pct.toFixed(1)}%
                </AppText>
              </View>
            ) : (
              <AppText variant="muted">{S.portfolio.priceUnavailable}</AppText>
            )}
          </>
        )}
      </View>

      <Pressable onPress={() => { setBuyQty(""); setBuyPrice(""); setShowBuy(true); }} hitSlop={10} className="ml-1 p-1.5">
        <Ionicons name="add-circle-outline" size={18} color="#34C759" />
      </Pressable>

      <Pressable onPress={() => { setSellQty(""); setShowSell(true); }} hitSlop={10} className="p-1.5">
        <Ionicons name="remove-circle-outline" size={18} color="#FF9500" />
      </Pressable>

      <Pressable onPress={onDelete} hitSlop={10} className="p-1.5">
        <Ionicons name="trash-outline" size={18} color="#EA3943" />
      </Pressable>

      <Modal visible={showBuy} transparent animationType="fade" onRequestClose={() => setShowBuy(false)}>
        <Pressable className="flex-1 justify-end bg-black/60 pb-10" onPress={() => setShowBuy(false)}>
          <Pressable
            className="mx-4 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            onPress={() => {}}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="label">{holding.symbol} — {S.portfolio.buyMoreTitle}</AppText>
              <Pressable onPress={() => setShowBuy(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <AppText variant="muted" className="mb-3">
              {S.portfolio.sellCurrent(holding.quantity, unit)}
            </AppText>

            <TextInput
              value={buyQty}
              onChangeText={setBuyQty}
              keyboardType="decimal-pad"
              placeholder={`${S.portfolio.buyMoreQuantity} (${unit})`}
              placeholderTextColor={c.textMuted}
              style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, fontSize: 16, marginBottom: 12 }}
            />
            <TextInput
              value={buyPrice}
              onChangeText={setBuyPrice}
              keyboardType="decimal-pad"
              placeholder={`${S.portfolio.buyMorePrice} (${holding.costCurrency})`}
              placeholderTextColor={c.textMuted}
              style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, fontSize: 16, marginBottom: 12 }}
            />

            <Pressable onPress={handleBuyConfirm} className="items-center rounded-xl bg-accent py-3">
              <AppText className="font-bold text-white">{S.portfolio.buyMoreConfirm}</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showSell} transparent animationType="fade" onRequestClose={() => setShowSell(false)}>
        <Pressable className="flex-1 justify-end bg-black/60 pb-10" onPress={() => setShowSell(false)}>
          <Pressable
            className="mx-4 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            onPress={() => {}}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="label">{holding.symbol} — {S.portfolio.sellTitle}</AppText>
              <Pressable onPress={() => setShowSell(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <AppText variant="muted" className="mb-3">
              {S.portfolio.sellCurrent(holding.quantity, unit)}
            </AppText>

            <TextInput
              value={sellQty}
              onChangeText={setSellQty}
              keyboardType="decimal-pad"
              placeholder={S.portfolio.sellPlaceholder}
              placeholderTextColor={c.textMuted}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                padding: 12,
                color: c.text,
                fontSize: 16,
                marginBottom: 12,
              }}
            />

            <Pressable
              onPress={() => setSellQty(String(holding.quantity))}
              className="mb-3 items-center rounded-xl border border-neutral-200 py-2.5 dark:border-neutral-700"
            >
              <AppText className="font-semibold text-accent">{S.portfolio.sellAll}</AppText>
            </Pressable>

            <Pressable
              onPress={handleSellConfirm}
              className="items-center rounded-xl bg-accent py-3"
            >
              <AppText className="font-bold text-white">{S.portfolio.sellConfirm}</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}
