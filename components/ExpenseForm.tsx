import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Field, TextField } from "./ui/Field";
import { Segmented } from "./ui/Segmented";
import { CURRENCIES, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/constants";
import { EXPENSE_CATEGORY_LABELS, S } from "@/lib/strings";
import { clamp, parseNum } from "@/lib/utils";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { ExpenseDraft } from "@/store/useExpenseStore";

interface ExpenseFormProps {
  initial?: Partial<ExpenseDraft>;
  submitting: boolean;
  onSubmit: (draft: ExpenseDraft) => void;
}

export function ExpenseForm({ initial, submitting, onSubmit }: ExpenseFormProps) {
  const last = useSettingsStore((s) => s.lastUsedExpense);

  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? last?.currency ?? "TRY");
  const [category, setCategory] = useState<ExpenseCategory>(
    initial?.category ?? last?.category ?? "streaming",
  );
  const [cycle, setCycle] = useState(initial?.cycle ?? "monthly");
  const [billingDay, setBillingDay] = useState(
    (initial?.billingDay ?? new Date().getDate()).toString(),
  );
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [showDetail, setShowDetail] = useState(!!(initial?.paymentMethod || initial?.notes));

  const amountN = parseNum(amount);
  const canSubmit = name.trim().length > 0 && Number.isFinite(amountN) && amountN > 0 && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      amount: amountN,
      currency,
      category,
      cycle,
      billingDay: clamp(Math.round(parseNum(billingDay)) || 1, 1, 31),
      paymentMethod: paymentMethod.trim(),
      active: initial?.active ?? true,
      notes: notes.trim(),
    });
  };

  return (
    <View>
      <Field label={S.expense.name} required>
        <TextField value={name} onChangeText={setName} placeholder="Netflix" />
      </Field>

      <Field label={S.expense.amount} required>
        <TextField value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      </Field>

      <Field label={S.expense.currency}>
        <Segmented value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ label: c, value: c }))} />
      </Field>

      <Field label={S.expense.category} required>
        <View className="flex-row flex-wrap">
          {EXPENSE_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={EXPENSE_CATEGORY_LABELS[cat]}
              selected={category === cat}
              onPress={() => setCategory(cat)}
            />
          ))}
        </View>
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label={S.expense.cycle}>
            <Segmented
              value={cycle}
              onChange={setCycle}
              options={[
                { label: S.expense.monthly, value: "monthly" },
                { label: S.expense.yearly, value: "yearly" },
              ]}
            />
          </Field>
        </View>
        <View className="w-28">
          <Field label={S.expense.billingDay} hint="1-31">
            <TextField value={billingDay} onChangeText={setBillingDay} keyboardType="number-pad" placeholder="1" />
          </Field>
        </View>
      </View>

      <Pressable
        onPress={() => setShowDetail((v) => !v)}
        className="mb-3 flex-row items-center justify-between rounded-xl bg-neutral-100 px-3 py-3 dark:bg-neutral-800"
      >
        <AppText variant="body" className="font-medium">
          {showDetail ? S.expense.hideDetail : S.expense.addDetail}
        </AppText>
        <Ionicons name={showDetail ? "chevron-up" : "chevron-down"} size={18} color="#8E8E93" />
      </Pressable>

      {showDetail ? (
        <View>
          <Field label={S.expense.paymentMethod}>
            <TextField value={paymentMethod} onChangeText={setPaymentMethod} placeholder={S.expense.paymentPlaceholder} />
          </Field>
          <Field label={S.expense.notes}>
            <TextField value={notes} onChangeText={setNotes} multiline className="h-20" style={{ textAlignVertical: "top" }} />
          </Field>
        </View>
      ) : null}

      <Button label={S.expense.save} icon="save-outline" loading={submitting} disabled={!canSubmit} onPress={submit} />
    </View>
  );
}
