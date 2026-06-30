import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { Segmented } from "./ui/Segmented";
import type { Currency } from "@/lib/constants";
import { dailyChange, portfolioSummary, type ProfitResult } from "@/lib/portfolioAnalytics";
import type { FxRates } from "@/lib/expenseAnalytics";
import type { DailyQuote, StockHolding } from "@/lib/types";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { useColors } from "@/lib/theme";

export type ProfitMode = "all" | "daily";

interface ProfitCardProps {
  holdings: StockHolding[];
  rates: FxRates;
  base: Currency;
  /** Hide the absolute amount, leaving only the percentage. */
  hideBalance: boolean;
  mode: ProfitMode;
  onModeChange: (m: ProfitMode) => void;
  /** Daily quotes fetched by the parent (shared with the holding cards below); null until fetched. */
  dailyQuotes: DailyQuote[] | null;
  dailyLoading: boolean;
}

/**
 * Two profit/loss views, toggled by the parent (which also feeds the same toggle
 * down to every holding card below, so they switch together):
 *  - "Tümü": total return versus what you paid (cost basis) — uses the last refreshed prices.
 *  - "Günlük": today's move versus the previous close.
 */
export function ProfitCard({
  holdings,
  rates,
  base,
  hideBalance,
  mode,
  onModeChange,
  dailyQuotes,
  dailyLoading,
}: ProfitCardProps) {
  const c = useColors();

  const allResult = useMemo<ProfitResult>(() => {
    const s = portfolioSummary(holdings, rates, base);
    return { amount: s.gainAmount, percent: s.gainPercent };
  }, [holdings, rates, base]);

  const dailyResult = useMemo<ProfitResult | null>(
    () => (dailyQuotes ? dailyChange(holdings, dailyQuotes, rates, base) : null),
    [holdings, dailyQuotes, rates, base],
  );

  const result = mode === "all" ? allResult : dailyResult;
  const pct = result?.percent ?? null;
  const positive = (pct ?? 0) >= 0;
  const showSpinner = mode === "daily" && dailyLoading;

  return (
    <Card className="mb-4">
      <AppText variant="label" className="mb-3">
        {S.portfolio.gain}
      </AppText>

      <Segmented
        value={mode}
        onChange={onModeChange}
        options={[
          { label: S.portfolio.modeAll, value: "all" },
          { label: S.portfolio.modeDaily, value: "daily" },
        ]}
      />

      <View className="mt-4 min-h-[56px] justify-center">
        {showSpinner ? (
          <ActivityIndicator color={c.accent} />
        ) : pct == null ? (
          <AppText variant="muted">{S.portfolio.profitUnavailable}</AppText>
        ) : (
          <View className="flex-row items-baseline gap-3">
            <AppText className={`text-3xl font-bold ${positive ? "text-win" : "text-loss"}`}>
              {positive ? "+" : ""}
              {pct.toFixed(2)}%
            </AppText>
            {!hideBalance && result ? (
              <AppText className={`text-base font-semibold ${positive ? "text-win" : "text-loss"}`}>
                {result.amount >= 0 ? "+" : ""}
                {formatAmount(result.amount, base)}
              </AppText>
            ) : null}
          </View>
        )}
      </View>

      <AppText variant="muted" className="mt-3">
        {mode === "all" ? S.portfolio.noteAll : S.portfolio.noteDaily}
      </AppText>
    </Card>
  );
}
