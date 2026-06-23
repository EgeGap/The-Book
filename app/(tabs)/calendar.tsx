import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { TradeCard } from "@/components/TradeCard";
import { dailyPnL, type DayStat } from "@/lib/analytics";
import { formatR } from "@/lib/utils";
import { useTradeStore } from "@/store/useTradeStore";

const WEEKDAYS = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

/** rgba fill scaled by R magnitude; transparent when the day has no trades. */
function dayFill(day?: DayStat): string | undefined {
  if (!day || day.count === 0) return undefined;
  const alpha = Math.min(1, 0.25 + Math.abs(day.r) * 0.18);
  return day.r >= 0
    ? `rgba(22,199,132,${alpha})`
    : `rgba(234,57,67,${alpha})`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const trades = useTradeStore((s) => s.trades);
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => dailyPnL(trades), [trades]);
  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }),
    [cursor],
  );
  const leadingBlanks = getDay(startOfMonth(cursor));
  const monthR = days.reduce(
    (s, d) => s + (byDay[format(d, "yyyy-MM-dd")]?.r ?? 0),
    0,
  );

  const selectedTrades = useMemo(() => {
    if (!selected) return [];
    return trades.filter(
      (t) => format(new Date(t.closedAt ?? t.createdAt), "yyyy-MM-dd") === selected,
    );
  }, [selected, trades]);

  return (
    <Screen scroll>
      <Card className="mb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={() => setCursor((c) => subMonths(c, 1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color="#8E8E93" />
          </Pressable>
          <View className="items-center">
            <AppText variant="heading">{format(cursor, "MMMM yyyy", { locale: tr })}</AppText>
            <AppText
              className="text-xs font-bold"
              style={{ color: monthR >= 0 ? "#16C784" : "#EA3943" }}
            >
              {formatR(monthR)} bu ay
            </AppText>
          </View>
          <Pressable onPress={() => setCursor((c) => addMonths(c, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color="#8E8E93" />
          </Pressable>
        </View>

        <View className="flex-row">
          {WEEKDAYS.map((w, i) => (
            <View key={i} className="items-center" style={{ width: `${100 / 7}%` }}>
              <AppText variant="muted">{w}</AppText>
            </View>
          ))}
        </View>

        <View className="mt-1 flex-row flex-wrap">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <View key={`b${i}`} style={{ width: `${100 / 7}%` }} />
          ))}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const stat = byDay[key];
            const fill = dayFill(stat);
            const isSel = selected === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(isSel ? null : key)}
                style={{ width: `${100 / 7}%` }}
                className="p-0.5"
              >
                <View
                  style={{ backgroundColor: fill }}
                  className={`aspect-square items-center justify-center rounded-lg ${
                    fill ? "" : "bg-neutral-100 dark:bg-neutral-800"
                  } ${isSel ? "border-2 border-accent" : ""}`}
                >
                  <AppText
                    className={`text-xs ${fill ? "font-bold text-white" : "text-neutral-500"} ${isToday(d) && !fill ? "text-accent" : ""}`}
                  >
                    {format(d, "d")}
                  </AppText>
                  {stat ? (
                    <AppText className="text-[9px] font-semibold text-white">
                      {stat.count}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {selected ? (
        <View>
          <AppText variant="heading" className="mb-2">
            {format(new Date(selected), "d MMMM EEEE", { locale: tr })}
          </AppText>
          {selectedTrades.length === 0 ? (
            <AppText variant="muted">Bu gün işlem yok.</AppText>
          ) : (
            selectedTrades.map((t) => (
              <TradeCard key={t.id} trade={t} onPress={() => router.push(`/trade/${t.id}`)} />
            ))
          )}
        </View>
      ) : (
        <AppText variant="muted" className="text-center">
          Bir güne dokunup o günün işlemlerini gör. Daha yeşil = daha çok R kazanç,
          daha kırmızı = daha çok R kayıp.
        </AppText>
      )}
    </Screen>
  );
}
