import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

export interface SegOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** "fill" stretches options evenly; "wrap" lets them flow on multiple rows. */
  layout?: "fill" | "wrap";
}

/** Single-select control. Used for direction, session, zone, result, etc. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layout = "fill",
}: SegmentedProps<T>) {
  const wrap = layout === "wrap";
  return (
    <View
      className={`${wrap ? "flex-row flex-wrap gap-2" : "flex-row gap-1 rounded-xl bg-neutral-200 p-1 dark:bg-neutral-800"}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const handle = () => {
          Haptics.selectionAsync().catch(() => {});
          onChange(opt.value);
        };
        if (wrap) {
          return (
            <Pressable
              key={opt.value}
              onPress={handle}
              className={`rounded-lg border px-3 py-2 ${
                active
                  ? "border-accent bg-accent"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              <Text
                className={`text-xs font-medium ${active ? "text-white" : "text-neutral-700 dark:text-neutral-300"}`}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={opt.value}
            onPress={handle}
            className={`flex-1 items-center rounded-lg py-2 ${active ? "bg-white shadow-sm dark:bg-neutral-950" : ""}`}
          >
            <Text
              className={`text-sm font-semibold ${active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
