import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/ui/Screen";
import { Chip } from "@/components/ui/Chip";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/StatTile";
import { ExpenseCard } from "@/components/ExpenseCard";
import { UpcomingPayments } from "@/components/UpcomingPayments";
import { ReviewPrompts } from "@/components/ReviewPrompts";
import { MonthlyDigest } from "@/components/MonthlyDigest";
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
import { exportExpenses } from "@/lib/export";
import { pickJSONArray, validateExpenses } from "@/lib/importData";
import { formatAmount } from "@/lib/utils";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function ExpensesScreen() {
  const router = useRouter();
  const expenses = useExpenseStore((s) => s.expenses);
  const removeExpense = useExpenseStore((s) => s.removeExpense);
  const importExpenses = useExpenseStore((s) => s.importExpenses);
  const base = useSettingsStore((s) => s.baseCurrency);
  const usdToTry = useSettingsStore((s) => s.usdToTry);
  const rates = useMemo(() => ({ usdToTry }), [usdToTry]);
  const [filter, setFilter] = useState<"all" | ExpenseCategory>("all");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const doExport = async (fmt: "json" | "csv") => {
    try {
      setExporting(true);
      await exportExpenses(expenses, fmt);
    } catch {
      Alert.alert(S.settings.exportFail, S.settings.exportFailBody);
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    try {
      setImporting(true);
      const arr = await pickJSONArray();
      if (!arr) return; // cancelled
      const valid = validateExpenses(arr);
      if (valid.length === 0) {
        Alert.alert(S.data.importFail, S.data.importNone);
        return;
      }
      const n = await importExpenses(valid);
      Alert.alert(S.data.importDone, S.data.importDoneCount(n));
    } catch {
      Alert.alert(S.data.importFail, S.data.importFailBody);
    } finally {
      setImporting(false);
    }
  };

  if (expenses.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="receipt-outline"
          title={S.expense.empty}
          ctaLabel={S.expense.emptyAdd}
          onCta={() => router.push("/expense/new")}
        />
        <View className="pb-8">
          <Button
            label={S.expense.import}
            variant="secondary"
            icon="download-outline"
            loading={importing}
            onPress={doImport}
          />
          <AppText variant="muted" className="mt-2 text-center">
            {S.expense.importHint}
          </AppText>
        </View>
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

      <View className="mb-4 flex-row items-center gap-2">
        <AppText variant="label" className="flex-1">
          {S.common.export}
        </AppText>
        <View className="w-24">
          <Button label="JSON" variant="secondary" icon="code-outline" loading={exporting} onPress={() => doExport("json")} />
        </View>
        <View className="w-24">
          <Button label="CSV" variant="secondary" icon="grid-outline" loading={exporting} onPress={() => doExport("csv")} />
        </View>
      </View>

      <View className="mb-4">
        <Button
          label={S.expense.import}
          variant="secondary"
          icon="download-outline"
          loading={importing}
          onPress={doImport}
        />
      </View>

      <MonthlyDigest expenses={expenses} base={base} rates={rates} />

      <ReviewPrompts expenses={expenses} base={base} rates={rates} />

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
