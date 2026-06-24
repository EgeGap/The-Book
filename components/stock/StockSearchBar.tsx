import { useState } from "react";
import { ScrollView, View } from "react-native";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { S } from "@/lib/strings";

interface StockSearchBarProps {
  loading: boolean;
  savedTickers: string[];
  activeTicker: string | null;
  onSubmit: (ticker: string) => void;
  onPickSaved: (ticker: string) => void;
}

export function StockSearchBar({ loading, savedTickers, activeTicker, onSubmit, onPickSaved }: StockSearchBarProps) {
  const [text, setText] = useState("");

  const submit = () => {
    if (text.trim().length === 0) return;
    onSubmit(text);
  };

  return (
    <View className="mb-4">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={S.stock.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={submit}
          />
        </View>
        <View className="w-32">
          <Button label={S.stock.analyze} icon="search" loading={loading} onPress={submit} />
        </View>
      </View>

      {savedTickers.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {savedTickers.map((t) => (
            <Chip key={t} label={t} selected={t === activeTicker} onPress={() => onPickSaved(t)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
