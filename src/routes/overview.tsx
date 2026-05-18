import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { usePredictions } from "@/lib/predictions-store";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [{ title: "Overview — Model Evaluation Dashboard" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const data = usePredictions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) navigate({ to: "/" });
  }, [data, navigate]);

  const stats = useMemo(() => {
    if (!data) return null;
    const counts = new Map<string, number>();
    for (const r of data.rows) counts.set(r.y_true, (counts.get(r.y_true) ?? 0) + 1);
    const dist = Array.from(counts.entries())
      .map(([cls, count]) => ({ cls, count }))
      .sort((a, b) => b.count - a.count);
    return { total: data.rows.length, classes: dist.length, dist };
  }, [data]);

  if (!data || !stats) return null;

  const preview = data.rows.slice(0, 10);
  const previewCols = data.columns;

  return (
    <DashboardLayout>
      <div className="max-w-5xl px-8 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-mono">{data.fileName}</p>
        </header>

        <div className="grid grid-cols-2 gap-px bg-border border border-border rounded-md overflow-hidden mb-10">
          <Stat label="Total samples" value={stats.total.toLocaleString()} />
          <Stat label="Unique classes" value={stats.classes.toString()} />
        </div>

        <section className="mb-10">
          <h2 className="text-sm font-medium text-foreground mb-4">Class distribution</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.dist}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="cls"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", fillOpacity: 0.3 }}
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-4">Data preview</h2>
          <div className="overflow-x-auto border border-border rounded-md">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {previewCols.map((c) => (
                    <th
                      key={c}
                      className="text-left font-medium text-muted-foreground px-3 py-2"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                    {previewCols.map((c) => (
                      <td key={c} className="px-3 py-2 text-foreground">
                        {row[c] !== undefined ? String(row[c]) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-5 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}
