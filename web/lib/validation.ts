import type { Window3 } from "./types";

// Shared input validation for the community-upload path. Used by both the
// client (fast feedback before the publish modal) and the API route (the
// actual enforcement point — the endpoint is directly callable, so client
// checks alone are not a security boundary).

export class ValidationError extends Error {}

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_ROWS = 1000; // generous over the ~352 real qids
const MAX_WINDOWS_PER_QID = 200;
const MAX_QID_LENGTH = 200;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// Strip control/null-byte characters and cap length. For single-line
// display fields (folder/name/annotation) — never trusted for HTML
// rendering as-is; React still escapes on output, this is defense in depth
// plus basic hygiene (no embedded newlines/nulls in what's meant to be a
// short label).
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").trim().slice(0, maxLength);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidWindow(w: unknown): w is Window3 {
  return (
    Array.isArray(w) &&
    w.length === 3 &&
    isFiniteNumber(w[0]) &&
    isFiniteNumber(w[1]) &&
    isFiniteNumber(w[2])
  );
}

// Parses+validates the uploaded predictions payload into a clean,
// prototype-pollution-safe object. Accepts either a JSON array of rows, or
// an object already keyed by qid (both shapes appear across this project's
// existing prediction files).
export function sanitizePredictions(input: unknown): Record<string, Window3[]> {
  if (input === null || typeof input !== "object") {
    throw new ValidationError("Predictions must be a JSON array of rows or an object keyed by qid.");
  }

  const rows: unknown[] = Array.isArray(input)
    ? input
    : Object.entries(input as Record<string, unknown>).map(([qid, pred_relevant_windows]) => ({
        qid,
        pred_relevant_windows,
      }));

  if (rows.length === 0) {
    throw new ValidationError("No rows found.");
  }
  if (rows.length > MAX_ROWS) {
    throw new ValidationError(`Too many rows (max ${MAX_ROWS}).`);
  }

  // Object.create(null) has no prototype chain at all, so a row whose qid
  // is literally "__proto__" can only ever become an inert own property —
  // there's no [[Prototype]] setter to trigger, unlike a plain {} literal.
  const out: Record<string, Window3[]> = Object.create(null);
  let count = 0;

  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const qid = r.qid;
    const windows = r.pred_relevant_windows;

    if (typeof qid !== "string") continue;
    const cleanQid = sanitizeText(qid, MAX_QID_LENGTH);
    if (!cleanQid || DANGEROUS_KEYS.has(cleanQid)) continue;
    if (!Array.isArray(windows)) continue;

    const cleanWindows: Window3[] = [];
    for (const w of windows.slice(0, MAX_WINDOWS_PER_QID)) {
      if (isValidWindow(w)) cleanWindows.push([w[0], w[1], w[2]]);
    }
    if (cleanWindows.length === 0) continue;

    out[cleanQid] = cleanWindows;
    count++;
  }

  if (count === 0) {
    throw new ValidationError(
      "No valid rows found (expected qid + pred_relevant_windows: [[start, end, score], ...])."
    );
  }
  return out;
}
