import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { convert, type FxRates, type UpcomingPayment } from "@/lib/expenseAnalytics";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import type { Currency } from "@/lib/constants";

interface UpcomingPaymentsProps {
  items: UpcomingPayment[];
  base: Currency;
  rates: FxRates;
  onPress: (id: string) => void;
}

function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return S.expense.today;
  if (daysUntil === 1) return S.expense.tomorrow;
  return S.expense.inDays(daysUntil);
}

/** Highlights active expenses billing within the next 7 days. */
export function UpcomingPayments({ items, base, rates, onPress }: UpcomingPaymentsProps) {
  if (items.length === 0) return null;
  return (
    <Card className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="alarm-outline" size={16} color="#F0883E" />
        <AppText variant="label">{S.expense.upcoming}</AppText>
      </View>
      {items.map((p) => (
        <Pressable
          key={p.expense.id}
          onPress={() => onPress(p.expense.id)}
          className="flex-row items-center justify-between border-t border-neutral-100 py-2 first:border-t-0 dark:border-neutral-800"
        >
          <View className="flex-1">
            <AppText variant="body" numberOfLines={1} className="font-medium">
              {p.expense.name}
            </AppText>
            <AppText variant="muted">
              {whenLabel(p.daysUntil)} · {S.expense.billingDayOf(p.expense.billingDay)}
            </AppText>
          </View>
          <AppText variant="body" className="font-semibold">
            {formatAmount(convert(p.expense.amount, p.expense.currency, rates, base), base)}
          </AppText>
        </Pressable>
      ))}
    </Card>
  );
}
