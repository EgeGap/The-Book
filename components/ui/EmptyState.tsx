import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./Text";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({
  icon = "documents-outline",
  title,
  subtitle,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800">
        <Ionicons name={icon} size={30} color="#8E8E93" />
      </View>
      <AppText variant="heading" className="text-center">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="muted" className="mt-1 text-center">
          {subtitle}
        </AppText>
      ) : null}
      {ctaLabel && onCta ? (
        <View className="mt-5 w-full max-w-xs">
          <Button label={ctaLabel} onPress={onCta} icon="add" />
        </View>
      ) : null}
    </View>
  );
}
