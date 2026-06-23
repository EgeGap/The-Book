import { useMemo, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/Text";
import { TextField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { TradeCard } from "@/components/TradeCard";
import { TradeFilterBar } from "@/components/TradeFilterBar";
import {
  activeFilterCount,
  applyTradeFilters,
  DEFAULT_CRITERIA,
  type TradeCriteria,
} from "@/lib/filter";
import { useTradeStore } from "@/store/useTradeStore";

export default function TradesScreen() {
  const router = useRouter();
  const trades = useTradeStore((s) => s.trades);
  const [criteria, setCriteria] = useState<TradeCriteria>(DEFAULT_CRITERIA);
  const [showFilters, setShowFilters] = useState(false);

  const patch = (p: Partial<TradeCriteria>) => setCriteria((c) => ({ ...c, ...p }));
  const filtered = useMemo(() => applyTradeFilters(trades, criteria), [trades, criteria]);
  const activeCount = activeFilterCount(criteria);

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TradeCard trade={item} onPress={() => router.push(`/trade/${item.id}`)} />
        )}
        ListHeaderComponent={
          <View className="pt-1">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-3 dark:border-neutral-700 dark:bg-neutral-800">
                <Ionicons name="search" size={16} color="#8E8E93" />
                <TextField
                  value={criteria.query}
                  onChangeText={(query) => patch({ query })}
                  placeholder="Sembol, setup, not ara"
                  className="flex-1 border-0 bg-transparent px-0 py-2.5"
                />
              </View>
              <Pressable
                onPress={() => setShowFilters((v) => !v)}
                className={`h-11 flex-row items-center gap-1 rounded-xl px-3 ${
                  activeCount > 0 ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              >
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={activeCount > 0 ? "white" : "#8E8E93"}
                />
                {activeCount > 0 ? (
                  <AppText className="text-xs font-bold text-white">{activeCount}</AppText>
                ) : null}
              </Pressable>
            </View>

            {showFilters ? (
              <View className="mb-2">
                <TradeFilterBar criteria={criteria} onChange={patch} />
                {activeCount > 0 ? (
                  <Pressable onPress={() => setCriteria(DEFAULT_CRITERIA)} className="mb-2">
                    <AppText className="text-sm text-accent">Tüm filtreleri temizle</AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <AppText variant="muted" className="mb-2">
              {filtered.length} işlem
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={trades.length === 0 ? "Henüz işlem yok" : "Sonuç yok"}
            subtitle={
              trades.length === 0
                ? "İlk işlemini eklemek için + simgesine dokun."
                : "Filtreleri veya aramanı temizlemeyi dene."
            }
          />
        }
      />
    </Screen>
  );
}
