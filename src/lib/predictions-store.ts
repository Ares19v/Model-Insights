import { useSyncExternalStore } from "react";

export type PredictionRow = {
  y_true: string;
  y_pred: string;
  y_prob?: number;
  [key: string]: string | number | undefined;
};

export type PredictionsData = {
  fileName: string;
  rows: PredictionRow[];
  columns: string[];
};

let state: PredictionsData | null = null;
const listeners = new Set<() => void>();

export function setPredictions(data: PredictionsData | null) {
  state = data;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function usePredictions() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
