import { useSyncExternalStore } from "react";

let presentation = false;
const listeners = new Set<() => void>();

export function setPresentationMode(value: boolean) {
  presentation = value;
  listeners.forEach((l) => l());
}

export function togglePresentationMode() {
  setPresentationMode(!presentation);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return presentation;
}

export function usePresentationMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Scale a numeric chart height by 40% when in presentation mode. */
export function scaleChartHeight(base: number, presentationOn: boolean) {
  return presentationOn ? Math.round(base * 1.4) : base;
}
