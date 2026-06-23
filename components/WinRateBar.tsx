import { View } from "react-native";
import { AppText } from "./ui/Text";
import { formatR } from "@/lib/utils";
import { useColors } from "@/lib/theme";

interface WinRateBarProps {
  label: string;
  winRate: number; // 0..100
  totalR: number;
  count: number;
  /** When provided, the right-side metric shows R relative to the max in the list. */
  highlight?: boolean;
}

/**
 * One labeled progress row. A list of these is the "which setups make money"
 * visualization — bar width = win rate, bar color = profitable (green) or not.
 */
export function WinRateBar({ label, winRate, totalR, count, highlight }: WinRateBarProps) {
  const c = useColors();
  const profitable = totalR > 0;
  const barColor = totalR === 0 ? c.be : profitable ? c.win : c.loss;
  const pct = Math.max(2, Math.min(100, winRate));

  return (
    <View className={`mb-3 ${highlight ? "opacity-100" : ""}`}>
      <View className="mb-1 flex-row items-center justify-between gap-2">
        <AppText variant="body" numberOfLines={1} className="flex-1 font-medium">
          {label}
        </AppText>
        <AppText variant="muted">{count} işlem</AppText>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <View
            style={{ width: `${pct}%`, backgroundColor: barColor }}
            className="h-full rounded-full"
          />
        </View>
        <View className="w-12 items-end">
          <AppText variant="body" className="font-semibold">
            {winRate.toFixed(0)}%
          </AppText>
        </View>
        <View className="w-16 items-end">
          <AppText
            className="text-sm font-bold"
            style={{ color: barColor }}
          >
            {formatR(totalR)}
          </AppText>
        </View>
      </View>
    </View>
  );
}
