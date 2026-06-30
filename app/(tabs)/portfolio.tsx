import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { StatTile } from "@/components/StatTile";
import { ProfitCard, type ProfitMode } from "@/components/ProfitCard";
import { HoldingCard } from "@/components/HoldingCard";
import { portfolioSummary } from "@/lib/portfolioAnalytics";
import { fetchAllDailyQuotes } from "@/lib/stockPrices";
import type { DailyQuote } from "@/lib/types";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function PortfolioScreen() {
  const router = useRouter();
  const holdings = usePortfolioStore((s) => s.holdings);
  const removeHolding = usePortfolioStore((s) => s.removeHolding);
  const refreshPrices = usePortfolioStore((s) => s.refreshPrices);
  const refreshing = usePortfolioStore((s) => s.refreshing);
  const base = useSettingsStore((s) => s.baseCurrency);
  const usdToTry = useSettingsStore((s) => s.usdToTry);
  const rates = useMemo(() => ({ usdToTry }), [usdToTry]);
  const [summaryCurrency, setSummaryCurrency] = useState(base);
  const [hideBalance, setHideBalance] = useState(false);

  // Shared with both the profit card and every holding card below, so switching
  // Tümü/Günlük once re-fetches/re-renders everything together instead of each
  // card independently hitting the (rate-limited) quote endpoint.
  const [mode, setMode] = useState<ProfitMode>("all");
  const [dailyQuotes, setDailyQuotes] = useState<DailyQuote[] | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const dailyFetched = useRef(false);

  useEffect(() => {
    if (mode !== "daily" || dailyFetched.current) return;
    dailyFetched.current = true;
    setDailyLoading(true);
    fetchAllDailyQuotes(holdings).then((q) => {
      setDailyQuotes(q);
      setDailyLoading(false);
    });
  }, [mode, holdings]);

  const summary = useMemo(
    () => portfolioSummary(holdings, rates, summaryCurrency),
    [holdings, rates, summaryCurrency],
  );

  const handleRefreshPrices = async () => {
    const updatedCount = await refreshPrices();
    if (updatedCount > 0) {
      Alert.alert(S.portfolio.refreshDoneTitle, S.portfolio.refreshDoneBody(updatedCount));
      return;
    }
    Alert.alert(S.portfolio.refreshFailTitle, S.portfolio.refreshFailBody);
  };

  const confirmDelete = (id: string, symbol: string) =>
    Alert.alert(S.portfolio.deleteTitle, `${symbol} — ${S.portfolio.deleteBody}`, [
      { text: S.common.cancel, style: "cancel" },
      { text: S.portfolio.delete, style: "destructive", onPress: () => removeHolding(id) },
    ]);

  if (holdings.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="trending-up-outline"
          title={S.portfolio.empty}
          ctaLabel={S.portfolio.emptyAdd}
          onCta={() => router.push("/portfolio/new")}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <AppText variant="label">{S.portfolio.summaryTitle}</AppText>
          <Pressable onPress={() => setHideBalance((v) => !v)} hitSlop={10}>
            <Ionicons
              name={hideBalance ? "eye-off-outline" : "eye-outline"}
              size={16}
              color="#8E8E93"
            />
          </Pressable>
        </View>
        <CurrencyToggle value={summaryCurrency} onChange={setSummaryCurrency} />
      </View>

      <View className="mb-4 flex-row gap-3">
        <StatTile
          label={S.portfolio.totalCost}
          value={hideBalance ? S.portfolio.hiddenValue : formatAmount(summary.totalCost, summaryCurrency)}
          icon="wallet-outline"
        />
        <StatTile
          label={S.portfolio.totalValue}
          value={hideBalance ? S.portfolio.hiddenValue : formatAmount(summary.totalValue, summaryCurrency)}
          tone="accent"
          icon="cash-outline"
        />
      </View>

      <ProfitCard
        holdings={holdings}
        rates={rates}
        base={summaryCurrency}
        hideBalance={hideBalance}
        mode={mode}
        onModeChange={setMode}
        dailyQuotes={dailyQuotes}
        dailyLoading={dailyLoading}
      />

      <View className="mb-4">
        <Button
          label={S.portfolio.refreshPrices}
          variant="secondary"
          icon="refresh-outline"
          loading={refreshing}
          onPress={handleRefreshPrices}
        />
      </View>

      {holdings.map((h) => (
        <HoldingCard
          key={h.id}
          holding={h}
          defaultCurrency={base}
          rates={rates}
          hideBalance={hideBalance}
          mode={mode}
          dailyQuote={dailyQuotes?.find((q) => q.symbol === h.symbol && q.market === h.market)}
          dailyLoading={dailyLoading}
          onPress={() => router.push(`/portfolio/${h.id}`)}
          onDelete={() => confirmDelete(h.id, h.symbol)}
        />
      ))}
    </Screen>
  );
}
