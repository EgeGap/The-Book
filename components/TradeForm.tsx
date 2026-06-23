import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/Text";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Field, TextField } from "./ui/Field";
import { Segmented } from "./ui/Segmented";
import { SetupPicker } from "./SetupPicker";
import { ConfluenceSelector } from "./ConfluenceSelector";
import { ScreenshotUploader } from "./ScreenshotUploader";
import { RMultipleBadge } from "./RMultipleBadge";
import { SwipeToConfirm } from "./SwipeToConfirm";
import { DIRECTIONS, HTF_BIASES, SESSIONS, TIMEFRAMES, ZONES } from "@/lib/constants";
import { deriveSession, deriveZone } from "@/lib/derive";
import { plannedRR as calcPlannedRR, validateLevels } from "@/lib/rr";
import { parseNum } from "@/lib/utils";
import {
  HTF_BIAS_LABELS,
  S,
  SESSION_LABELS,
  ZONE_LABELS,
} from "@/lib/strings";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { TradeDraft } from "@/store/useTradeStore";

const tfOpts = TIMEFRAMES.map((t) => ({ label: t, value: t }));

interface TradeFormProps {
  initial?: Partial<TradeDraft>;
  submitting: boolean;
  mode?: "create" | "edit";
  onSubmit: (draft: TradeDraft, status: "planned" | "open") => void;
}

export function TradeForm({ initial, submitting, mode = "create", onSubmit }: TradeFormProps) {
  const settings = useSettingsStore();
  const last = settings.lastUsed;

  // Required (the only 4 things that gate a save).
  const [symbol, setSymbol] = useState(initial?.symbol ?? last?.symbol ?? "");
  const [direction, setDirection] = useState(initial?.direction ?? "long");
  const [setupType, setSetupType] = useState(initial?.setupType ?? "");
  const [entry, setEntry] = useState(initial?.entry?.toString() ?? "");
  const [stopLoss, setStopLoss] = useState(initial?.stopLoss?.toString() ?? "");
  const [takeProfit, setTakeProfit] = useState(initial?.takeProfit?.toString() ?? "");
  const [risk, setRisk] = useState(
    (initial?.riskPercent ?? last?.riskPercent ?? settings.defaultRiskPercent).toString(),
  );

  // Auto-derived session (A1) — editable on tap.
  const [session, setSession] = useState(initial?.session ?? deriveSession(new Date()));
  const [editSession, setEditSession] = useState(false);

  // Optional / reflective — collapsed by default.
  const [showDetail, setShowDetail] = useState(
    !!(initial?.confluences?.length || initial?.entryReason),
  );
  const [htfBias, setHtfBias] = useState(initial?.htfBias ?? last?.htfBias ?? "bullish");
  const [biasTf, setBiasTf] = useState(initial?.biasTimeframe ?? last?.biasTimeframe ?? "4H");
  const [entryTf, setEntryTf] = useState(initial?.entryTimeframe ?? last?.entryTimeframe ?? "15m");
  const [confluences, setConfluences] = useState<string[]>(initial?.confluences ?? []);
  const [zone, setZone] = useState(initial?.zone ?? "equilibrium");
  const [rangeHigh, setRangeHigh] = useState("");
  const [rangeLow, setRangeLow] = useState("");
  const [entryReason, setEntryReason] = useState(initial?.entryReason ?? "");
  const [screenshots, setScreenshots] = useState<string[]>(initial?.screenshots ?? []);

  const entryN = parseNum(entry);
  const slN = parseNum(stopLoss);
  const tpN = parseNum(takeProfit);
  const riskN = parseNum(risk);

  const levels = useMemo(
    () => validateLevels({ direction, entry: entryN, stopLoss: slN, takeProfit: tpN }),
    [direction, entryN, slN, tpN],
  );
  const plannedRR = useMemo(
    () => calcPlannedRR({ direction, entry: entryN, stopLoss: slN, takeProfit: tpN }),
    [direction, entryN, slN, tpN],
  );

  // Auto-derive zone from a dealing range when provided (A1).
  useEffect(() => {
    const z = deriveZone(parseNum(rangeHigh), parseNum(rangeLow), entryN);
    if (z) setZone(z);
  }, [rangeHigh, rangeLow, entryN]);

  const riskExceeded = Number.isFinite(riskN) && riskN > settings.maxRiskPercent;
  const canSubmit =
    symbol.trim().length > 0 &&
    setupType.length > 0 &&
    levels.ok &&
    plannedRR > 0 &&
    Number.isFinite(riskN) &&
    riskN > 0 &&
    !submitting;

  const submit = (status: "planned" | "open") => {
    if (!canSubmit) return;
    onSubmit(
      {
        symbol: symbol.trim().toUpperCase(),
        direction,
        status,
        session,
        htfBias,
        biasTimeframe: biasTf,
        entryTimeframe: entryTf,
        setupType: setupType as TradeDraft["setupType"],
        confluences: confluences as TradeDraft["confluences"],
        zone,
        entry: entryN,
        stopLoss: slN,
        takeProfit: tpN,
        riskPercent: riskN,
        plannedRR,
        entryReason: entryReason.trim(),
        mistakes: initial?.mistakes ?? [],
        notes: initial?.notes ?? "",
        screenshots,
      },
      status,
    );
  };

  return (
    <View>
      <Field label={S.trade.symbol} required>
        <TextField value={symbol} onChangeText={setSymbol} placeholder="BTCUSDT" autoCapitalize="characters" />
      </Field>

      <Field label={S.trade.direction}>
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { label: S.trade.long, value: "long" },
            { label: S.trade.short, value: "short" },
          ]}
        />
      </Field>

      {/* Auto session chip — read-only until tapped */}
      <Field label={S.trade.session}>
        {editSession ? (
          <Segmented
            layout="wrap"
            value={session}
            onChange={setSession}
            options={SESSIONS.map((s) => ({ label: SESSION_LABELS[s], value: s }))}
          />
        ) : (
          <Pressable
            onPress={() => setEditSession(true)}
            className="flex-row items-center justify-between rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <View>
              <AppText variant="body" className="font-medium">
                {SESSION_LABELS[session]}
              </AppText>
              <AppText variant="muted">{S.trade.autoSession}</AppText>
            </View>
            <Ionicons name="create-outline" size={18} color="#8E8E93" />
          </Pressable>
        )}
      </Field>

      <Field label={S.trade.setupType} required>
        <SetupPicker value={setupType} onChange={setSetupType} extra={settings.customSetups} />
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label={S.trade.entry} required>
            <TextField value={entry} onChangeText={setEntry} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
        </View>
        <View className="flex-1">
          <Field label={S.trade.stop} required error={levels.errors.stopLoss}>
            <TextField value={stopLoss} onChangeText={setStopLoss} placeholder="0.00" keyboardType="decimal-pad" invalid={!!levels.errors.stopLoss} />
          </Field>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label={S.trade.takeProfit} required error={levels.errors.takeProfit}>
            <TextField value={takeProfit} onChangeText={setTakeProfit} placeholder="0.00" keyboardType="decimal-pad" invalid={!!levels.errors.takeProfit} />
          </Field>
        </View>
        <View className="flex-1">
          <Field
            label={S.trade.risk}
            required
            error={riskExceeded ? S.trade.riskOver(settings.maxRiskPercent) : null}
            hint={S.trade.riskHint(settings.defaultRiskPercent, settings.maxRiskPercent)}
          >
            <TextField value={risk} onChangeText={setRisk} placeholder="1" keyboardType="decimal-pad" invalid={riskExceeded} />
          </Field>
        </View>
      </View>

      <Card className="mb-4 flex-row items-center justify-between">
        <AppText variant="label">{S.trade.plannedRR}</AppText>
        <RMultipleBadge r={plannedRR} planned />
      </Card>

      {/* Optional / reflective detail */}
      <Pressable
        onPress={() => setShowDetail((v) => !v)}
        className="mb-3 flex-row items-center justify-between rounded-xl bg-neutral-100 px-3 py-3 dark:bg-neutral-800"
      >
        <AppText variant="body" className="font-medium">
          {showDetail ? S.trade.hideDetail : S.trade.addDetail}
        </AppText>
        <Ionicons name={showDetail ? "chevron-up" : "chevron-down"} size={18} color="#8E8E93" />
      </Pressable>

      {showDetail ? (
        <View>
          <Field label={S.trade.htfBias}>
            <Segmented layout="wrap" value={htfBias} onChange={setHtfBias} options={HTF_BIASES.map((b) => ({ label: HTF_BIAS_LABELS[b], value: b }))} />
          </Field>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={S.trade.biasTf}>
                <Segmented layout="wrap" value={biasTf} onChange={setBiasTf} options={tfOpts} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label={S.trade.entryTf}>
                <Segmented layout="wrap" value={entryTf} onChange={setEntryTf} options={tfOpts} />
              </Field>
            </View>
          </View>
          <Field label={S.trade.confluences}>
            <ConfluenceSelector value={confluences} onChange={setConfluences} extra={settings.customConfluences} />
          </Field>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label={S.trade.rangeHigh}>
                <TextField value={rangeHigh} onChangeText={setRangeHigh} placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View className="flex-1">
              <Field label={S.trade.rangeLow}>
                <TextField value={rangeLow} onChangeText={setRangeLow} placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
          </View>
          <Field label={S.trade.zone}>
            <Segmented layout="wrap" value={zone} onChange={setZone} options={ZONES.map((z) => ({ label: ZONE_LABELS[z], value: z }))} />
          </Field>
          <Field label={S.trade.entryReason}>
            <TextField value={entryReason} onChangeText={setEntryReason} placeholder="..." multiline className="h-20" style={{ textAlignVertical: "top" }} />
          </Field>
          <Field label={S.trade.beforeShot}>
            <ScreenshotUploader value={screenshots} onChange={setScreenshots} max={2} />
          </Field>
        </View>
      ) : null}

      {mode === "edit" ? (
        <Button
          label={S.trade.save}
          icon="save-outline"
          loading={submitting}
          disabled={!canSubmit}
          onPress={() => submit((initial?.status as "planned" | "open") ?? "open")}
        />
      ) : (
        <View className="mt-1 gap-3">
          <SwipeToConfirm
            label={S.swipe.label}
            busyLabel={S.swipe.done}
            disabled={!canSubmit}
            confirming={submitting}
            onConfirm={() => submit("open")}
          />
          <Pressable onPress={() => submit("planned")} disabled={!canSubmit} className="items-center py-1">
            <AppText className={`text-sm ${canSubmit ? "text-accent" : "text-neutral-400"}`}>
              {S.trade.savePlanned}
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}
