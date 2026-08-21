// Uploads every cached mp3 to Vercel Blob, at a deterministic path (audio/<vid>.mp3)
// so the frontend can construct URLs from NEXT_PUBLIC_AUDIO_BASE_URL + "/<vid>.mp3"
// without needing a separate URL-mapping file.
//
// Requires BLOB_READ_WRITE_TOKEN in the environment (pull it after linking the
// project + creating a Blob store: `vercel env pull .env.local`).
import { put } from "@vercel/blob";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.resolve(import.meta.dirname, "../../audio_cache");

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` after creating a Blob store.");
    process.exit(1);
  }

  const files = (await readdir(CACHE_DIR)).filter((f) => f.endsWith(".mp3"));
  console.log(`Uploading ${files.length} files...`);

  let done = 0;
  for (const file of files) {
    const body = await readFile(path.join(CACHE_DIR, file));
    const { url } = await put(`audio/${file}`, body, {
      access: "public",
      addRandomSuffix: false,
      contentType: "audio/mpeg",
    });
    done++;
    console.log(`[${done}/${files.length}] ${file} -> ${url}`);
  }
  console.log("Done.");
}

main();
