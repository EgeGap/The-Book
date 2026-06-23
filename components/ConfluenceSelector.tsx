import { View } from "react-native";
import { Chip } from "./ui/Chip";
import { CONFLUENCES } from "@/lib/constants";

interface ConfluenceSelectorProps {
  value: string[];
  onChange: (v: string[]) => void;
  extra?: string[];
}

/** Multi-select confluence chips. Order is preserved on toggle. */
export function ConfluenceSelector({
  value,
  onChange,
  extra = [],
}: ConfluenceSelectorProps) {
  const options = [...CONFLUENCES, ...extra];
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <View className="flex-row flex-wrap">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          showCheck
          selected={value.includes(opt)}
          onPress={() => toggle(opt)}
        />
      ))}
    </View>
  );
}
