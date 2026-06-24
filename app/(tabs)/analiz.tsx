import { useEffect, useMemo } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { StockSearchBar } from "@/components/stock/StockSearchBar";
import { AnalysisProgress } from "@/components/stock/AnalysisProgress";
import { StockReportView } from "@/components/stock/StockReportView";
import { S } from "@/lib/strings";
import { useStockAnalysisStore } from "@/store/useStockAnalysisStore";

const ERROR_MESSAGE: Record<string, string> = {
  "no-key": S.stock.errorNoKey,
  network: S.stock.errorNetwork,
  parse: S.stock.errorParse,
};

export default function AnalizScreen() {
  const reports = useStockAnalysisStore((s) => s.reports);
  const hydrated = useStockAnalysisStore((s) => s.hydrated);
  const loading = useStockAnalysisStore((s) => s.loading);
  const step = useStockAnalysisStore((s) => s.step);
  const activeTicker = useStockAnalysisStore((s) => s.activeTicker);
  const error = useStockAnalysisStore((s) => s.error);
  const hydrate = useStockAnalysisStore((s) => s.hydrate);
  const analyze = useStockAnalysisStore((s) => s.analyze);
  const remove = useStockAnalysisStore((s) => s.remove);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const savedTickers = useMemo(
    () => Object.values(reports).sort((a, b) => b.updatedAt - a.updatedAt).map((r) => r.ticker),
    [reports],
  );

  const activeRecord = activeTicker ? reports[activeTicker] : null;

  const confirmRemove = (ticker: string) =>
    Alert.alert(S.stock.removeTitle, S.stock.removeBody, [
      { text: S.common.cancel, style: "cancel" },
      { text: S.stock.remove, style: "destructive", onPress: () => remove(ticker) },
    ]);

  return (
    <Screen scroll>
      <StockSearchBar
        loading={loading}
        savedTickers={savedTickers}
        activeTicker={activeTicker}
        onSubmit={(ticker) => analyze(ticker)}
        onPickSaved={(ticker) => analyze(ticker)}
      />

      <AnalysisProgress step={step} ticker={activeTicker} />

      {error ? (
        <View className="mb-4 rounded-xl bg-loss/10 p-3">
          <AppText className="text-loss">{ERROR_MESSAGE[error] ?? S.stock.errorParse}</AppText>
        </View>
      ) : null}

      {!loading && activeRecord ? (
        <StockReportView
          record={activeRecord}
          reanalyzing={loading}
          onReanalyze={() => analyze(activeRecord.ticker, true)}
        />
      ) : null}

      {!loading && !activeRecord && !error ? (
        <EmptyState icon="trending-up-outline" title={S.stock.empty} subtitle={S.stock.emptyHint} />
      ) : null}

      {savedTickers.length > 0 && !loading ? (
        <View className="mb-8 flex-row flex-wrap gap-2">
          {activeRecord ? (
            <AppText
              variant="muted"
              className="text-loss"
              onPress={() => confirmRemove(activeRecord.ticker)}
            >
              {S.stock.remove} ({activeRecord.ticker})
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
