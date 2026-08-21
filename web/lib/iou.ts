import type { Window2, Window3 } from "./types";

// Mirrors compute_temporal_iou_batch_paired / compute_mr_r1 in
// dcase2026_task6_baseline/src/standalone_eval/utils.py + eval.py:
// IoU of the top-1 (highest score) predicted window against whichever
// ground-truth window it overlaps best.
export function pairIou(a: Window2, b: Window2): number {
  const inter = Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
  const union = Math.max(a[1], b[1]) - Math.min(a[0], b[0]);
  return union > 0 ? inter / union : 0;
}

export function top1Iou(gtWindows: Window2[], predWindows: Window3[]): number | null {
  if (predWindows.length === 0 || gtWindows.length === 0) return null;
  const top = predWindows[0];
  let best = 0;
  for (const gt of gtWindows) {
    best = Math.max(best, pairIou([top[0], top[1]], gt));
  }
  return best;
}
