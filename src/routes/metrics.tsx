import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { usePredictions } from "@/lib/predictions-store";
import { computeConfusionMatrix, computeMetrics, computeRoc } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/metrics")({
  head: () => ({ meta: [{ title: "Metrics — Model Evaluation Dashboard" }] }),
  component: MetricsPage,
});

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : "—");

function MetricsPage() {
  const data = usePredictions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) navigate({ to: "/" });
  }, [data, navigate]);

  const cm = useMemo(() => (data ? computeConfusionMatrix(data.rows) : null), [data]);
  const summary = useMemo(() => (cm ? computeMetrics(cm) : null), [cm]);
  const roc = useMemo(
    () => (data && cm ? computeRoc(data.rows, cm.labels) : null),
    [data, cm],
  );

  if (!data || !cm || !summary) return null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl px-8 py-12 space-y-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Accuracy {fmt(summary.accuracy)} · {summary.weighted.support.toLocaleString()} samples
          </p>
        </header>

        <ConfusionMatrixView cm={cm} />
        <MetricsTable summary={summary} />
        {roc && <RocChart roc={roc} />}
      </div>
    </DashboardLayout>
  );
}

function ConfusionMatrixView({ cm }: { cm: ReturnType<typeof computeConfusionMatrix> }) {
  const { labels, matrix, max } = cm;
  return (
    <section>
      <h2 className="text-sm font-medium text-foreground mb-4">Confusion matrix</h2>
      <div className="flex items-start gap-4">
        <div className="flex items-center pt-10">
          <span className="text-xs text-muted-foreground -rotate-90 whitespace-nowrap origin-center">
            Actual
          </span>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-2 text-center">Predicted</div>
          <div className="inline-block">
            <div
              className="grid gap-px bg-border p-px rounded-md"
              style={{ gridTemplateColumns: `auto repeat(${labels.length}, minmax(64px, 1fr))` }}
            >
              <div className="bg-background" />
              {labels.map((l) => (
                <div
                  key={`h-${l}`}
                  className="bg-background px-3 py-2 text-xs font-mono text-muted-foreground text-center"
                >
                  {l}
                </div>
              ))}
              {labels.map((rowLabel, i) => (
                <div key={`row-${rowLabel}`} className="contents">
                  <div className="bg-background px-3 py-2 text-xs font-mono text-muted-foreground text-right">
                    {rowLabel}
                  </div>
                  {labels.map((_, j) => {
                    const v = matrix[i][j];
                    const intensity = max === 0 ? 0 : v / max;
                    return (
                      <div
                        key={`c-${i}-${j}`}
                        className="px-3 py-3 text-sm font-mono text-center tabular-nums text-foreground"
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
          </div>
        </div>
      </div>
    </section>
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
      <p className={cn("mt-3 text-xs text-muted-foreground")}>
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
        <span className="text-xs text-muted-foreground font-mono">
          AUC = {roc.auc.toFixed(3)} · positive: {roc.positiveLabel}
        </span>
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
