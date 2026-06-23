import { useState } from "react";
import { View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { AppText } from "./ui/Text";
import { useColors } from "@/lib/theme";
import { formatR } from "@/lib/utils";
import type { EquityPoint } from "@/lib/analytics";

interface EquityCurveProps {
  points: EquityPoint[];
  height?: number;
}

/** Cumulative-R line chart (react-native-gifted-charts). */
export function EquityCurve({ points, height = 190 }: EquityCurveProps) {
  const c = useColors();
  const [width, setWidth] = useState(0);

  if (points.length < 2) {
    return (
      <View
        style={{ height }}
        className="items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800"
      >
        <AppText variant="muted">Eğrini büyütmek için birkaç işlem kapat</AppText>
      </View>
    );
  }

  const last = points[points.length - 1].cumR;
  const lineColor = last >= 0 ? c.win : c.loss;
  const data = points.map((p) => ({ value: p.cumR }));
  const spacing = width > 0 ? Math.max(6, (width - 24) / (data.length - 1)) : 24;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View className="mb-2 flex-row items-end justify-between">
        <AppText variant="label">Sermaye eğrisi · kümülatif R</AppText>
        <AppText
          className="text-lg font-bold"
          style={{ color: lineColor }}
        >
          {formatR(last)}
        </AppText>
      </View>
      {width > 0 ? (
        <LineChart
          data={data}
          height={height}
          width={width - 8}
          spacing={spacing}
          initialSpacing={8}
          endSpacing={0}
          thickness={2.5}
          color={lineColor}
          hideDataPoints={data.length > 14}
          dataPointsColor={lineColor}
          hideRules
          yAxisColor="transparent"
          xAxisColor={c.grid}
          yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
          noOfSections={4}
          curved
          disableScroll
          adjustToWidth
        />
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
