import { View } from "react-native";
import { AppText } from "./ui/Text";
import { formatR } from "@/lib/utils";
import { MISTAKE_LABELS, S } from "@/lib/strings";
import type { MistakeStat } from "@/lib/analytics";

/** Ranked recurring mistakes with the R bled on trades carrying each one. */
export function MistakeList({ rows }: { rows: MistakeStat[] }) {
  if (rows.length === 0) {
    return (
      <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <AppText variant="body" className="text-center">
          {S.stats.noMistakes}
        </AppText>
      </View>
    );
  }
  const maxCount = Math.max(...rows.map((r) => r.count));

  return (
    <View className="rounded-2xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
      {rows.map((row, i) => (
        <View
          key={row.key}
          className={`flex-row items-center gap-3 px-2 py-2.5 ${
            i < rows.length - 1 ? "border-b border-neutral-100 dark:border-neutral-800" : ""
          }`}
        >
          <AppText variant="muted" className="w-5">
            {i + 1}
          </AppText>
          <View className="flex-1">
            <AppText variant="body" numberOfLines={1} className="font-medium">
              {MISTAKE_LABELS[row.key] ?? row.key}
            </AppText>
            <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <View
                style={{ width: `${(row.count / maxCount) * 100}%`, backgroundColor: "#EA3943" }}
                className="h-full rounded-full"
              />
            </View>
          </View>
          <View className="items-end">
            <AppText variant="body" className="font-bold">
              {row.count}×
            </AppText>
            <AppText className="text-xs font-semibold text-loss">
              {formatR(row.rLost)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
