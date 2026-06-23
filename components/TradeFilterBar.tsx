import { ScrollView, View } from "react-native";
import { Chip } from "./ui/Chip";
import { AppText } from "./ui/Text";
import { SESSIONS, SETUP_TYPES } from "@/lib/constants";
import { S, SESSION_LABELS, SETUP_LABELS } from "@/lib/strings";
import type { TradeCriteria } from "@/lib/filter";

interface TradeFilterBarProps {
  criteria: TradeCriteria;
  onChange: (patch: Partial<TradeCriteria>) => void;
}

interface RowProps<T extends string> {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onPick: (v: T) => void;
}

function Row<T extends string>({ label, options, value, onPick }: RowProps<T>) {
  return (
    <View className="mb-2">
      <AppText variant="label" className="mb-1">
        {label}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onPress={() => onPick(o.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function TradeFilterBar({ criteria, onChange }: TradeFilterBarProps) {
  return (
    <View className="mb-2">
      <Row
        label={S.list.result}
        value={criteria.result}
        onPick={(v) => onChange({ result: v })}
        options={[
          { label: S.common.all, value: "all" },
          { label: S.list.wins, value: "win" },
          { label: S.list.losses, value: "loss" },
          { label: "BE", value: "breakeven" },
        ]}
      />
      <Row
        label={S.list.period}
        value={criteria.period}
        onPick={(v) => onChange({ period: v })}
        options={[
          { label: S.list.allTime, value: "all" },
          { label: "7G", value: "7" },
          { label: "30G", value: "30" },
          { label: "90G", value: "90" },
        ]}
      />
      <Row
        label={S.trade.session}
        value={criteria.session}
        onPick={(v) => onChange({ session: v })}
        options={[
          { label: S.common.all, value: "all" },
          ...SESSIONS.map((s) => ({ label: SESSION_LABELS[s], value: s })),
        ]}
      />
      <Row
        label={S.trade.setupType}
        value={criteria.setup}
        onPick={(v) => onChange({ setup: v })}
        options={[
          { label: S.list.setupAll, value: "all" },
          ...SETUP_TYPES.map((s) => ({ label: SETUP_LABELS[s], value: s })),
        ]}
      />
      <View className="mt-1">
        <Chip
          label={S.list.onlyMistakes}
          tone="loss"
          showCheck
          selected={criteria.mistakesOnly}
          onPress={() => onChange({ mistakesOnly: !criteria.mistakesOnly })}
        />
      </View>
    </View>
  );
}
