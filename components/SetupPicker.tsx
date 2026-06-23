import { View } from "react-native";
import { Chip } from "./ui/Chip";
import { SETUP_TYPES } from "@/lib/constants";
import { label, SETUP_LABELS } from "@/lib/strings";

interface SetupPickerProps {
  value: string;
  onChange: (v: string) => void;
  /** User-defined setups from settings, merged after the built-ins. */
  extra?: string[];
}

/** Single-select ICT/SMC setup type. */
export function SetupPicker({ value, onChange, extra = [] }: SetupPickerProps) {
  const options = [...SETUP_TYPES, ...extra];
  return (
    <View className="flex-row flex-wrap">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={label(SETUP_LABELS, opt)}
          selected={value === opt}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}
