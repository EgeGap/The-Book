import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { CATEGORY_COLORS, type Currency } from "@/lib/constants";
import type { CategoryTotal } from "@/lib/expenseAnalytics";
import { EXPENSE_CATEGORY_LABELS, S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { useColors } from "@/lib/theme";

interface CategoryBreakdownProps {
  data: CategoryTotal[];
  base: Currency;
}

/** Monthly spend split by category — donut (gifted-charts) + legend. */
export function CategoryBreakdown({ data, base }: CategoryBreakdownProps) {
  const c = useColors();
  if (data.length === 0) return null;
  const sum = data.reduce((s, d) => s + d.total, 0);
  const pieData = data.map((d) => ({ value: d.total, color: CATEGORY_COLORS[d.category] }));

  return (
    <Card className="mb-4">
      <AppText variant="label" className="mb-3">
        {S.expense.byCategory}
      </AppText>
      <View className="items-center">
        <PieChart
          data={pieData}
          donut
          radius={84}
          innerRadius={56}
          innerCircleColor={c.card}
          centerLabelComponent={() => (
            <View className="items-center">
              <AppText variant="muted">{S.expense.monthly}</AppText>
              <AppText variant="heading">{formatAmount(sum, base)}</AppText>
            </View>
          )}
        />
      </View>

      <View className="mt-4">
        {data.map((d) => (
          <View key={d.category} className="flex-row items-center gap-2 py-1.5">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[d.category] }}
            />
            <AppText variant="body" numberOfLines={1} className="flex-1">
              {EXPENSE_CATEGORY_LABELS[d.category]}
            </AppText>
            <AppText variant="muted">{sum > 0 ? Math.round((d.total / sum) * 100) : 0}%</AppText>
            <AppText variant="body" className="w-24 text-right font-semibold">
              {formatAmount(d.total, base)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
