import { ActivityIndicator, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { AppText } from "@/components/ui/Text";
import { S } from "@/lib/strings";
import type { AnalysisStep } from "@/store/useStockAnalysisStore";

const STEP_LABEL: Record<Exclude<AnalysisStep, "idle">, string> = {
  fetching: S.stock.stepFetching,
  news: S.stock.stepNews,
  writing: S.stock.stepWriting,
};

interface AnalysisProgressProps {
  step: AnalysisStep;
  ticker: string | null;
}

export function AnalysisProgress({ step, ticker }: AnalysisProgressProps) {
  if (step === "idle") return null;
  return (
    <Card className="mb-4 flex-row items-center gap-3">
      <ActivityIndicator color="#7C5CFC" />
      <View className="flex-1">
        <AppText variant="heading">{ticker}</AppText>
        <AppText variant="muted">{STEP_LABEL[step]}</AppText>
      </View>
    </Card>
  );
}
