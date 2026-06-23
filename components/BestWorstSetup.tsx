import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { formatR } from "@/lib/utils";
import type { BucketStat } from "@/lib/analytics";

function Callout({
  title,
  stat,
  tone,
  icon,
}: {
  title: string;
  stat: BucketStat | null;
  tone: "win" | "loss";
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const color = tone === "win" ? "#16C784" : "#EA3943";
  return (
    <View className="flex-1 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="mb-1 flex-row items-center gap-1.5">
        <Ionicons name={icon} size={15} color={color} />
        <AppText variant="label">{title}</AppText>
      </View>
      {stat ? (
        <>
          <AppText variant="heading" numberOfLines={2}>
            {stat.key}
          </AppText>
          <AppText className="mt-1 text-lg font-bold" style={{ color }}>
            {formatR(stat.totalR)}
          </AppText>
          <AppText variant="muted">
            %{stat.winRate.toFixed(0)} WR · {stat.count} işlem
          </AppText>
        </>
      ) : (
        <AppText variant="muted">Henüz yeterli veri yok</AppText>
      )}
    </View>
  );
}

interface BestWorstSetupProps {
  best: BucketStat | null;
  worst: BucketStat | null;
}

export function BestWorstSetup({ best, worst }: BestWorstSetupProps) {
  return (
    <View className="flex-row gap-3">
      <Callout title="En iyi setup" stat={best} tone="win" icon="ribbon" />
      <Callout title="En kötü setup" stat={worst} tone="loss" icon="warning" />
    </View>
  );
}
