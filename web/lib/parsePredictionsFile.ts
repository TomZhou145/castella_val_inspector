import type { Window3 } from "./types";
import { sanitizePredictions } from "./validation";

const MAX_TEXT_LENGTH = 2 * 1024 * 1024; // mirrors the server's cap; fail fast client-side too

// Accepts either a JSON array of rows, or newline-delimited JSON (jsonl) —
// the same shape as the val-set prediction files already in the repo:
// {"qid": ..., "vid": ..., "pred_relevant_windows": [[start, end, score], ...]}
//
// This is only a fast-feedback pass for the UI. The server independently
// re-validates everything via the same sanitizePredictions() — this
// endpoint is directly callable, so client-side checks are never the real
// security boundary.
export function parsePredictionsFile(text: string): Record<string, Window3[]> {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error("File is too large (max 2MB).");
  }

  const trimmed = text.trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const lines = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    parsed = lines.map((l) => JSON.parse(l));
  }

  return sanitizePredictions(parsed);
}
