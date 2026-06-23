import { View } from "react-native";
import { Chip } from "./ui/Chip";
import { AppText } from "./ui/Text";
import { MISTAKE_TAGS, type MistakeTag } from "@/lib/constants";
import { MISTAKE_LABELS } from "@/lib/strings";

interface MistakeTaggerProps {
  value: MistakeTag[];
  onChange: (v: MistakeTag[]) => void;
}

/**
 * Multi-select mistake tags. This is the data the discipline analytics live on,
 * so leaving it empty must genuinely mean "clean execution".
 */
export function MistakeTagger({ value, onChange }: MistakeTaggerProps) {
  const toggle = (tag: MistakeTag) =>
    onChange(value.includes(tag) ? value.filter((v) => v !== tag) : [...value, tag]);

  return (
    <View>
      <View className="flex-row flex-wrap">
        {MISTAKE_TAGS.map((tag) => (
          <Chip
            key={tag}
            label={MISTAKE_LABELS[tag]}
            tone="loss"
            showCheck
            selected={value.includes(tag)}
            onPress={() => toggle(tag)}
          />
        ))}
      </View>
      {value.length === 0 ? (
        <AppText variant="muted" className="mt-1">
          Etiket yok = temiz uygulama. Dürüst ol — analizler bunun üzerinden not veriyor.
        </AppText>
      ) : null}
    </View>
  );
}
