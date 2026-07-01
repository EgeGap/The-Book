import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import type { HoldingWeight } from "@/lib/portfolioAnalytics";
import { S } from "@/lib/strings";

interface DistributionCardProps {
  weights: HoldingWeight[];
}

export function DistributionCard({ weights }: DistributionCardProps) {
  if (weights.length === 0) return null;

  const pieData = weights.map((w) => ({ value: w.value, color: w.color }));

  return (
    <Card className="mb-4">
      <AppText variant="label" className="mb-3">
        {S.portfolio.distributionTitle}
      </AppText>
      <View className="flex-row items-center gap-4">
        <PieChart data={pieData} radius={56} donut innerRadius={32} innerCircleColor="transparent" />
        <View className="flex-1 gap-1.5">
          {weights.map((w) => (
            <View key={w.id} className="flex-row items-center gap-2">
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: w.color }} />
              <AppText className="flex-1 text-sm font-medium" numberOfLines={1}>
                {w.symbol}
              </AppText>
              <AppText variant="muted" className="text-sm">
                {w.percent.toFixed(1)}%
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
