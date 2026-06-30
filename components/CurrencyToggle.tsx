import * as Haptics from "expo-haptics";
import { Pressable, View } from "react-native";
import { AppText } from "./ui/Text";
import { CURRENCIES, CURRENCY_SYMBOL, type Currency } from "@/lib/constants";

interface CurrencyToggleProps {
  value: Currency;
  onChange: (c: Currency) => void;
}

/**
 * Compact ₺/$ switch. Each summary block and holding card owns its own instance,
 * so the user can read any single figure in either currency independently — there's
 * no global display currency.
 */
export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <View className="flex-row gap-0.5 rounded-lg bg-neutral-200 p-0.5 dark:bg-neutral-800">
      {CURRENCIES.map((c) => {
        const active = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(c);
            }}
            className={`rounded-md px-2 py-1 ${active ? "bg-white dark:bg-neutral-950" : ""}`}
          >
            <AppText
              className={`text-xs font-bold ${active ? "text-accent" : "text-neutral-500 dark:text-neutral-400"}`}
            >
              {CURRENCY_SYMBOL[c]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
