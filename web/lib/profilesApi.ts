import type { Window3 } from "./types";

export interface CommunityProfile {
  id: string;
  folder: string;
  name: string;
  annotation: string;
  uploadedAt: string;
  predictions: Record<string, Window3[]>;
}

export async function fetchProfiles(): Promise<CommunityProfile[]> {
  const res = await fetch("/api/profiles", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load community profiles");
  const data = await res.json();
  return data.profiles;
}

export async function uploadProfile(input: {
  folder: string;
  name: string;
  annotation: string;
  predictions: Record<string, Window3[]>;
}): Promise<CommunityProfile> {
  const res = await fetch("/api/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.profile;
}

export async function deleteProfile(id: string): Promise<void> {
  const res = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Delete failed");
  }
}
