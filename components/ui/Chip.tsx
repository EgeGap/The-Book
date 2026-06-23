import * as Haptics from "expo-haptics";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Visual tone when selected. */
  tone?: "accent" | "win" | "loss";
  showCheck?: boolean;
}

const SELECTED_BG: Record<NonNullable<ChipProps["tone"]>, string> = {
  accent: "bg-accent border-accent",
  win: "bg-win border-win",
  loss: "bg-loss border-loss",
};

/** A tappable pill used for multi/single select chips and filters. */
export function Chip({
  label,
  selected = false,
  onPress,
  tone = "accent",
  showCheck = false,
}: ChipProps) {
  const handle = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };
  return (
    <Pressable
      onPress={handle}
      className={`mb-2 mr-2 flex-row items-center gap-1 rounded-full border px-3 py-2 ${
        selected
          ? SELECTED_BG[tone]
          : "border-neutral-300 bg-transparent dark:border-neutral-700"
      }`}
    >
      {showCheck && selected ? (
        <Ionicons name="checkmark" size={14} color="white" />
      ) : null}
      <Text
        className={`text-xs font-medium ${
          selected ? "text-white" : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
