import { View } from "react-native";
import { Card } from "./ui/Card";
import { AppText } from "./ui/Text";
import { formatR } from "@/lib/utils";
import type { CleanVsMistake } from "@/lib/analytics";

function Column({
  title,
  avgR,
  winRate,
  count,
}: {
  title: string;
  avgR: number;
  winRate: number;
  count: number;
}) {
  const color = avgR >= 0 ? "#16C784" : "#EA3943";
  return (
    <View className="flex-1">
      <AppText variant="label" className="mb-1">
        {title}
      </AppText>
      <AppText className="text-2xl font-bold" style={{ color }}>
        {formatR(avgR)}
      </AppText>
      <AppText variant="muted">işlem başına ort. R</AppText>
      <AppText variant="muted" className="mt-1">
        %{winRate.toFixed(0)} WR · {count} işlem
      </AppText>
    </View>
  );
}

/** The headline discipline payoff: does clean execution actually pay better? */
export function CleanVsMistakeCard({ data }: { data: CleanVsMistake }) {
  const edge = data.clean.avgR - data.withMistakes.avgR;
  return (
    <Card>
      <View className="flex-row">
        <Column
          title="Temiz işlemler"
          avgR={data.clean.avgR}
          winRate={data.clean.winRate}
          count={data.clean.count}
        />
        <View className="mx-2 w-px bg-neutral-200 dark:bg-neutral-800" />
        <Column
          title="Hatalı işlemler"
          avgR={data.withMistakes.avgR}
          winRate={data.withMistakes.winRate}
          count={data.withMistakes.count}
        />
      </View>
      {data.clean.count > 0 && data.withMistakes.count > 0 ? (
        <View className="mt-3 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800">
          <AppText variant="muted" className="text-center">
            Temiz uygulama, hatalı işlem yapmaya kıyasla işlem başına{" "}
            <AppText className="font-bold" style={{ color: edge >= 0 ? "#16C784" : "#EA3943" }}>
              {formatR(edge)}
            </AppText>{" "}
            değerinde.
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}
