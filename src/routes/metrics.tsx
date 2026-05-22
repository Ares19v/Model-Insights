import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Info } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState } from "@/components/EmptyState";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePredictions, type PredictionRow } from "@/lib/predictions-store";
import {
  computeConfusionMatrix,
  computeMetrics,
  computePrCurve,
  computeRoc,
  metricsAtThreshold,
  metricsSummaryToCsv,
} from "@/lib/metrics";

export const Route = createFileRoute("/metrics")({
  head: () => ({ meta: [{ title: "Metrics — Model Evaluation Dashboard" }] }),
  component: MetricsPage,
});

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : "—");

function MetricsPage() {
  const data = usePredictions();

  const cm = useMemo(() => (data ? computeConfusionMatrix(data.rows) : null), [data]);
  const summary = useMemo(() => (cm ? computeMetrics(cm) : null), [cm]);
  const roc = useMemo(
    () => (data && cm ? computeRoc(data.rows, cm.labels) : null),
    [data, cm],
  );
  const pr = useMemo(
    () => (data && roc ? computePrCurve(data.rows, roc.positiveLabel) : null),
    [data, roc],
  );

  const handleExport = () => {
    if (!summary) return;
    const csv = metricsSummaryToCsv(summary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metrics-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl px-8 py-12 space-y-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {summary
                ? `Accuracy ${fmt(summary.accuracy)} · ${summary.weighted.support.toLocaleString()} samples`
                : "No file uploaded"}
            </p>
          </div>
          {summary && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
        </header>

        {!data || !cm || !summary ? (
          <>
            <SectionShell title="Confusion matrix" />
            <SectionShell title="Metrics summary" />
            <SectionShell title="ROC curve" />
          </>
        ) : (
          <>
            <ConfusionMatrixView cm={cm} />
            <MetricsTable summary={summary} />
            {roc ? (
              <RocChart roc={roc} />
            ) : (
              <section>
                <h2 className="text-sm font-medium text-foreground mb-4">ROC curve</h2>
                <EmptyState message="ROC curve requires binary classification with a y_prob column." />
              </section>
            )}
            {roc && pr && data && (
              <ThresholdAnalyzer
                rows={data.rows}
                positiveLabel={roc.positiveLabel}
                pr={pr}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SectionShell({ title }: { title: string }) {
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">{title}</h2>
      <EmptyState />
    </section>
  );
}

function ConfusionMatrixView({ cm }: { cm: ReturnType<typeof computeConfusionMatrix> }) {
  const { labels, matrix, max } = cm;
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Confusion matrix</h2>
      <div className="flex items-start gap-4">
        <div className="flex items-center pt-16">
          <span className="text-xs text-muted-foreground -rotate-90 whitespace-nowrap origin-center">
            Actual
          </span>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2 text-center">Predicted</div>
          <div className="inline-block">
            <div
              className="grid gap-px bg-border p-px rounded-md"
              style={{ gridTemplateColumns: `auto repeat(${labels.length}, minmax(96px, 1fr))` }}
            >
              <div className="bg-background" />
              {labels.map((l) => (
                <div
                  key={`h-${l}`}
                  className="bg-background px-4 py-3 text-sm font-mono text-muted-foreground text-center"
                >
                  {l}
                </div>
              ))}
              {labels.map((rowLabel, i) => (
                <div key={`row-${rowLabel}`} className="contents">
                  <div className="bg-background px-4 py-5 text-sm font-mono text-muted-foreground text-right">
                    {rowLabel}
                  </div>
                  {labels.map((_, j) => {
                    const v = matrix[i][j];
                    const intensity = max === 0 ? 0 : v / max;
                    return (
                      <div
                        key={`c-${i}-${j}`}
                        className="px-4 py-5 text-base font-mono text-center tabular-nums text-foreground min-h-[64px] flex items-center justify-center"
                        style={{
                          backgroundColor: `color-mix(in oklab, var(--primary) ${(intensity * 100).toFixed(1)}%, var(--background))`,
                        }}
                      >
                        {v}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Lower</span>
              <div
                className="h-2 w-40 rounded-sm border border-border"
                style={{
                  background:
                    "linear-gradient(to right, color-mix(in oklab, var(--primary) 0%, var(--background)), var(--primary))",
                }}
              />
              <span className="text-xs text-muted-foreground">Higher count</span>
              <span className="text-xs text-muted-foreground ml-2">
                Darker = more samples
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PositiveClassLabel({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <UITooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono cursor-help">
            Positive class: <span className="text-foreground">{label}</span>
            <Info className="h-3 w-3 opacity-70" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px] text-xs font-sans bg-popover text-popover-foreground border border-border">
          The class treated as positive when computing ROC and Precision–Recall curves from y_prob.
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

function MetricsTable({ summary }: { summary: ReturnType<typeof computeMetrics> }) {
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Metrics summary</h2>
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Class</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Precision</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Recall</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-2.5">F1</th>
              <th className="text-right font-medium text-muted-foreground px-4 py-2.5">Support</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {summary.perClass.map((c) => (
              <tr key={c.cls} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-foreground">{c.cls}</td>
                <td className="px-4 py-2.5 text-right">{fmt(c.precision)}</td>
                <td className="px-4 py-2.5 text-right">{fmt(c.recall)}</td>
                <td className="px-4 py-2.5 text-right">{fmt(c.f1)}</td>
                <td className="px-4 py-2.5 text-right">{c.support}</td>
              </tr>
            ))}
            <tr className="bg-muted/40 border-t border-border">
              <td className="px-4 py-2.5 text-foreground font-sans font-medium">Weighted avg</td>
              <td className="px-4 py-2.5 text-right">{fmt(summary.weighted.precision)}</td>
              <td className="px-4 py-2.5 text-right">{fmt(summary.weighted.recall)}</td>
              <td className="px-4 py-2.5 text-right">{fmt(summary.weighted.f1)}</td>
              <td className="px-4 py-2.5 text-right">{summary.weighted.support}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Accuracy: <span className="font-mono">{fmt(summary.accuracy)}</span>
      </p>
    </section>
  );
}

function RocChart({ roc }: { roc: NonNullable<ReturnType<typeof computeRoc>> }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">ROC curve</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            AUC = {roc.auc.toFixed(3)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <PositiveClassLabel label={String(roc.positiveLabel)} />
        </div>
      </div>
      <div className="h-[360px] w-full border border-border rounded-md p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={roc.points} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} />
            <XAxis
              type="number"
              dataKey="fpr"
              domain={[0, 1]}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              label={{
                value: "False positive rate",
                position: "insideBottom",
                offset: -8,
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <YAxis
              type="number"
              domain={[0, 1]}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              label={{
                value: "True positive rate",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "var(--muted-foreground)",
              }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(v: number) => v.toFixed(3)}
            />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="tpr"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ThresholdAnalyzer({
  rows,
  positiveLabel,
  pr,
}: {
  rows: PredictionRow[];
  positiveLabel: string;
  pr: NonNullable<ReturnType<typeof computePrCurve>>;
}) {
  const [threshold, setThreshold] = useState(0.5);
  const m = useMemo(
    () => metricsAtThreshold(rows, positiveLabel, threshold),
    [rows, positiveLabel, threshold],
  );

  if (!m) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Threshold analyzer</h2>
        <PositiveClassLabel label={String(positiveLabel)} />
      </div>

      <div className="border border-border rounded-md p-5 space-y-5">
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-xs text-muted-foreground">Classification threshold</label>
              <span className="text-sm font-mono tabular-nums text-foreground">
                {threshold.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[threshold]}
              min={0.01}
              max={0.99}
              step={0.01}
              onValueChange={(v) => setThreshold(v[0])}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden">
          <LiveStat label="Precision" value={fmt(m.precision)} />
          <LiveStat label="Recall" value={fmt(m.recall)} />
          <LiveStat label="F1" value={fmt(m.f1)} />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Precision–Recall curve</div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pr} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis
                  type="number"
                  dataKey="recall"
                  domain={[0, 1]}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value: "Recall",
                    position: "insideBottom",
                    offset: -8,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  type="number"
                  domain={[0, 1]}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value: "Precision",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => v.toFixed(3)}
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <ReferenceDot
                  x={m.recall}
                  y={m.precision}
                  r={5}
                  fill="var(--primary)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  isFront
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums font-mono">
        {value}
      </div>
    </div>
  );
}
