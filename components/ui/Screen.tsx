import { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Extra classes for the scroll/content container. */
  contentClassName?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

/** App-wide page wrapper: safe area + themed background + optional scroll. */
export function Screen({
  children,
  scroll = false,
  contentClassName = "",
  edges = ["top"],
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-neutral-50 dark:bg-black">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={`px-4 pb-28 pt-2 ${contentClassName}`}>{children}</View>
        </ScrollView>
      ) : (
        <View className={`flex-1 px-4 pt-2 ${contentClassName}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
