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

  if (!data || !cm || !summary) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl px-8 py-12">
          <header className="mb-12">
            <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">No file uploaded</p>
          </header>
          <div className="flex flex-col items-center justify-center text-center border border-dashed border-border rounded-lg py-24 px-6">
            <p className="text-sm text-foreground">No data loaded.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a CSV to get started.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Go to Upload
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalSamples = summary.weighted.support;
  const correctCount = cm.matrix.reduce((s, row, i) => s + (row[i] ?? 0), 0);
  const misclassified = totalSamples - correctCount;

  return (
    <DashboardLayout>
      <div className="max-w-5xl px-8 py-12 space-y-12">
        <header className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-border rounded-md overflow-hidden">
            <StatTile label="Accuracy" value={fmt(summary.accuracy)} />
            <StatTile label="Weighted F1" value={fmt(summary.weighted.f1)} />
            <StatTile label="Total Samples" value={totalSamples.toLocaleString()} />
            <StatTile
              label="Misclassified"
              value={misclassified.toLocaleString()}
              sub={`${misclassified} of ${totalSamples}`}
            />
          </div>
        </header>

        <ConfusionMatrixView cm={cm} />
        <MetricsTable summary={summary} />
        {cm.labels.length > 2 ? (
          <p className="text-sm text-muted-foreground">
            ROC and threshold analysis are available for binary classification only.
          </p>
        ) : roc ? (
          <>
            <RocChart roc={roc} />
            {pr && (
              <ThresholdAnalyzer
                rows={data.rows}
                positiveLabel={roc.positiveLabel}
                pr={pr}
              />
            )}
          </>
        ) : (
          <section>
            <h2 className="text-sm font-medium text-foreground mb-4">ROC curve</h2>
            <EmptyState message="ROC curve requires binary classification with a y_prob column." />
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}


function ConfusionMatrixView({ cm }: { cm: ReturnType<typeof computeConfusionMatrix> }) {
  const { labels, matrix, max } = cm;
  const total = matrix.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
  const correct = matrix.reduce((s, row, i) => s + (row[i] ?? 0), 0);
  const pct = total === 0 ? 0 : (correct / total) * 100;
  const isBinary = labels.length === 2;
  // Convention: labels[1] is the positive class
  const tp = isBinary ? matrix[1][1] : 0;
  const tn = isBinary ? matrix[0][0] : 0;
  const fp = isBinary ? matrix[0][1] : 0;
  const fn = isBinary ? matrix[1][0] : 0;
  const cellTag = (i: number, j: number): string | null => {
    if (!isBinary) return null;
    if (i === 1 && j === 1) return "TP";
    if (i === 0 && j === 0) return "TN";
    if (i === 0 && j === 1) return "FP";
    if (i === 1 && j === 0) return "FN";
    return null;
  };
  const rowTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = labels.map((_, j) => matrix.reduce((s, row) => s + row[j], 0));
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-2">Confusion matrix</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Your model correctly classified{" "}
        <span className="text-foreground font-mono tabular-nums">{correct.toLocaleString()}</span>{" "}
        of{" "}
        <span className="text-foreground font-mono tabular-nums">{total.toLocaleString()}</span>{" "}
        samples (
        <span className="text-foreground font-mono tabular-nums">{pct.toFixed(2)}%</span>).
      </p>
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
              style={{ gridTemplateColumns: `auto repeat(${labels.length}, minmax(96px, 1fr)) auto` }}
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
              <div className="bg-background px-4 py-3 text-xs font-medium text-muted-foreground text-center">
                Total
              </div>
              {labels.map((rowLabel, i) => (
                <div key={`row-${rowLabel}`} className="contents">
                  <div className="bg-background px-4 py-5 text-sm font-mono text-muted-foreground text-right">
                    {rowLabel}
                  </div>
                  {labels.map((_, j) => {
                    const v = matrix[i][j];
                    const intensity = max === 0 ? 0 : v / max;
                    const tag = cellTag(i, j);
                    return (
                      <div
                        key={`c-${i}-${j}`}
                        className="px-4 py-5 text-base font-mono text-center tabular-nums text-foreground min-h-[64px] flex flex-col items-center justify-center gap-1"
                        style={{
                          backgroundColor: `color-mix(in oklab, var(--primary) ${(intensity * 100).toFixed(1)}%, var(--background))`,
                        }}
                      >
                        <span>{v}</span>
                        {tag && (
                          <span className="text-[10px] font-medium tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5 bg-background/60">
                            {tag}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="bg-background px-4 py-5 text-sm font-mono tabular-nums text-muted-foreground text-center">
                    {rowTotals[i]}
                  </div>
                </div>
              ))}
              <div className="bg-background px-4 py-3 text-xs font-medium text-muted-foreground text-right">
                Total
              </div>
              {colTotals.map((t, j) => (
                <div
                  key={`ct-${j}`}
                  className="bg-background px-4 py-3 text-sm font-mono tabular-nums text-muted-foreground text-center"
                >
                  {t}
                </div>
              ))}
              <div className="bg-background px-4 py-3 text-sm font-mono tabular-nums text-foreground text-center">
                {total}
              </div>
            </div>
            {isBinary && (
              <div className="mt-3 text-xs font-mono text-muted-foreground tabular-nums">
                True Positives: <span className="text-foreground">{tp}</span>
                {"  |  "}True Negatives: <span className="text-foreground">{tn}</span>
                {"  |  "}False Positives: <span className="text-foreground">{fp}</span>
                {"  |  "}False Negatives: <span className="text-foreground">{fn}</span>
              </div>
            )}
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
              formatter={(v: number) => Number(v.toFixed(2)).toString()}
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

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {

  return (
    <div className="px-5 py-4 border-r border-b sm:border-b-0 border-border last:border-r-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums font-mono text-foreground">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">{sub}</div>}
    </div>
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
  const [optimizeFor, setOptimizeFor] = useState<"f1" | "precision" | "recall">("f1");
  const m = useMemo(
    () => metricsAtThreshold(rows, positiveLabel, threshold),
    [rows, positiveLabel, threshold],
  );

  const optimal = useMemo(() => {
    if (!pr.length) return null;
    let best = pr[0];
    let bestScore = -Infinity;
    for (const p of pr) {
      const score =
        optimizeFor === "precision"
          ? p.precision
          : optimizeFor === "recall"
            ? p.recall
            : p.precision + p.recall === 0
              ? 0
              : (2 * p.precision * p.recall) / (p.precision + p.recall);
      if (score > bestScore && Number.isFinite(p.threshold)) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }, [pr, optimizeFor]);

  if (!m) return null;

  const posPreds = m.tp + m.fp;
  const negPreds = m.tn + m.fn;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Threshold analyzer</h2>
        <PositiveClassLabel label={String(positiveLabel)} />
      </div>

      <div className="border border-border rounded-md p-5 space-y-5">
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <div className="flex items-baseline gap-3">
              <label className="text-xs text-muted-foreground">Classification threshold</label>
              <button
                onClick={() => setThreshold(0.5)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Reset to 0.50
              </button>
            </div>
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

        <div>
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <label className="text-xs text-muted-foreground">Optimize for</label>
            {optimal && (
              <button
                onClick={() => setThreshold(Math.min(0.99, Math.max(0.01, optimal.threshold)))}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors font-mono tabular-nums"
              >
                Jump to optimal: {Math.min(0.99, Math.max(0.01, optimal.threshold)).toFixed(2)}
              </button>
            )}
          </div>
          <div className="inline-flex border border-border rounded-md overflow-hidden">
            {(["f1", "precision", "recall"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setOptimizeFor(opt)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-border last:border-r-0 ${
                  optimizeFor === opt
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt === "f1" ? "F1" : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-md overflow-hidden">
          <LiveStat label="Precision" value={fmt(m.precision)} />
          <LiveStat label="Recall" value={fmt(m.recall)} />
          <LiveStat label="F1" value={fmt(m.f1)} />
        </div>

        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          At this threshold:{" "}
          <span className="text-foreground">{posPreds.toLocaleString()}</span> positive predictions,{" "}
          <span className="text-foreground">{negPreds.toLocaleString()}</span> negative predictions
        </p>

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
                  formatter={(v: number) => Number(v.toFixed(2)).toString()}
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {optimal && (
                  <ReferenceDot
                    x={optimal.recall}
                    y={optimal.precision}
                    r={6}
                    fill="var(--background)"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    isFront
                  />
                )}
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
          {optimal && (
            <p className="mt-2 text-[11px] text-muted-foreground font-mono tabular-nums">
              Hollow ring = optimal threshold for{" "}
              {optimizeFor === "f1" ? "F1" : optimizeFor} · Solid dot = current threshold
            </p>
          )}
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
