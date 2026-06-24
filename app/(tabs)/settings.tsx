import { ReactNode, useState } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { CustomListEditor } from "@/components/CustomListEditor";
import { exportTrades } from "@/lib/export";
import { parseNum } from "@/lib/utils";
import { CURRENCIES } from "@/lib/constants";
import { S } from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTradeStore } from "@/store/useTradeStore";
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
  const trades = useTradeStore((st) => st.trades);
  const reseed = useTradeStore((st) => st.reseed);
  const [busy, setBusy] = useState(false);

  const numUpdate = (
    key: "defaultRiskPercent" | "maxRiskPercent" | "startingBalance" | "usdToTry" | "eurToTry",
  ) =>
    (text: string) => {
      const n = parseNum(text);
      if (Number.isFinite(n) && n >= 0) s.update({ [key]: n } as Partial<Settings>);
    };

  const doExport = async (fmt: "json" | "csv") => {
    if (trades.length === 0) {
      Alert.alert("Aktarılacak bir şey yok", "Önce bir işlem kaydet.");
      return;
    }
    try {
      setBusy(true);
      await exportTrades(trades, fmt);
    } catch {
      Alert.alert("Dışa aktarma başarısız", "Dışa aktarma dosyası oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReseed = () =>
    Alert.alert("Tüm işlemleri sil?", "Bu işlem kayıtlı tüm işlemleri kalıcı olarak siler.", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => reseed([]) },
    ]);

  return (
    <Screen scroll>
      <Section title="Hesap">
        <View className="flex-row items-center justify-between py-1">
          <View>
            <AppText variant="body" className="font-medium">
              {user?.isAnonymous ? "Misafir" : user?.email ?? "—"}
            </AppText>
            <AppText variant="muted">
              {user?.isAnonymous ? "Lokal misafir oturumu" : "Lokal hesap"}
            </AppText>
          </View>
        </View>
        <Button label="Çıkış yap" variant="secondary" icon="log-out-outline" onPress={signOut} />
      </Section>

      <Section title="Risk varsayılanları">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label="Varsayılan risk %">
              <TextField
                defaultValue={String(s.defaultRiskPercent)}
                keyboardType="decimal-pad"
                onChangeText={numUpdate("defaultRiskPercent")}
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label="Maks risk %">
              <TextField
                defaultValue={String(s.maxRiskPercent)}
                keyboardType="decimal-pad"
                onChangeText={numUpdate("maxRiskPercent")}
              />
            </Field>
          </View>
        </View>
        <Field label="Başlangıç bakiyesi (hesap birimi)">
          <TextField
            defaultValue={String(s.startingBalance)}
            keyboardType="decimal-pad"
            onChangeText={numUpdate("startingBalance")}
          />
        </Field>
      </Section>

      <Section title={S.expense.fxTitle}>
        <Field label={S.expense.fxBase}>
          <Segmented
            value={s.baseCurrency}
            onChange={(baseCurrency) => s.update({ baseCurrency })}
            options={CURRENCIES.map((cur) => ({ label: cur, value: cur }))}
          />
        </Field>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field label={S.expense.fxUsd}>
              <TextField
                defaultValue={String(s.usdToTry)}
                keyboardType="decimal-pad"
                onChangeText={numUpdate("usdToTry")}
              />
            </Field>
          </View>
          <View className="flex-1">
            <Field label={S.expense.fxEur}>
              <TextField
                defaultValue={String(s.eurToTry)}
                keyboardType="decimal-pad"
                onChangeText={numUpdate("eurToTry")}
              />
            </Field>
          </View>
        </View>
        <AppText variant="muted" className="ml-1">
          {S.expense.fxHint}
        </AppText>
      </Section>

      <Section title="Görünüm">
        <Segmented
          value={s.theme}
          onChange={(theme) => s.update({ theme })}
          options={[
            { label: "Koyu", value: "dark" },
            { label: "Açık", value: "light" },
          ]}
        />
      </Section>

      <Section title="Özel setuplar">
        <CustomListEditor
          items={s.customSetups}
          onAdd={s.addCustomSetup}
          onRemove={s.removeCustomSetup}
          placeholder="örn. SMT Divergence"
        />
      </Section>

      <Section title="Özel konfluanslar">
        <CustomListEditor
          items={s.customConfluences}
          onAdd={s.addCustomConfluence}
          onRemove={s.removeCustomConfluence}
          placeholder="örn. DXY korelasyonu"
        />
      </Section>

      <Section title={S.stock.apiKeyLabel}>
        <Field label={S.stock.apiKeyLabel} hint={S.stock.apiKeyHint}>
          <TextField
            defaultValue={s.financialApiKey ?? ""}
            onChangeText={(v) => s.update({ financialApiKey: v })}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="fmp_..."
          />
        </Field>
      </Section>

      <Section title="Dışa aktar">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="JSON" variant="secondary" icon="code-outline" loading={busy} onPress={() => doExport("json")} />
          </View>
          <View className="flex-1">
            <Button label="CSV" variant="secondary" icon="grid-outline" loading={busy} onPress={() => doExport("csv")} />
          </View>
        </View>
      </Section>

      <Section title="Veri">
        <Button label="Tüm işlemleri sil" variant="danger" icon="trash-outline" onPress={confirmReseed} />
      </Section>

      <AppText variant="muted" className="mb-4 text-center">
        SMC Journal · tüm veriler bu cihazda lokal saklanır
      </AppText>
    </Screen>
  );
}
