import { ReactNode, useState } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { exportExpenses } from "@/lib/export";
import { parseNum } from "@/lib/utils";
import { CURRENCIES } from "@/lib/constants";
import { S } from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import type { Settings } from "@/lib/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-4">
      <AppText variant="label" className="mb-2 ml-1">
        {title}
      </AppText>
      <Card className="gap-1">{children}</Card>
    </View>
  );
}

export default function SettingsScreen() {
  const s = useSettingsStore();
  const user = useAuthStore((st) => st.user);
  const signOut = useAuthStore((st) => st.signOut);
  const expenses = useExpenseStore((st) => st.expenses);
  const [busy, setBusy] = useState(false);

  const numUpdate = (key: "usdToTry") => (text: string) => {
    const n = parseNum(text);
    if (Number.isFinite(n) && n >= 0) s.update({ [key]: n } as Partial<Settings>);
  };

  const doExport = async (fmt: "json" | "csv") => {
    if (expenses.length === 0) {
      Alert.alert(S.settings.nothingExport, S.settings.nothingExportBody);
      return;
    }
    try {
      setBusy(true);
      await exportExpenses(expenses, fmt);
    } catch {
      Alert.alert(S.settings.exportFail, S.settings.exportFailBody);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Section title={S.settings.account}>
        <View className="flex-row items-center justify-between py-1">
          <View>
            <AppText variant="body" className="font-medium">
              {user?.isAnonymous ? S.settings.guest : user?.email ?? "—"}
            </AppText>
            <AppText variant="muted">
              {user?.isAnonymous ? "Lokal misafir oturumu" : "Lokal hesap"}
            </AppText>
          </View>
        </View>
        <Button label={S.common.signOut} variant="secondary" icon="log-out-outline" onPress={signOut} />
      </Section>

      <Section title={S.expense.fxTitle}>
        <Field label={S.expense.fxBase}>
          <Segmented
            value={s.baseCurrency}
            onChange={(baseCurrency) => s.update({ baseCurrency })}
            options={CURRENCIES.map((cur) => ({ label: cur, value: cur }))}
          />
        </Field>
        <Field label={S.expense.fxUsd}>
          <TextField
            defaultValue={String(s.usdToTry)}
            keyboardType="decimal-pad"
            onChangeText={numUpdate("usdToTry")}
          />
        </Field>
        <AppText variant="muted" className="ml-1">
          {S.expense.fxHint}
        </AppText>
      </Section>

      <Section title={S.settings.appearance}>
        <Segmented
          value={s.theme}
          onChange={(theme) => s.update({ theme })}
          options={[
            { label: S.common.dark, value: "dark" },
            { label: S.common.light, value: "light" },
          ]}
        />
      </Section>

      <Section title={S.settings.export}>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="JSON" variant="secondary" icon="code-outline" loading={busy} onPress={() => doExport("json")} />
          </View>
          <View className="flex-1">
            <Button label="CSV" variant="secondary" icon="grid-outline" loading={busy} onPress={() => doExport("csv")} />
          </View>
        </View>
      </Section>

      <AppText variant="muted" className="mb-4 text-center">
        {S.settings.footer}
      </AppText>
    </Screen>
  );
}
