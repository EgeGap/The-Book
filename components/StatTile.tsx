import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";

type Tone = "neutral" | "win" | "loss" | "accent";

const VALUE_COLOR: Record<Tone, string> = {
  neutral: "text-neutral-900 dark:text-neutral-50",
  win: "text-win",
  loss: "text-loss",
  accent: "text-accent",
};

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Compact KPI card for the dashboard grid. */
export function StatTile({ label, value, sub, tone = "neutral", icon }: StatTileProps) {
  return (
    <View className="min-h-[88px] flex-1 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <AppText variant="label" numberOfLines={1} className="flex-1">
          {label}
        </AppText>
        {icon ? <Ionicons name={icon} size={15} color="#8E8E93" /> : null}
      </View>
      <AppText
        className={`mt-2 text-xl font-bold ${VALUE_COLOR[tone]}`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      {sub ? (
        <AppText variant="muted" numberOfLines={1} className="mt-0.5">
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}
