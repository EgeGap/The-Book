import { ReactNode, useMemo } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { WinRateBar } from "@/components/WinRateBar";
import { BestWorstSetup } from "@/components/BestWorstSetup";
import { CleanVsMistakeCard } from "@/components/CleanVsMistakeCard";
import { MistakeList } from "@/components/MistakeList";
import {
  bestAndWorstSetup,
  cleanVsMistake,
  closedTrades,
  mistakeStats,
  statsByConfluence,
  statsBySession,
  statsBySetup,
} from "@/lib/analytics";
import type { Session } from "@/lib/constants";
import { label, S, SESSION_LABELS, SETUP_LABELS } from "@/lib/strings";
import { useTradeStore } from "@/store/useTradeStore";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-6">
      <AppText variant="heading">{title}</AppText>
      {subtitle ? (
        <AppText variant="muted" className="mb-3 mt-0.5">
          {subtitle}
        </AppText>
      ) : (
        <View className="mb-3" />
      )}
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const trades = useTradeStore((s) => s.trades);

  const a = useMemo(
    () => ({
      hasClosed: closedTrades(trades).length > 0,
      bySetup: statsBySetup(trades),
      bySession: statsBySession(trades),
      byConfluence: statsByConfluence(trades),
      mistakes: mistakeStats(trades),
      clean: cleanVsMistake(trades),
      bestWorst: bestAndWorstSetup(trades),
    }),
    [trades],
  );

  if (!a.hasClosed) {
    return (
      <Screen>
        <EmptyState
          icon="bar-chart-outline"
          title={S.stats.emptyTitle}
          subtitle={S.stats.emptySub}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Section title={`${S.stats.bestSetup} & ${S.stats.worstSetup}`}>
        <BestWorstSetup best={a.bestWorst.best} worst={a.bestWorst.worst} />
      </Section>

      <Section title={S.stats.cleanVsMistake}>
        <CleanVsMistakeCard data={a.clean} />
      </Section>

      <Section title={S.stats.bySetup}>
        <Card>
          {a.bySetup.map((s) => (
            <WinRateBar key={s.key} label={label(SETUP_LABELS, s.key)} winRate={s.winRate} totalR={s.totalR} count={s.count} />
          ))}
        </Card>
      </Section>

      <Section title={S.stats.bySession}>
        <Card>
          {a.bySession.map((s) => (
            <WinRateBar
              key={s.key}
              label={SESSION_LABELS[s.key as Session] ?? s.key}
              winRate={s.winRate}
              totalR={s.totalR}
              count={s.count}
            />
          ))}
        </Card>
      </Section>

      <Section title={S.stats.byConfluence}>
        <Card>
          {a.byConfluence.map((s) => (
            <WinRateBar key={s.key} label={s.key} winRate={s.winRate} totalR={s.totalR} count={s.count} />
          ))}
        </Card>
      </Section>

      <Section title={S.stats.mistakesRanked}>
        <MistakeList rows={a.mistakes} />
      </Section>
    </Screen>
  );
}
