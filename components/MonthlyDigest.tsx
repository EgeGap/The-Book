import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { buildMonthlyDigest, type FxRates } from "@/lib/expenseAnalytics";
import type { Currency } from "@/lib/constants";
import { S } from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { Expense } from "@/lib/types";

const DIGEST_INTERVAL_DAYS = 30;

interface MonthlyDigestProps {
  expenses: Expense[];
  base: Currency;
  rates: FxRates;
}

/** Dismissible "what changed since last time" summary, shown once every ~30 days. */
export function MonthlyDigest({ expenses, base, rates }: MonthlyDigestProps) {
  const lastDigestSeenAt = useSettingsStore((s) => s.lastDigestSeenAt);
  const update = useSettingsStore((s) => s.update);

  const sinceMs = lastDigestSeenAt ?? 0;
  const dueAt = sinceMs + DIGEST_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() < dueAt) return null;

  const digest = buildMonthlyDigest(expenses, rates, base, sinceMs);
  const hasContent = digest.newExpenses.length > 0 || digest.priceChanges.length > 0 || digest.pausedCount > 0;
  if (!hasContent) return null;

  return (
    <Card className="mb-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="newspaper-outline" size={16} color="#16C784" />
        <AppText variant="label">{S.expense.digestTitle}</AppText>
      </View>
      {digest.newExpenses.length > 0 && (
        <AppText variant="body" className="mt-1">
          {S.expense.digestNewLine(digest.newExpenses.length)}
        </AppText>
      )}
      {digest.priceChanges.map(({ expense, summary }) => (
        <AppText key={expense.id} variant="body" className="mt-1">
          {S.expense.digestPriceLine(expense.name, summary.percentChange.toFixed(0))}
        </AppText>
      ))}
      {digest.pausedCount > 0 && (
        <AppText variant="muted" className="mt-1">
          {S.expense.digestPausedLine(digest.pausedCount)}
        </AppText>
      )}
      <View className="mt-3">
        <Button
          label={S.expense.digestDismiss}
          variant="secondary"
          onPress={() => update({ lastDigestSeenAt: Date.now() })}
        />
      </View>
    </Card>
  );
}
