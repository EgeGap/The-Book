import { Linking, View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { AppText } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Accordion } from "./Accordion";
import { S } from "@/lib/strings";
import type { ScenarioOutlook, StockAnalysisRecord, StockVerdict } from "@/lib/types";

const VERDICT_BG: Record<StockVerdict, string> = {
  ucuz: "bg-win",
  makul: "bg-[#F5A623]",
  "pahalı": "bg-loss",
};

function VerdictBadge({ verdict }: { verdict: StockVerdict }) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${VERDICT_BG[verdict]}`}>
      <AppText className="text-xs font-semibold text-white">
        {S.stock.valuationVerdict[verdict]}
      </AppText>
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <View className="self-start rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800">
      <AppText variant="muted">{S.stock.confidence(confidence)}</AppText>
    </View>
  );
}

function ScenarioRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2">
      <AppText variant="label">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

function ScenarioCard({ title, scenario }: { title: string; scenario: ScenarioOutlook }) {
  return (
    <View className="mb-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
      <View className="mb-2 flex-row items-center justify-between">
        <AppText variant="heading">{title}</AppText>
        <View className="rounded-full bg-accent px-2 py-0.5">
          <AppText className="text-xs font-semibold text-white">
            {S.stock.probability(scenario.baseProbability)}
          </AppText>
        </View>
      </View>
      <ScenarioRow label={S.stock.bear} value={scenario.bear} />
      <ScenarioRow label={S.stock.base} value={scenario.base} />
      <ScenarioRow label={S.stock.bull} value={scenario.bull} />
    </View>
  );
}

const IMPACT_COLOR: Record<string, string> = {
  olumlu: "text-win",
  olumsuz: "text-loss",
  "nötr": "text-neutral-500 dark:text-neutral-400",
};

interface StockReportViewProps {
  record: StockAnalysisRecord;
  onReanalyze: () => void;
  reanalyzing: boolean;
}

export function StockReportView({ record, onReanalyze, reanalyzing }: StockReportViewProps) {
  const { report } = record;
  const fx = report.fundamentals;

  return (
    <View>
      <Card className="mb-4">
        <View className="mb-1 flex-row items-center justify-between">
          <AppText variant="title">{report.companyName}</AppText>
          <VerdictBadge verdict={report.valuation.verdict} />
        </View>
        <AppText variant="muted">
          {report.ticker} · {report.market}
        </AppText>
        <View className="mt-3 flex-row gap-4">
          <View>
            <AppText variant="label">{S.stock.currentPrice}</AppText>
            <AppText variant="heading">
              {report.currentPrice != null ? `${report.currentPrice} ${report.currency}` : "Veri bulunamadı"}
            </AppText>
          </View>
          <View>
            <AppText variant="label">{S.stock.marketCap}</AppText>
            <AppText variant="heading">{report.marketCap ?? "Veri bulunamadı"}</AppText>
          </View>
        </View>
        <AppText variant="muted" className="mt-2">
          {S.stock.asOf(report.asOfDate)}
        </AppText>
        <View className="mt-3 flex-row items-center justify-between">
          <ConfidenceBadge confidence={report.confidence} />
          <AppText variant="muted">
            {S.stock.lastUpdate(
              formatDistanceToNow(record.updatedAt, { addSuffix: true, locale: tr }),
            )}
          </AppText>
        </View>
        <View className="mt-3">
          <Button label={S.stock.reanalyze} variant="secondary" icon="refresh-outline" loading={reanalyzing} onPress={onReanalyze} />
        </View>
      </Card>

      <Accordion title={S.stock.summary} defaultOpen>
        <AppText variant="body">{report.summary}</AppText>
      </Accordion>

      <Accordion title={S.stock.valuation} badge={<VerdictBadge verdict={report.valuation.verdict} />}>
        <AppText variant="body" className="mb-2">
          {report.valuation.reasoning}
        </AppText>
        {report.valuation.fairValueRange ? (
          <AppText variant="muted">{report.valuation.fairValueRange}</AppText>
        ) : null}
      </Accordion>

      <Accordion title={S.stock.outlook}>
        <ScenarioCard title={S.stock.outlookShort} scenario={report.outlook.short} />
        <ScenarioCard title={S.stock.outlookMedium} scenario={report.outlook.medium} />
        <ScenarioCard title={S.stock.outlookLong} scenario={report.outlook.long} />
      </Accordion>

      <Accordion title={S.stock.fundamentals}>
        {[
          [S.stock.revenue, fx.revenue],
          [S.stock.netIncome, fx.netIncome],
          [S.stock.profitMargin, fx.profitMargin],
          [S.stock.peRatio, fx.peRatio != null ? String(fx.peRatio) : null],
          [S.stock.pbRatio, fx.pbRatio != null ? String(fx.pbRatio) : null],
          [S.stock.debtToEquity, fx.debtToEquity],
          [S.stock.revenueGrowth, fx.revenueGrowthYoY],
        ].map(([label, value]) => (
          <View key={label} className="mb-2 flex-row justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
            <AppText variant="label">{label}</AppText>
            <AppText variant="body">{value ?? "Veri bulunamadı"}</AppText>
          </View>
        ))}
        {fx.note ? <AppText variant="muted" className="mt-1">{fx.note}</AppText> : null}
      </Accordion>

      <Accordion title={S.stock.strengths}>
        {report.strengths.length === 0 ? (
          <AppText variant="muted">Veri bulunamadı</AppText>
        ) : (
          report.strengths.map((s, i) => (
            <AppText key={i} variant="body" className="mb-1">
              • {s}
            </AppText>
          ))
        )}
      </Accordion>

      <Accordion title={S.stock.risks}>
        {report.risks.length === 0 ? (
          <AppText variant="muted">Veri bulunamadı</AppText>
        ) : (
          report.risks.map((r, i) => (
            <AppText key={i} variant="body" className="mb-1">
              • {r}
            </AppText>
          ))
        )}
      </Accordion>

      <Accordion title={S.stock.sector}>
        <AppText variant="heading" className="mb-1">
          {report.sector.name}
        </AppText>
        <AppText variant="body" className="mb-2">
          {report.sector.positioning}
        </AppText>
        {report.sector.competitors.length > 0 ? (
          <>
            <AppText variant="label" className="mb-1">
              {S.stock.competitors}
            </AppText>
            <AppText variant="body">{report.sector.competitors.join(", ")}</AppText>
          </>
        ) : null}
      </Accordion>

      <Accordion title={S.stock.news}>
        {report.recentNews.length === 0 ? (
          <AppText variant="muted">Veri bulunamadı</AppText>
        ) : (
          report.recentNews.map((n, i) => (
            <View key={i} className="mb-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
              <View className="flex-row items-center justify-between">
                <AppText variant="muted">{n.date}</AppText>
                <AppText className={`text-xs font-semibold ${IMPACT_COLOR[n.impact]}`}>
                  {S.stock.newsImpact[n.impact]}
                </AppText>
              </View>
              <AppText variant="body">{n.headline}</AppText>
            </View>
          ))
        )}
      </Accordion>

      <Accordion title={S.stock.sources}>
        {report.sources.length === 0 ? (
          <AppText variant="muted">{S.stock.noSources}</AppText>
        ) : (
          report.sources.map((src, i) => (
            <AppText
              key={i}
              variant="body"
              className="mb-2 text-accent"
              onPress={() => Linking.openURL(src.url).catch(() => {})}
            >
              {src.title}
            </AppText>
          ))
        )}
      </Accordion>

      {report.dataGaps.length > 0 ? (
        <Accordion title={S.stock.dataGaps}>
          {report.dataGaps.map((g, i) => (
            <AppText key={i} variant="muted" className="mb-1">
              • {g}
            </AppText>
          ))}
        </Accordion>
      ) : null}

      <Card className="mb-8 bg-neutral-100 dark:bg-neutral-900">
        <AppText variant="muted">{S.stock.disclaimer}</AppText>
      </Card>
    </View>
  );
}
