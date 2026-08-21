export const GT_COLOR = "34,197,94"; // green

export const MODEL_COLORS: Record<string, string> = {
  baseline: "59,130,246", // blue
  decay: "168,85,247", // purple
  reg: "249,115,22", // orange
  highlr: "236,72,153", // pink
};

export const BUILTIN_ANNOTATIONS: Record<string, string> = {
  baseline: "Model 1 baseline run",
  decay: "Learning-rate decay sweep",
  reg: "Regularization sweep",
  highlr: "High learning-rate sweep",
};

// Rotated through for community-uploaded profiles, in upload order.
export const COMMUNITY_PALETTE = [
  "20,184,166", // teal
  "99,102,241", // indigo
  "244,63,94", // rose
  "217,119,6", // amber
  "6,182,212", // cyan
  "132,204,22", // lime
  "139,92,246", // violet
];

export function colorForModel(model: string): string {
  return MODEL_COLORS[model] ?? "100,116,139";
}

export function colorForCommunityProfile(index: number): string {
  return COMMUNITY_PALETTE[index % COMMUNITY_PALETTE.length];
}
