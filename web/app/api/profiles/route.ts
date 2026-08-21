import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const PREFIX = "profiles/";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — predictions files are normally a few hundred KB
const ID_RE = /^[a-z0-9-]+$/i;

export async function GET() {
  const { blobs } = await list({ prefix: PREFIX });
  const settled = await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        // A blob that was just written can briefly 404 on the public CDN
        // before it propagates; skip it rather than failing the whole list.
        return null;
      }
    })
  );
  const profiles = settled.filter((p) => p !== null);
  profiles.sort((a, b) => (a.uploadedAt < b.uploadedAt ? -1 : 1));
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) {
    return NextResponse.json({ error: "Upload too large (max 2MB)." }, { status: 413 });
  }

  let body: { folder?: string; name?: string; annotation?: string; predictions?: Record<string, unknown> };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const folder = (body.folder ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!folder) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
  }
  if (!body.predictions || typeof body.predictions !== "object" || Array.isArray(body.predictions)) {
    return NextResponse.json({ error: "Missing or invalid predictions." }, { status: 400 });
  }

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const profile = {
    id,
    folder,
    name,
    annotation: (body.annotation ?? "").trim(),
    uploadedAt: new Date().toISOString(),
    predictions: body.predictions,
  };

  await put(`${PREFIX}${id}.json`, JSON.stringify(profile), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return NextResponse.json({ profile });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || !ID_RE.test(id)) {
    return NextResponse.json({ error: "Missing or invalid id." }, { status: 400 });
  }
  await del(`${PREFIX}${id}.json`);
  return NextResponse.json({ ok: true });
}
