import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { CATEGORY_COLORS, type Currency } from "@/lib/constants";
import { convert, type FxRates } from "@/lib/expenseAnalytics";
import { EXPENSE_CATEGORY_LABELS, S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import type { Expense } from "@/lib/types";

interface ExpenseCardProps {
  expense: Expense;
  base: Currency;
  rates: FxRates;
  onPress: () => void;
  onDelete: () => void;
}

export function ExpenseCard({ expense, base, rates, onPress, onDelete }: ExpenseCardProps) {
  const converted = convert(expense.amount, expense.currency, rates, base);
  const showConverted = expense.currency !== base;
  const cycle = expense.cycle === "yearly" ? S.expense.yearly : S.expense.monthly;

  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900 ${
        expense.active ? "" : "opacity-50"
      }`}
    >
      <View
        className="h-10 w-1.5 rounded-full"
        style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
      />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="heading" numberOfLines={1} className="max-w-[60%]">
            {expense.name}
          </AppText>
          {!expense.active ? (
            <View className="rounded-md bg-neutral-400 px-2 py-0.5 dark:bg-neutral-600">
              <AppText className="text-[10px] font-bold text-white">{S.expense.paused}</AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="muted" numberOfLines={1} className="mt-0.5">
          {EXPENSE_CATEGORY_LABELS[expense.category]}
        </AppText>
        <AppText variant="muted" className="mt-1">
          {cycle} · {S.expense.billingDayOf(expense.billingDay)}
        </AppText>
      </View>

      <View className="items-end">
        <AppText variant="body" className="font-semibold">
          {formatAmount(expense.amount, expense.currency)}
        </AppText>
        {showConverted ? (
          <AppText variant="muted">
            {S.expense.approx} {formatAmount(converted, base)}
          </AppText>
        ) : null}
      </View>

      <Pressable onPress={onDelete} hitSlop={10} className="ml-1 p-1.5">
        <Ionicons name="trash-outline" size={18} color="#EA3943" />
      </Pressable>
    </Pressable>
  );
}
