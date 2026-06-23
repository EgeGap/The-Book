import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "win";

const CONTAINER: Record<Variant, string> = {
  primary: "bg-accent",
  win: "bg-win",
  danger: "bg-loss",
  secondary:
    "bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700",
  ghost: "bg-transparent",
};

const LABEL: Record<Variant, string> = {
  primary: "text-white",
  win: "text-white",
  danger: "text-white",
  secondary: "text-neutral-900 dark:text-neutral-100",
  ghost: "text-accent",
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  className = "",
}: ButtonProps) {
  const isOff = disabled || loading;
  const handle = () => {
    if (isOff) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };
  const tint = variant === "secondary" || variant === "ghost" ? undefined : "white";
  return (
    <Pressable
      onPress={handle}
      disabled={isOff}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${CONTAINER[variant]} ${isOff ? "opacity-40" : "active:opacity-80"} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={tint ?? "#7C5CFC"} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Ionicons name={icon} size={18} color={tint ?? "#7C5CFC"} /> : null}
          <Text className={`text-base font-semibold ${LABEL[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
