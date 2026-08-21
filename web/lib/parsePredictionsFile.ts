import type { Window3 } from "./types";

interface RawRow {
  qid?: unknown;
  pred_relevant_windows?: unknown;
}

// Accepts either a JSON array of rows, or newline-delimited JSON (jsonl) —
// the same shape as the val-set prediction files already in the repo:
// {"qid": ..., "vid": ..., "pred_relevant_windows": [[start, end, score], ...]}
export function parsePredictionsFile(text: string): Record<string, Window3[]> {
  const trimmed = text.trim();
  let rows: RawRow[];

  try {
    const parsed = JSON.parse(trimmed);
    rows = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    rows = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  const out: Record<string, Window3[]> = {};
  for (const row of rows) {
    if (typeof row.qid !== "string" || !Array.isArray(row.pred_relevant_windows)) continue;
    out[row.qid] = row.pred_relevant_windows as Window3[];
  }
  if (Object.keys(out).length === 0) {
    throw new Error("No valid rows found (expected qid + pred_relevant_windows per row).");
  }
  return out;
}
