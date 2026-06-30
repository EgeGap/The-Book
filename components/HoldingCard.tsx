import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
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
}: HoldingCardProps) {
  const c = useColors();
  const [currency, setCurrency] = useState(defaultCurrency);

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
      <View className="h-10 w-1.5 rounded-full bg-accent" />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="heading" numberOfLines={1} className="max-w-[60%]">
            {holding.symbol}
          </AppText>
          <View className="rounded-md bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700">
            <AppText className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
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
              <AppText className={`font-semibold ${tone}`} numberOfLines={1} adjustsFontSizeToFit>
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </AppText>
            ) : (
              <AppText variant="muted">{S.portfolio.priceUnavailable}</AppText>
            )}
          </>
        )}
      </View>

      <Pressable onPress={onDelete} hitSlop={10} className="ml-1 p-1.5">
        <Ionicons name="trash-outline" size={18} color="#EA3943" />
      </Pressable>
    </Pressable>
  );
}
