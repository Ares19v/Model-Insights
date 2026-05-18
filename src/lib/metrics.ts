import type { PredictionRow } from "./predictions-store";

export type ConfusionMatrix = {
  labels: string[];
  matrix: number[][]; // matrix[actual][predicted]
  max: number;
};

export function computeConfusionMatrix(rows: PredictionRow[]): ConfusionMatrix {
  const labelSet = new Set<string>();
  for (const r of rows) {
    labelSet.add(r.y_true);
    labelSet.add(r.y_pred);
  }
  const labels = Array.from(labelSet).sort();
  const idx = new Map(labels.map((l, i) => [l, i]));
  const matrix = labels.map(() => labels.map(() => 0));
  let max = 0;
  for (const r of rows) {
    const a = idx.get(r.y_true)!;
    const p = idx.get(r.y_pred)!;
    matrix[a][p]++;
    if (matrix[a][p] > max) max = matrix[a][p];
  }
  return { labels, matrix, max };
}

export type ClassMetric = {
  cls: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
};

export type MetricsSummary = {
  accuracy: number;
  perClass: ClassMetric[];
  weighted: { precision: number; recall: number; f1: number; support: number };
};

export function computeMetrics(cm: ConfusionMatrix): MetricsSummary {
  const { labels, matrix } = cm;
  const n = labels.length;
  const colSums = Array(n).fill(0);
  const rowSums = Array(n).fill(0);
  let total = 0;
  let correct = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rowSums[i] += matrix[i][j];
      colSums[j] += matrix[i][j];
      total += matrix[i][j];
      if (i === j) correct += matrix[i][j];
    }
  }

  const perClass: ClassMetric[] = labels.map((cls, i) => {
    const tp = matrix[i][i];
    const precision = colSums[i] === 0 ? 0 : tp / colSums[i];
    const recall = rowSums[i] === 0 ? 0 : tp / rowSums[i];
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { cls, precision, recall, f1, support: rowSums[i] };
  });

  const wSum = (key: "precision" | "recall" | "f1") =>
    total === 0 ? 0 : perClass.reduce((s, c) => s + c[key] * c.support, 0) / total;

  return {
    accuracy: total === 0 ? 0 : correct / total,
    perClass,
    weighted: { precision: wSum("precision"), recall: wSum("recall"), f1: wSum("f1"), support: total },
  };
}

export type RocPoint = { fpr: number; tpr: number; diag: number };
export type RocResult = { points: RocPoint[]; auc: number; positiveLabel: string };

export function computeRoc(rows: PredictionRow[], labels: string[]): RocResult | null {
  if (labels.length !== 2) return null;
  const scored = rows
    .filter((r) => typeof r.y_prob === "number")
    .map((r) => ({ score: r.y_prob as number, y: r.y_true }));
  if (scored.length === 0) return null;

  // Positive label = the one with higher mean score (heuristic), else labels[1]
  const meanByLabel = new Map<string, { sum: number; n: number }>();
  for (const s of scored) {
    const m = meanByLabel.get(s.y) ?? { sum: 0, n: 0 };
    m.sum += s.score;
    m.n++;
    meanByLabel.set(s.y, m);
  }
  const [l0, l1] = labels;
  const m0 = meanByLabel.get(l0);
  const m1 = meanByLabel.get(l1);
  const mean0 = m0 ? m0.sum / m0.n : 0;
  const mean1 = m1 ? m1.sum / m1.n : 0;
  const positiveLabel = mean1 >= mean0 ? l1 : l0;

  const P = scored.filter((s) => s.y === positiveLabel).length;
  const N = scored.length - P;
  if (P === 0 || N === 0) return null;

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const points: RocPoint[] = [{ fpr: 0, tpr: 0, diag: 0 }];
  let tp = 0;
  let fp = 0;
  let prevScore = Number.POSITIVE_INFINITY;
  let auc = 0;
  let prevFpr = 0;
  let prevTpr = 0;

  for (const s of sorted) {
    if (s.score !== prevScore) {
      const fpr = fp / N;
      const tpr = tp / P;
      auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
      points.push({ fpr, tpr, diag: fpr });
      prevFpr = fpr;
      prevTpr = tpr;
      prevScore = s.score;
    }
    if (s.y === positiveLabel) tp++;
    else fp++;
  }
  const fpr = fp / N;
  const tpr = tp / P;
  auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2;
  points.push({ fpr: 1, tpr: 1, diag: 1 });

  return { points, auc, positiveLabel };
}
