import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { annualSavings, needsUsageCheck, type FxRates } from "@/lib/expenseAnalytics";
import { SUBSCRIPTION_CHECK_INTERVAL_DAYS, type Currency } from "@/lib/constants";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { useExpenseStore } from "@/store/useExpenseStore";
import type { Expense } from "@/lib/types";

interface ReviewPromptsProps {
  expenses: Expense[];
  base: Currency;
  rates: FxRates;
}

/** "Are you still using this?" review cards for expenses due for a check-in. */
export function ReviewPrompts({ expenses, base, rates }: ReviewPromptsProps) {
  const togglePause = useExpenseStore((s) => s.togglePause);
  const confirmStillUsing = useExpenseStore((s) => s.confirmStillUsing);

  const due = expenses.filter((e) => needsUsageCheck(e, SUBSCRIPTION_CHECK_INTERVAL_DAYS));
  if (due.length === 0) return null;

  return (
    <Card className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="help-circle-outline" size={16} color="#7C5CFC" />
        <AppText variant="label">{S.expense.reviewSection}</AppText>
      </View>
      {due.map((e) => (
        <View
          key={e.id}
          className="border-t border-neutral-100 py-3 first:border-t-0 dark:border-neutral-800"
        >
          <AppText variant="body" className="font-medium">
            {e.name}
          </AppText>
          <AppText variant="muted" className="mt-0.5">
            {S.expense.stillUsing}
          </AppText>
          <AppText variant="muted" className="mt-0.5">
            {S.expense.savingsIfCancelled(formatAmount(annualSavings(e, rates, base), base))}
          </AppText>
          <View className="mt-2 flex-row gap-2">
            <View className="flex-1">
              <Button
                label={S.expense.confirmContinue}
                variant="secondary"
                onPress={() => confirmStillUsing(e.id)}
              />
            </View>
            <View className="flex-1">
              <Button label={S.expense.pause} variant="danger" onPress={() => togglePause(e.id)} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}
