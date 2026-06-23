import { Text, View } from "react-native";
import { formatR } from "@/lib/utils";

interface RMultipleBadgeProps {
  r: number | null;
  /** When true, render as a neutral planned R:R (e.g. "3.0R plan"). */
  planned?: boolean;
  size?: "sm" | "md";
}

/** Green/red pill showing an R-multiple. The app's signature win/loss signal. */
export function RMultipleBadge({
  r,
  planned = false,
  size = "md",
}: RMultipleBadgeProps) {
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const text = size === "sm" ? "text-xs" : "text-sm";

  if (planned) {
    return (
      <View className={`rounded-md bg-accent ${pad}`}>
        <Text className={`font-bold text-white ${text}`}>
          {r ? `${r.toFixed(1)}R plan` : "—"}
        </Text>
      </View>
    );
  }

  const bg =
    r == null
      ? "bg-neutral-300 dark:bg-neutral-700"
      : r > 0
        ? "bg-win"
        : r < 0
          ? "bg-loss"
          : "bg-be";

  return (
    <View className={`rounded-md ${bg} ${pad}`}>
      <Text className={`font-bold text-white ${text}`}>{formatR(r)}</Text>
    </View>
  );
}
