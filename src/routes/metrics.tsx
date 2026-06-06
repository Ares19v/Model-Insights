import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Clipboard, Download, Info } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { usePresentationMode, scaleChartHeight } from "@/lib/presentation-mode";
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
  const presentation = usePresentationMode();

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


  const downloadBlob = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metrics-summary-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!summary) return;
    downloadBlob(metricsSummaryToCsv(summary), "text/csv", "csv");
  };

  const handleExportJson = () => {
    if (!summary) return;
    downloadBlob(JSON.stringify(summary, null, 2), "application/json", "json");
  };

  const handleCopySummary = async () => {
    if (!summary || !cm) return;
    const total = summary.weighted.support;
    const correct = cm.matrix.reduce((s, row, i) => s + (row[i] ?? 0), 0);
    const miss = total - correct;
    const lines = [
      "Model Evaluation Summary",
      "------------------------",
      `Accuracy: ${fmt(summary.accuracy)}`,
      `Weighted F1: ${fmt(summary.weighted.f1)}`,
      `Samples: ${total} | Misclassified: ${miss}`,
      "",
      ...summary.perClass.map(
        (c) =>
          `Class ${c.cls} — Precision: ${fmt(c.precision)}  Recall: ${fmt(c.recall)}  F1: ${fmt(c.f1)}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied!", { duration: 2000 });
    } catch {
      toast.error("Failed to copy");
    }
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
            {!presentation && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy summary
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
                    <Download className="h-3.5 w-3.5" />
                    Export
                    <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCsv}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJson}>Export as JSON</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
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
        <PerClassBreakdown summary={summary} />
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
            <CalibrationCurve rows={data.rows} positiveLabel={roc.positiveLabel} />
          </>
        ) : (
          <section>
            <h2 className="text-sm font-medium text-foreground mb-4">ROC curve</h2>
          <EmptyState message="ROC curve requires binary classification with a y_prob column." />
        </section>
      )}
      <MisclassifiedSamples
        rows={data.rows}
        labels={cm.labels}
        positiveLabel={roc?.positiveLabel}
      />
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

function PerClassBreakdown({ summary }: { summary: ReturnType<typeof computeMetrics> }) {
  const data = summary.perClass.map((c) => ({
    cls: c.cls,
    precision: Number(c.precision.toFixed(4)),
    recall: Number(c.recall.toFixed(4)),
    f1: Number(c.f1.toFixed(4)),
  }));
  const colors = {
    precision: "color-mix(in oklab, var(--primary) 70%, var(--background))",
    recall: "color-mix(in oklab, var(--primary) 45%, var(--background))",
    f1: "color-mix(in oklab, var(--primary) 25%, var(--muted-foreground))",
  };
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Per-class breakdown</h2>
      <div className="border border-border rounded-md p-4">
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
          {(["precision", "recall", "f1"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: colors[k] }}
              />
              <span className="capitalize">{k === "f1" ? "F1" : k}</span>
            </div>
          ))}
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
              <XAxis
                dataKey="cls"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                domain={[0, 1]}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => v.toFixed(2)}
              />
              <Bar dataKey="precision" fill={colors.precision} radius={[2, 2, 0, 0]} />
              <Bar dataKey="recall" fill={colors.recall} radius={[2, 2, 0, 0]} />
              <Bar dataKey="f1" fill={colors.f1} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
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

function CalibrationCurve({
  rows,
  positiveLabel,
}: {
  rows: PredictionRow[];
  positiveLabel: string;
}) {
  const scored = rows.filter((r) => typeof r.y_prob === "number");
  if (scored.length === 0) return null;

  const bins = 10;
  const buckets: { sumProb: number; pos: number; n: number }[] = Array.from(
    { length: bins },
    () => ({ sumProb: 0, pos: 0, n: 0 }),
  );
  let brierSum = 0;
  for (const r of scored) {
    const p = r.y_prob as number;
    const y = r.y_true === positiveLabel ? 1 : 0;
    brierSum += (p - y) ** 2;
    let idx = Math.floor(p * bins);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    buckets[idx].sumProb += p;
    buckets[idx].pos += y;
    buckets[idx].n += 1;
  }
  const brier = brierSum / scored.length;

  const data = buckets
    .filter((b) => b.n > 0)
    .map((b) => ({
      mean: b.sumProb / b.n,
      fraction: b.pos / b.n,
      diag: b.sumProb / b.n,
    }));

  const interpretation =
    brier < 0.15 ? "Well calibrated" : brier < 0.25 ? "Moderately calibrated" : "Poorly calibrated";

  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Calibration curve</h2>
      <div className="border border-border rounded-md p-4">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="mean"
                domain={[0, 1]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                label={{
                  value: "Mean predicted probability",
                  position: "insideBottom",
                  offset: -12,
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                domain={[0, 1]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                label={{
                  value: "Fraction of positives",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => v.toFixed(3)}
              />
              <Line
                type="monotone"
                dataKey="diag"
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                dot={false}
                name="Perfect calibration"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="fraction"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)" }}
                name="Model"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Brier Score:{" "}
            <span className="font-mono tabular-nums text-foreground">{fmt(brier)}</span>
          </span>
          <TooltipProvider delayDuration={150}>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[260px] text-xs font-sans bg-popover text-popover-foreground border border-border"
              >
                Brier score is the mean squared error between predicted probabilities and actual
                outcomes (0 or 1). Lower is better — 0 is perfect.
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          <span className="text-muted-foreground">— lower is better</span>
          <span className="ml-auto text-xs text-foreground">{interpretation}</span>
        </div>
      </div>
    </section>
  );
}

type ErrorFilter = "all" | "fp" | "fn";

function MisclassifiedSamples({
  rows,
  labels,
  positiveLabel,
}: {
  rows: PredictionRow[];
  labels: string[];
  positiveLabel?: string;
}) {
  const [filter, setFilter] = useState<ErrorFilter>("all");
  const isBinary = labels.length === 2;

  const misclassified = useMemo(() => {
    const list = rows
      .map((row, idx) => ({ ...row, index: idx }))
      .filter((row) => row.y_true !== row.y_pred);

    const hasProb = list.some((r) => typeof r.y_prob === "number");
    if (hasProb) {
      list.sort((a, b) => {
        const pa = typeof a.y_prob === "number" ? a.y_prob : -1;
        const pb = typeof b.y_prob === "number" ? b.y_prob : -1;
        return pb - pa;
      });
    }
    return list;
  }, [rows]);

  const getErrorType = (row: PredictionRow): string => {
    if (!isBinary || !positiveLabel) return "Misclassified";
    return row.y_pred === positiveLabel ? "False Positive" : "False Negative";
  };

  const counts = useMemo(() => {
    if (!isBinary || !positiveLabel) {
      return { all: misclassified.length, fp: 0, fn: 0 };
    }
    return misclassified.reduce(
      (acc, row) => {
        acc.all++;
        if (row.y_pred === positiveLabel) acc.fp++;
        else acc.fn++;
        return acc;
      },
      { all: 0, fp: 0, fn: 0 },
    );
  }, [misclassified, isBinary, positiveLabel]);

  const filtered = useMemo(() => {
    if (filter === "all") return misclassified;
    if (!isBinary || !positiveLabel) return misclassified;
    if (filter === "fp")
      return misclassified.filter((row) => row.y_pred === positiveLabel);
    return misclassified.filter((row) => row.y_pred !== positiveLabel);
  }, [misclassified, filter, isBinary, positiveLabel]);

  const hasProb = rows.some((r) => typeof r.y_prob === "number");

  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Misclassified samples</h2>
      <div className="flex items-center gap-2 mb-3">
        <FilterButton
          label="All"
          count={counts.all}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        {isBinary && (
          <>
            <FilterButton
              label="False Positives"
              count={counts.fp}
              active={filter === "fp"}
              onClick={() => setFilter("fp")}
            />
            <FilterButton
              label="False Negatives"
              count={counts.fn}
              active={filter === "fn"}
              onClick={() => setFilter("fn")}
            />
          </>
        )}
      </div>
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Row</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-2.5">y_true</th>
              <th className="text-left font-medium text-muted-foreground px-4 py-2.5">y_pred</th>
              {hasProb && (
                <th className="text-right font-medium text-muted-foreground px-4 py-2.5">
                  y_prob
                </th>
              )}
              <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Error type</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {filtered.map((row) => (
              <tr key={row.index} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-foreground">{row.index}</td>
                <td className="px-4 py-2.5 text-foreground">{row.y_true}</td>
                <td className="px-4 py-2.5 text-foreground">{row.y_pred}</td>
                {hasProb && (
                  <td className="px-4 py-2.5 text-right">
                    {typeof row.y_prob === "number" ? row.y_prob.toFixed(4) : "—"}
                  </td>
                )}
                <td className="px-4 py-2.5">
                  {(() => {
                    const et = getErrorType(row);
                    if (et === "False Positive") {
                      return (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium bg-destructive/15 text-destructive">
                          {et}
                        </span>
                      );
                    }
                    if (et === "False Negative") {
                      return (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium bg-primary/15 text-primary">
                          {et}
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                        {et}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={hasProb ? 5 : 4}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No misclassified samples match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasProb && (
        <p className="mt-3 text-xs text-muted-foreground">
          Sorted by model confidence — high confidence errors indicate systematic failure modes.
        </p>
      )}
    </section>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {label}
      <span
        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-semibold min-w-[18px] ${
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
