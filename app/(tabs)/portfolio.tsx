import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Modal, Pressable, View } from "react-native";
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
import { DistributionCard } from "@/components/DistributionCard";
import { holdingWeights, portfolioSummary } from "@/lib/portfolioAnalytics";
import { fetchAllDailyQuotes } from "@/lib/stockPrices";
import { exportHoldings } from "@/lib/export";
import { pickJSONArray, validateHoldings } from "@/lib/importData";
import type { DailyQuote } from "@/lib/types";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useSettingsStore } from "@/store/useSettingsStore";

const REFRESH_INTERVAL_MS = 60 * 1000;

export default function PortfolioScreen() {
  const router = useRouter();
  const holdings = usePortfolioStore((s) => s.holdings);
  const transactions = usePortfolioStore((s) => s.transactions);
  const removeHolding = usePortfolioStore((s) => s.removeHolding);
  const sellHolding = usePortfolioStore((s) => s.sellHolding);
  const buyMore = usePortfolioStore((s) => s.buyMore);
  const importHoldings = usePortfolioStore((s) => s.importHoldings);
  const refreshPrices = usePortfolioStore((s) => s.refreshPrices);
  const refreshing = usePortfolioStore((s) => s.refreshing);
  const base = useSettingsStore((s) => s.baseCurrency);
  const usdToTry = useSettingsStore((s) => s.usdToTry);
  const rates = useMemo(() => ({ usdToTry }), [usdToTry]);
  const [summaryCurrency, setSummaryCurrency] = useState(base);
  const [hideBalance, setHideBalance] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const lastAutoRefresh = useRef<number>(0);

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

  const weights = useMemo(
    () => holdingWeights(holdings, rates, summaryCurrency),
    [holdings, rates, summaryCurrency],
  );

  const doAutoRefresh = useCallback(async () => {
    if (holdings.length === 0 || refreshing) return;
    if (AppState.currentState !== "active") return;
    const now = Date.now();
    if (now - lastAutoRefresh.current < REFRESH_INTERVAL_MS) return;
    lastAutoRefresh.current = now;
    await refreshPrices();
    setLastRefreshedAt(Date.now());
  }, [holdings.length, refreshing, refreshPrices]);

  useEffect(() => {
    doAutoRefresh();
    const id = setInterval(doAutoRefresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [doAutoRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") doAutoRefresh();
    });
    return () => sub.remove();
  }, [doAutoRefresh]);

  const doExport = async (fmt: "json" | "csv") => {
    if (holdings.length === 0) {
      Alert.alert(S.settings.nothingExport, S.portfolio.exportEmpty);
      return;
    }
    try {
      setExporting(true);
      await exportHoldings(holdings, fmt);
    } catch {
      Alert.alert(S.settings.exportFail, S.settings.exportFailBody);
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    try {
      setImporting(true);
      const raw = await pickJSONArray();
      if (!raw) return;
      const valid = validateHoldings(raw);
      if (valid.length === 0) {
        Alert.alert(S.data.importFail, S.portfolio.importNone);
        return;
      }
      const n = await importHoldings(valid);
      Alert.alert(S.data.importDone, S.portfolio.importDoneCount(n));
    } catch {
      Alert.alert(S.data.importFail, S.data.importFailBody);
    } finally {
      setImporting(false);
    }
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
        <View className="-mt-12 px-8 pb-8">
          <Button
            label={S.portfolio.import}
            variant="secondary"
            icon="cloud-upload-outline"
            loading={importing}
            onPress={doImport}
          />
          <AppText variant="muted" className="mt-2 text-center">
            {S.portfolio.importHint}
          </AppText>
        </View>
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
          <Pressable onPress={() => setShowDataModal(true)} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={16} color="#8E8E93" />
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
        transactions={transactions}
      />

      <DistributionCard weights={weights} />

      <View className="mb-1">
        <Button
          label={S.portfolio.historyTitle}
          variant="secondary"
          icon="time-outline"
          onPress={() => router.push("/portfolio/history")}
        />
      </View>
      <View className="mb-1">
        <Button
          label={S.portfolio.reportBtn}
          variant="secondary"
          icon="bar-chart-outline"
          onPress={() => router.push("/portfolio/report")}
        />
      </View>
      {lastRefreshedAt && (
        <AppText variant="muted" className="mb-4 text-center text-[11px]">
          Son güncelleme: {new Date(lastRefreshedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </AppText>
      )}

      <Modal
        visible={showDataModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDataModal(false)}
      >
        <Pressable
          className="flex-1 items-center justify-end bg-black/50 pb-8"
          onPress={() => setShowDataModal(false)}
        >
          <Pressable
            className="w-full rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            onPress={() => {}}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="label">{S.common.export} / İçe Aktar</AppText>
              <Pressable onPress={() => setShowDataModal(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color="#8E8E93" />
              </Pressable>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="JSON" variant="secondary" icon="code-outline" loading={exporting} onPress={() => doExport("json")} />
              </View>
              <View className="flex-1">
                <Button label="CSV" variant="secondary" icon="grid-outline" loading={exporting} onPress={() => doExport("csv")} />
              </View>
            </View>
            <View className="mt-3">
              <Button
                label={S.portfolio.import}
                variant="ghost"
                icon="cloud-upload-outline"
                loading={importing}
                onPress={doImport}
              />
            </View>
            <AppText variant="muted" className="mt-2">
              {S.portfolio.importHint}
            </AppText>
          </Pressable>
        </Pressable>
      </Modal>

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
          onSell={(qty) => sellHolding(h.id, qty)}
          onBuyMore={(qty, price) => buyMore(h.id, qty, price)}
        />
      ))}
    </Screen>
  );
}
