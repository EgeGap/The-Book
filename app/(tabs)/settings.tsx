import { ReactNode, useState } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { exportAll } from "@/lib/export";
import { pickJSON, validateUnifiedBackup } from "@/lib/importData";
import { CURRENCIES } from "@/lib/constants";
import { S } from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";

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
  const importExpenses = useExpenseStore((st) => st.importExpenses);
  const holdings = usePortfolioStore((st) => st.holdings);
  const transactions = usePortfolioStore((st) => st.transactions);
  const importHoldings = usePortfolioStore((st) => st.importHoldings);
  const importTransactions = usePortfolioStore((st) => st.importTransactions);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const doExportAll = async () => {
    if (expenses.length === 0 && holdings.length === 0) {
      Alert.alert(S.settings.nothingExport, S.settings.backupNothingExport);
      return;
    }
    try {
      setExporting(true);
      await exportAll(expenses, holdings, transactions);
    } catch {
      Alert.alert(S.settings.exportFail, S.settings.exportFailBody);
    } finally {
      setExporting(false);
    }
  };

  const doImportAll = async () => {
    try {
      setImporting(true);
      const raw = await pickJSON();
      if (raw == null) return;
      const backup = validateUnifiedBackup(raw);
      if (backup.expenses.length === 0 && backup.holdings.length === 0 && backup.transactions.length === 0) {
        Alert.alert(S.data.importFail, S.settings.backupImportNone);
        return;
      }
      const [e, h, t] = await Promise.all([
        importExpenses(backup.expenses),
        importHoldings(backup.holdings),
        importTransactions(backup.transactions),
      ]);
      Alert.alert(S.data.importDone, S.settings.backupImportDone(e, h, t));
    } catch {
      Alert.alert(S.data.importFail, S.settings.backupImportFail);
    } finally {
      setImporting(false);
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
        <AppText variant="muted" className="ml-1">
          {S.expense.fxAuto}
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

      <Section title={S.settings.backup}>
        <Button
          label={S.settings.backupExport}
          variant="secondary"
          icon="download-outline"
          loading={exporting}
          onPress={doExportAll}
        />
        <Button
          label={S.settings.backupImport}
          variant="ghost"
          icon="cloud-upload-outline"
          loading={importing}
          onPress={doImportAll}
        />
        <AppText variant="muted" className="ml-1">
          Giderler + portföy + işlem geçmişi tek JSON dosyasında
        </AppText>
      </Section>

      <AppText variant="muted" className="mb-4 text-center">
        {S.settings.footer}
      </AppText>
    </Screen>
  );
}
