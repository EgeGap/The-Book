import { ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { RMultipleBadge } from "./RMultipleBadge";
import {
  HTF_BIAS_LABELS,
  label,
  MISTAKE_LABELS,
  S,
  SESSION_LABELS,
  SETUP_LABELS,
  STATUS_LABELS,
  ZONE_LABELS,
} from "@/lib/strings";
import { formatMoney } from "@/lib/utils";
import type { Trade } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-100 py-2 dark:border-neutral-800">
      <AppText variant="muted">{label}</AppText>
      <AppText variant="body" className="font-medium">
        {value}
      </AppText>
    </View>
  );
}

function Pills({ items, tone }: { items: string[]; tone: "accent" | "loss" }) {
  const cls = tone === "loss" ? "bg-loss" : "bg-neutral-200 dark:bg-neutral-800";
  const txt = tone === "loss" ? "text-white" : "text-neutral-700 dark:text-neutral-300";
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((c) => (
        <View key={c} className={`rounded-full px-3 py-1.5 ${cls}`}>
          <AppText className={`text-xs font-medium ${txt}`}>{c}</AppText>
        </View>
      ))}
    </View>
  );
}

export function TradeDetailView({ trade }: { trade: Trade }) {
  const isClosed = trade.status === "closed";
  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <AppText variant="title" numberOfLines={1}>
              {trade.symbol}
            </AppText>
            <AppText variant="muted" className="uppercase">
              {trade.direction} · {STATUS_LABELS[trade.status]}
            </AppText>
          </View>
          {isClosed ? (
            <RMultipleBadge r={trade.realizedRR} />
          ) : (
            <RMultipleBadge r={trade.plannedRR} planned />
          )}
        </View>
      </Card>

      <Card>
        <AppText variant="label" className="mb-2">
          Bağlam
        </AppText>
        <Row label="Seans" value={SESSION_LABELS[trade.session]} />
        <Row label="HTF yönü" value={`${HTF_BIAS_LABELS[trade.htfBias]} (${trade.biasTimeframe})`} />
        <Row label="Giriş zaman dilimi" value={trade.entryTimeframe} />
        <Row label="Bölge" value={ZONE_LABELS[trade.zone]} />
        <Row label="Setup" value={label(SETUP_LABELS, trade.setupType)} />
      </Card>

      <Card>
        <AppText variant="label" className="mb-2">
          Sayılar
        </AppText>
        <Row label="Giriş" value={String(trade.entry)} />
        <Row label="Stop (SL)" value={String(trade.stopLoss)} />
        <Row label="Hedef (TP)" value={String(trade.takeProfit)} />
        {trade.exitPrice != null ? <Row label="Çıkış" value={String(trade.exitPrice)} /> : null}
        <Row label="Risk" value={`%${trade.riskPercent}`} />
        <Row label="Planlanan R:R" value={`${trade.plannedRR.toFixed(2)}R`} />
        {isClosed ? (
          <>
            <Row label="Gerçekleşen R" value={`${(trade.realizedRR ?? 0).toFixed(2)}R`} />
            <Row label="K/Z" value={formatMoney(trade.pnl)} />
          </>
        ) : null}
      </Card>

      {trade.confluences.length > 0 ? (
        <Card>
          <AppText variant="label" className="mb-2">
            Konfluanslar
          </AppText>
          <Pills items={trade.confluences} tone="accent" />
        </Card>
      ) : null}

      <Card>
        <AppText variant="label" className="mb-1">
          Giriş sebebi
        </AppText>
        <AppText variant="body">{trade.entryReason}</AppText>
      </Card>

      <Card>
        <AppText variant="label" className="mb-2">
          Uygulama
        </AppText>
        {trade.mistakes.length > 0 ? (
          <Pills items={trade.mistakes.map((m) => label(MISTAKE_LABELS, m))} tone="loss" />
        ) : (
          <AppText variant="body" className="text-win">
            {S.trade.cleanExec}
          </AppText>
        )}
      </Card>

      {trade.notes ? (
        <Card>
          <AppText variant="label" className="mb-1">
            Notlar
          </AppText>
          <AppText variant="body">{trade.notes}</AppText>
        </Card>
      ) : null}

      {trade.screenshots.length > 0 ? (
        <Card>
          <AppText variant="label" className="mb-2">
            Ekran görüntüleri
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            {trade.screenshots.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: 220, height: 140, borderRadius: 12, marginRight: 8 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <AppText variant="muted" className="text-center">
        Oluşturuldu {format(new Date(trade.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
        {trade.closedAt
          ? ` · Kapatıldı ${format(new Date(trade.closedAt), "d MMM HH:mm", { locale: tr })}`
          : ""}
      </AppText>
    </View>
  );
}
