import type { PredictionRow } from "./predictions-store";

// 30 binary classification samples with realistic probabilities
export const DEMO_ROWS: PredictionRow[] = [
  { y_true: "1", y_pred: "1", y_prob: 0.92 },
  { y_true: "0", y_pred: "0", y_prob: 0.08 },
  { y_true: "1", y_pred: "1", y_prob: 0.87 },
  { y_true: "0", y_pred: "0", y_prob: 0.15 },
  { y_true: "1", y_pred: "0", y_prob: 0.42 },
  { y_true: "0", y_pred: "1", y_prob: 0.61 },
  { y_true: "1", y_pred: "1", y_prob: 0.78 },
  { y_true: "0", y_pred: "0", y_prob: 0.22 },
  { y_true: "1", y_pred: "1", y_prob: 0.95 },
  { y_true: "0", y_pred: "0", y_prob: 0.05 },
  { y_true: "1", y_pred: "1", y_prob: 0.71 },
  { y_true: "0", y_pred: "0", y_prob: 0.33 },
  { y_true: "1", y_pred: "1", y_prob: 0.84 },
  { y_true: "0", y_pred: "1", y_prob: 0.56 },
  { y_true: "1", y_pred: "1", y_prob: 0.66 },
  { y_true: "0", y_pred: "0", y_prob: 0.18 },
  { y_true: "1", y_pred: "0", y_prob: 0.38 },
  { y_true: "0", y_pred: "0", y_prob: 0.11 },
  { y_true: "1", y_pred: "1", y_prob: 0.89 },
  { y_true: "0", y_pred: "0", y_prob: 0.27 },
  { y_true: "1", y_pred: "1", y_prob: 0.74 },
  { y_true: "0", y_pred: "0", y_prob: 0.09 },
  { y_true: "1", y_pred: "1", y_prob: 0.81 },
  { y_true: "0", y_pred: "0", y_prob: 0.14 },
  { y_true: "0", y_pred: "0", y_prob: 0.31 },
  { y_true: "1", y_pred: "1", y_prob: 0.69 },
  { y_true: "1", y_pred: "1", y_prob: 0.93 },
  { y_true: "0", y_pred: "1", y_prob: 0.52 },
  { y_true: "1", y_pred: "1", y_prob: 0.77 },
  { y_true: "0", y_pred: "0", y_prob: 0.19 },
];

export const DEMO_COLUMNS = ["y_true", "y_pred", "y_prob"];

// Smaller sample CSV (20 rows) for download
export function buildSampleCsv(): string {
  const rows = DEMO_ROWS.slice(0, 20);
  const header = "y_true,y_pred,y_prob";
  const body = rows.map((r) => `${r.y_true},${r.y_pred},${r.y_prob}`).join("\n");
  return `${header}\n${body}\n`;
}
