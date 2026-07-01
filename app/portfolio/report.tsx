import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/StatTile";
import { holdingGainPercent, portfolioSummary, realizedPnl } from "@/lib/portfolioAnalytics";
import { formatAmount } from "@/lib/utils";
import { S } from "@/lib/strings";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { HoldingTransaction } from "@/lib/types";

function avgHoldDays(transactions: HoldingTransaction[]): number | null {
  const sellTxs = transactions.filter((t) => t.type === "sell");
  if (sellTxs.length === 0) return null;
  let totalDays = 0;
  let count = 0;
  for (const sell of sellTxs) {
    const buys = transactions.filter(
      (t) => t.holdingId === sell.holdingId && (t.type === "buy" || t.type === "buy_more"),
    );
    if (buys.length === 0) continue;
    const firstBuy = buys.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    totalDays += (sell.createdAt - firstBuy.createdAt) / (1000 * 60 * 60 * 24);
    count++;
  }
  return count === 0 ? null : Math.round(totalDays / count);
}

interface StatRowProps {
  label: string;
  value: string;
  positive?: boolean | null;
}

function StatRow({ label, value, positive }: StatRowProps) {
  const color =
    positive == null ? undefined : positive ? ("text-win" as const) : ("text-loss" as const);
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <AppText variant="muted">{label}</AppText>
      <AppText className={`font-semibold ${color ?? ""}`}>{value}</AppText>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const holdings = usePortfolioStore((s) => s.holdings);
  const transactions = usePortfolioStore((s) => s.transactions);
  const base = useSettingsStore((s) => s.baseCurrency);
  const usdToTry = useSettingsStore((s) => s.usdToTry);
  const rates = useMemo(() => ({ usdToTry }), [usdToTry]);

  const summary = useMemo(() => portfolioSummary(holdings, rates, base), [holdings, rates, base]);
  const realized = useMemo(() => realizedPnl(transactions, rates, base), [transactions, rates, base]);
  const hasSells = transactions.some((t) => t.type === "sell" && t.costBasisAtSale != null);

  const { winner, loser } = useMemo(() => {
    let w = null as { symbol: string; pct: number } | null;
    let l = null as { symbol: string; pct: number } | null;
    for (const h of holdings) {
      const pct = holdingGainPercent(h, rates, base);
      if (pct == null) continue;
      if (w == null || pct > w.pct) w = { symbol: h.symbol, pct };
      if (l == null || pct < l.pct) l = { symbol: h.symbol, pct };
    }
    return { winner: w, loser: l };
  }, [holdings, rates, base]);

  const avgDays = useMemo(() => avgHoldDays(transactions), [transactions]);

  const fmtPnl = (n: number) => `${n >= 0 ? "+" : ""}${formatAmount(n, base)}`;
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  return (
    <Screen scroll>
      <View className="mb-4 flex-row items-center gap-2">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-1">
          <Ionicons name="arrow-back" size={22} color="#8E8E93" />
        </Pressable>
        <AppText variant="label">{S.portfolio.reportTitle}</AppText>
      </View>

      <View className="mb-4 flex-row gap-3">
        <StatTile
          label={S.portfolio.reportTotalInvested}
          value={formatAmount(summary.totalCost, base)}
          icon="wallet-outline"
        />
        <StatTile
          label={S.portfolio.reportCurrentValue}
          value={formatAmount(summary.totalValue, base)}
          tone="accent"
          icon="cash-outline"
        />
      </View>

      <Card className="mb-4">
        <StatRow
          label={S.portfolio.reportUnrealized}
          value={summary.gainPercent != null ? `${fmtPnl(summary.gainAmount)} (${fmtPct(summary.gainPercent)})` : S.portfolio.reportNoData}
          positive={summary.gainPercent != null ? summary.gainAmount >= 0 : null}
        />
        {hasSells ? (
          <StatRow
            label={S.portfolio.reportRealized}
            value={fmtPnl(realized)}
            positive={realized >= 0}
          />
        ) : (
          <StatRow label={S.portfolio.reportRealized} value={S.portfolio.reportNoRealized} />
        )}
        {winner && (
          <StatRow
            label={S.portfolio.reportTopWinner}
            value={`${winner.symbol} (${fmtPct(winner.pct)})`}
            positive={true}
          />
        )}
        {loser && winner?.symbol !== loser.symbol && (
          <StatRow
            label={S.portfolio.reportTopLoser}
            value={`${loser.symbol} (${fmtPct(loser.pct)})`}
            positive={false}
          />
        )}
        {avgDays != null && (
          <StatRow
            label={S.portfolio.reportAvgHold}
            value={S.portfolio.reportDays(avgDays)}
          />
        )}
      </Card>
    </Screen>
  );
}
