import { ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { AppText } from "@/components/ui/Text";

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}

/** Collapsible report section, used for every block of the stock report. */
export function Accordion({ title, children, defaultOpen = false, badge }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    setOpen((v) => !v);
  };
  return (
    <Card className="mb-3 p-0">
      <Pressable onPress={toggle} className="flex-row items-center justify-between p-4">
        <View className="flex-1 flex-row items-center gap-2">
          <AppText variant="heading">{title}</AppText>
          {badge}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#8E8E93" />
      </Pressable>
      {open ? <View className="px-4 pb-4">{children}</View> : null}
    </Card>
  );
}
