import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { priceChangeSummary } from "@/lib/expenseAnalytics";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import type { Expense } from "@/lib/types";

interface PriceHistoryCardProps {
  expense: Expense;
}

/** Shows the price-change summary for an expense; renders nothing without history. */
export function PriceHistoryCard({ expense }: PriceHistoryCardProps) {
  const summary = priceChangeSummary(expense.priceHistory, {
    amount: expense.amount,
    currency: expense.currency,
  });
  if (!summary) return null;

  const firstDateLabel = new Date(summary.firstDate).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="trending-up-outline" size={16} color="#2D9CDB" />
        <AppText variant="label">{S.expense.priceHistory}</AppText>
      </View>
      <AppText variant="body">
        {summary.percentChange === 0
          ? S.expense.noChange
          : S.expense.priceIncreaseSummary(summary.percentChange.toFixed(0), firstDateLabel)}
      </AppText>
      {[...expense.priceHistory]
        .sort((a, b) => b.changedAt - a.changedAt)
        .map((h, i) => (
          <AppText key={i} variant="muted" className="mt-1">
            {new Date(h.changedAt).toLocaleDateString("tr-TR")} —{" "}
            {formatAmount(h.amount, h.currency)}
          </AppText>
        ))}
    </Card>
  );
}
