import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { S } from "@/lib/strings";
import { formatAmount } from "@/lib/utils";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { HoldingTransaction, TransactionType } from "@/lib/types";

function txLabel(type: TransactionType): string {
  if (type === "buy") return S.portfolio.txBuy;
  if (type === "buy_more") return S.portfolio.txBuyMore;
  return S.portfolio.txSell;
}

function txIcon(type: TransactionType): { name: "add-circle" | "add-circle-outline" | "remove-circle"; color: string } {
  if (type === "sell") return { name: "remove-circle", color: "#EA3943" };
  if (type === "buy_more") return { name: "add-circle-outline", color: "#34C759" };
  return { name: "add-circle", color: "#34C759" };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionRow({ tx }: { tx: HoldingTransaction }) {
  const icon = txIcon(tx.type);
  const total = tx.quantity * tx.pricePerUnit;
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <Ionicons name={icon.name} size={28} color={icon.color} />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <AppText variant="heading">{tx.symbol}</AppText>
          <View className="rounded-md bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
            <AppText className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
              {txLabel(tx.type)}
            </AppText>
          </View>
        </View>
        <AppText variant="muted" className="mt-0.5">
          {tx.quantity} adet · {formatAmount(tx.pricePerUnit, tx.currency)} / adet
        </AppText>
        <AppText variant="muted" className="text-[11px]">{formatDate(tx.createdAt)}</AppText>
      </View>

      <View className="items-end">
        <AppText className="font-semibold" style={{ color: icon.color }}>
          {tx.type === "sell" ? "-" : "+"}{formatAmount(total, tx.currency)}
        </AppText>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((s) => s.transactions);

  return (
    <Screen scroll>
      <View className="mb-4 flex-row items-center gap-2">
        <Pressable onPress={() => router.back()} hitSlop={12} className="p-1">
          <Ionicons name="arrow-back" size={22} color="#8E8E93" />
        </Pressable>
        <AppText variant="label">{S.portfolio.historyTitle}</AppText>
      </View>

      {transactions.length === 0 ? (
        <EmptyState icon="time-outline" title={S.portfolio.historyEmpty} />
      ) : (
        transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
      )}
    </Screen>
  );
}
