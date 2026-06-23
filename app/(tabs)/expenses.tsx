import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/StatTile";
import { ExpenseCard } from "@/components/ExpenseCard";
import { UpcomingPayments } from "@/components/UpcomingPayments";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import {
  activeCount,
  monthlyTotal,
  nextBillingDate,
  totalByCategory,
  upcomingPayments,
  yearlyTotal,
} from "@/lib/expenseAnalytics";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";
import { EXPENSE_CATEGORY_LABELS, S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function ExpensesScreen() {
  const router = useRouter();
  const expenses = useExpenseStore((s) => s.expenses);
  const removeExpense = useExpenseStore((s) => s.removeExpense);
  const base = useSettingsStore((s) => s.baseCurrency);
  const usdToTry = useSettingsStore((s) => s.usdToTry);
  const eurToTry = useSettingsStore((s) => s.eurToTry);
  const rates = useMemo(() => ({ usdToTry, eurToTry }), [usdToTry, eurToTry]);
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");

  const monthly = useMemo(() => monthlyTotal(expenses, rates, base), [expenses, rates, base]);
  const yearly = useMemo(() => yearlyTotal(expenses, rates, base), [expenses, rates, base]);
  const byCat = useMemo(() => totalByCategory(expenses, rates, base), [expenses, rates, base]);
  const upcoming = useMemo(() => upcomingPayments(expenses, 7), [expenses]);

  const sorted = useMemo(() => {
    const list = filter === "all" ? expenses : expenses.filter((e) => e.category === filter);
    return [...list].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (!a.active) return a.name.localeCompare(b.name);
      return nextBillingDate(a.billingDay).getTime() - nextBillingDate(b.billingDay).getTime();
    });
  }, [expenses, filter]);

  const confirmDelete = (id: string, name: string) =>
    Alert.alert(S.expense.deleteTitle, `${name} — ${S.expense.deleteBody}`, [
      { text: S.common.cancel, style: "cancel" },
      { text: S.expense.delete, style: "destructive", onPress: () => removeExpense(id) },
    ]);

  if (expenses.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="receipt-outline"
          title={S.expense.empty}
          ctaLabel={S.expense.emptyAdd}
          onCta={() => router.push("/expense/new")}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View className="mb-3 flex-row gap-3">
        <StatTile label={S.expense.monthlyTotal} value={formatAmount(monthly, base)} tone="accent" icon="repeat-outline" />
        <StatTile label={S.expense.yearlyTotal} value={formatAmount(yearly, base)} icon="calendar-outline" />
      </View>
      <View className="mb-4">
        <StatTile label={S.expense.activeSubs} value={String(activeCount(expenses))} sub={`${expenses.length} toplam`} icon="card-outline" />
      </View>

      <UpcomingPayments items={upcoming} base={base} rates={rates} onPress={(id) => router.push(`/expense/${id}`)} />

      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={S.common.all} selected={filter === "all"} onPress={() => setFilter("all")} />
          {EXPENSE_CATEGORIES.map((cat) => (
            <Chip key={cat} label={EXPENSE_CATEGORY_LABELS[cat]} selected={filter === cat} onPress={() => setFilter(cat)} />
          ))}
        </ScrollView>
      </View>

      {sorted.map((e) => (
        <ExpenseCard
          key={e.id}
          expense={e}
          base={base}
          rates={rates}
          onPress={() => router.push(`/expense/${e.id}`)}
          onDelete={() => confirmDelete(e.id, e.name)}
        />
      ))}

      <View className="mt-2">
        <CategoryBreakdown data={byCat} base={base} />
      </View>
    </Screen>
  );
}
