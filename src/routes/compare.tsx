import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { usePresentationMode, scaleChartHeight } from "@/lib/presentation-mode";
import type { PredictionRow } from "@/lib/predictions-store";
import {
  computeConfusionMatrix,
  computeMetrics,
  computeRoc,
  type MetricsSummary,
  type RocResult,
} from "@/lib/metrics";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare — Model Evaluation Dashboard" }] }),
  component: ComparePage,
});

type Loaded = {
  fileName: string;
  rows: PredictionRow[];
};

type ModelEval = {
  summary: MetricsSummary;
  roc: RocResult | null;
};

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : "—");

function ComparePage() {
  const [a, setA] = useState<Loaded | null>(null);
  const [b, setB] = useState<Loaded | null>(null);

  const evalA = useMemo<ModelEval | null>(() => evaluate(a), [a]);
  const evalB = useMemo<ModelEval | null>(() => evaluate(b), [b]);

  const both = evalA && evalB;

  const verdict = useMemo(() => {
    if (!both) return null;
    const sa = score(evalA!.summary);
    const sb = score(evalB!.summary);
    const diff = sa - sb;
    if (Math.abs(diff) < 0.02) return { text: "Models are comparable", tone: "muted" as const };
    return diff > 0
      ? { text: "Model A performs better overall", tone: "a" as const }
      : { text: "Model B performs better overall", tone: "b" as const };
  }, [both, evalA, evalB]);

  const rocData = useMemo(() => {
    if (!evalA?.roc && !evalB?.roc) return null;
    // Merge ROC points by fpr — use a unified series with both keys.
    const map = new Map<number, { fpr: number; a?: number; b?: number }>();
    const add = (pts: RocResult | null, key: "a" | "b") => {
      if (!pts) return;
      for (const p of pts.points) {
        const k = Number(p.fpr.toFixed(4));
        const ex = map.get(k) ?? { fpr: k };
        ex[key] = p.tpr;
        map.set(k, ex);
      }
    };
    add(evalA?.roc ?? null, "a");
    add(evalB?.roc ?? null, "b");
    return Array.from(map.values()).sort((x, y) => x.fpr - y.fpr);
  }, [evalA, evalB]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl px-8 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Compare models</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload predictions from two models to compare them side by side.
          </p>
        </header>

        {both && verdict && (
          <div
            className={cn(
              "mb-8 rounded-md border px-4 py-3 text-sm font-medium",
              verdict.tone === "muted" && "border-border bg-muted/30 text-muted-foreground",
              verdict.tone === "a" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              verdict.tone === "b" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {verdict.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-10">
          <CompareUpload label="Model A" value={a} onChange={setA} />
          <CompareUpload label="Model B" value={b} onChange={setB} />
        </div>

        {both && (
          <>
            <section className="mb-10">
              <h2 className="text-sm font-medium text-foreground mb-4">Metrics comparison</h2>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Metric
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5">
                        Model A
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-4 py-2.5">
                        Model B
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRow
                      label="Accuracy"
                      a={evalA!.summary.accuracy}
                      b={evalB!.summary.accuracy}
                    />
                    <MetricRow
                      label="Weighted F1"
                      a={evalA!.summary.weighted.f1}
                      b={evalB!.summary.weighted.f1}
                    />
                    <MetricRow
                      label="Precision"
                      a={evalA!.summary.weighted.precision}
                      b={evalB!.summary.weighted.precision}
                    />
                    <MetricRow
                      label="Recall"
                      a={evalA!.summary.weighted.recall}
                      b={evalB!.summary.weighted.recall}
                    />
                  </tbody>
                </table>
              </div>
            </section>

            {rocData && (
              <section className="mb-10">
                <h2 className="text-sm font-medium text-foreground mb-1">ROC curves</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Model A AUC: {evalA!.roc ? fmt(evalA!.roc.auc) : "—"} · Model B AUC:{" "}
                  {evalB!.roc ? fmt(evalB!.roc.auc) : "—"}
                </p>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={rocData}
                      margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                    >
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} />
                      <XAxis
                        type="number"
                        dataKey="fpr"
                        domain={[0, 1]}
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "False positive rate",
                          position: "insideBottom",
                          offset: -4,
                          fill: "var(--muted-foreground)",
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        type="number"
                        domain={[0, 1]}
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        label={{
                          value: "True positive rate",
                          angle: -90,
                          position: "insideLeft",
                          fill: "var(--muted-foreground)",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => fmt(Number(v))}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="a"
                        name={`Model A (AUC ${evalA!.roc ? fmt(evalA!.roc.auc) : "—"})`}
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="b"
                        name={`Model B (AUC ${evalB!.roc ? fmt(evalB!.roc.auc) : "—"})`}
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function MetricRow({ label, a, b }: { label: string; a: number; b: number }) {
  const aBetter = a > b + 1e-9;
  const bBetter = b > a + 1e-9;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5 text-foreground">{label}</td>
      <td
        className={cn(
          "px-4 py-2.5 text-right tabular-nums",
          aBetter ? "text-emerald-400 font-semibold" : "text-muted-foreground",
        )}
      >
        {fmt(a)}
      </td>
      <td
        className={cn(
          "px-4 py-2.5 text-right tabular-nums",
          bBetter ? "text-emerald-400 font-semibold" : "text-muted-foreground",
        )}
      >
        {fmt(b)}
      </td>
    </tr>
  );
}

function CompareUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Loaded | null;
  onChange: (v: Loaded | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setError(null);
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const columns = result.meta.fields ?? [];
          const required = ["y_true", "y_pred"];
          const missing = required.filter((c) => !columns.includes(c));
          if (missing.length > 0) {
            setError(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);
            return;
          }
          const rows: PredictionRow[] = result.data
            .filter((r) => r.y_true !== undefined && r.y_pred !== undefined)
            .map((r) => {
              const row: PredictionRow = {
                y_true: String(r.y_true),
                y_pred: String(r.y_pred),
              };
              if (r.y_prob !== undefined && r.y_prob !== "") {
                const p = Number(r.y_prob);
                if (!Number.isNaN(p)) row.y_prob = p;
              }
              return row;
            });
          if (rows.length === 0) {
            setError("No valid rows found.");
            return;
          }
          onChange({ fileName: file.name, rows });
        },
        error: (err) => setError(err.message),
      });
    },
    [onChange],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-lg border border-dashed bg-card/30 transition-colors cursor-pointer",
          "px-6 py-10 flex flex-col items-center justify-center text-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 hover:bg-card/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="h-9 w-9 rounded-md border border-border flex items-center justify-center mb-3 bg-background">
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground truncate max-w-full">
          {value?.fileName ?? "Upload CSV"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {value ? `${value.rows.length} rows` : "y_true, y_pred, y_prob"}
        </p>
      </div>
      {error && (
        <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

function evaluate(data: Loaded | null): ModelEval | null {
  if (!data) return null;
  const cm = computeConfusionMatrix(data.rows);
  const summary = computeMetrics(cm);
  const roc = computeRoc(data.rows, cm.labels);
  return { summary, roc };
}

function score(s: MetricsSummary): number {
  return (s.accuracy + s.weighted.f1) / 2;
}
