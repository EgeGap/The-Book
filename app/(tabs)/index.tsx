import { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/StatTile";
import { EquityCurve } from "@/components/EquityCurve";
import { buildEquityCurve, computeDashboardStats } from "@/lib/analytics";
import { formatMoney, formatPercent, formatR } from "@/lib/utils";
import { useTradeStore } from "@/store/useTradeStore";

type Period = "7" | "30" | "all";

const PERIOD_OPTIONS = [
  { label: "7G", value: "7" as const },
  { label: "30G", value: "30" as const },
  { label: "Tümü", value: "all" as const },
];

export default function DashboardScreen() {
  const router = useRouter();
  const trades = useTradeStore((s) => s.trades);
  const [period, setPeriod] = useState<Period>("30");

  const filtered = useMemo(() => {
    if (period === "all") return trades;
    const cutoff = Date.now() - Number(period) * 86_400_000;
    return trades.filter((t) => (t.closedAt ?? t.createdAt) >= cutoff);
  }, [trades, period]);

  const stats = useMemo(() => computeDashboardStats(filtered), [filtered]);
  const equity = useMemo(() => buildEquityCurve(filtered), [filtered]);

  if (trades.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="rocket-outline"
          title="Henüz işlem yok"
          subtitle="Disiplin ve istatistik oluşturmaya başlamak için ilk işlemini kaydet."
          ctaLabel="İlk işlemi kaydet"
          onCta={() => router.push("/trade/new")}
        />
      </Screen>
    );
  }

  const streakLabel =
    stats.streak.type === "none"
      ? "—"
      : `${stats.streak.count}${stats.streak.type === "win" ? "W" : "L"}`;

  return (
    <Screen scroll>
      <View className="mb-4 mt-1">
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </View>

      <View className="mb-3 flex-row gap-3">
        <StatTile
          label="Net R"
          value={formatR(stats.totalR)}
          tone={stats.totalR >= 0 ? "win" : "loss"}
          sub={`${stats.closedCount} kapalı`}
          icon="analytics-outline"
        />
        <StatTile
          label="Kazanma oranı"
          value={formatPercent(stats.winRate)}
          sub={`PF ${stats.profitFactor ?? "∞"}`}
          icon="trophy-outline"
        />
      </View>

      <View className="mb-3 flex-row gap-3">
        <StatTile
          label="Beklenti"
          value={`${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`}
          tone={stats.expectancy >= 0 ? "win" : "loss"}
          sub="işlem başına ort. R"
        />
        <StatTile
          label="Net K/Z"
          value={formatMoney(stats.totalPnl)}
          tone={stats.totalPnl >= 0 ? "win" : "loss"}
          sub="hesap birimi"
        />
      </View>

      <View className="mb-4 flex-row gap-3">
        <StatTile
          label="Seri"
          value={streakLabel}
          tone={stats.streak.type === "win" ? "win" : stats.streak.type === "loss" ? "loss" : "neutral"}
          sub="mevcut"
        />
        <StatTile
          label="Açık / Planlı"
          value={`${stats.openCount} / ${stats.plannedCount}`}
          sub={`${stats.totalTrades} toplam`}
          icon="time-outline"
        />
      </View>

      <Card>
        <EquityCurve points={equity} />
      </Card>

      <AppText variant="muted" className="mt-4 text-center">
        En iyi {formatR(stats.bestR)} · En kötü {formatR(stats.worstR)} (bu dönem)
      </AppText>
    </Screen>
  );
}
