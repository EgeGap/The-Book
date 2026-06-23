import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { RMultipleBadge } from "./RMultipleBadge";
import { AppText } from "./ui/Text";
import { SESSION_LABELS, STATUS_LABELS } from "@/lib/strings";
import type { Trade } from "@/lib/types";

interface TradeCardProps {
  trade: Trade;
  onPress: () => void;
}

function StatusPill({ status }: { status: Trade["status"] }) {
  if (status === "closed") return null;
  const map = {
    planned: { label: STATUS_LABELS.planned, cls: "bg-accent" },
    open: { label: STATUS_LABELS.open, cls: "bg-amber-500" },
  } as const;
  const s = map[status];
  return (
    <View className={`rounded-md ${s.cls} px-2 py-0.5`}>
      <AppText className="text-[10px] font-bold text-white">{s.label}</AppText>
    </View>
  );
}

export function TradeCard({ trade, onPress }: TradeCardProps) {
  const isLong = trade.direction === "long";
  const date = trade.closedAt ?? trade.createdAt;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
        <Ionicons
          name={isLong ? "trending-up" : "trending-down"}
          size={20}
          color={isLong ? "#16C784" : "#EA3943"}
        />
      </View>

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="heading" numberOfLines={1} className="max-w-[55%]">
            {trade.symbol}
          </AppText>
          <AppText variant="muted" className="uppercase">
            {trade.direction}
          </AppText>
          <StatusPill status={trade.status} />
        </View>
        <AppText variant="muted" numberOfLines={1} className="mt-0.5">
          {trade.setupType}
        </AppText>
        <View className="mt-1 flex-row items-center gap-2">
          <AppText variant="muted">{SESSION_LABELS[trade.session]}</AppText>
          <AppText variant="muted">·</AppText>
          <AppText variant="muted">{format(new Date(date), "d MMM", { locale: tr })}</AppText>
          {trade.mistakes.length > 0 ? (
            <Ionicons name="warning" size={12} color="#EA3943" />
          ) : null}
        </View>
      </View>

      <View className="items-end gap-1">
        {trade.status === "closed" ? (
          <RMultipleBadge r={trade.realizedRR} />
        ) : (
          <RMultipleBadge r={trade.plannedRR} planned />
        )}
        <AppText variant="muted">RR {trade.plannedRR.toFixed(1)}</AppText>
      </View>
    </Pressable>
  );
}
