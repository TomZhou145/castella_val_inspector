"use client";

import { useRef, useState } from "react";
import type { Window3 } from "@/lib/types";
import { parsePredictionsFile } from "@/lib/parsePredictionsFile";
import { uploadProfile, type CommunityProfile } from "@/lib/profilesApi";

interface Props {
  onPublished: (profile: CommunityProfile) => void;
}

export default function UploadProfilePanel({ onPublished }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<{ predictions: Record<string, Window3[]>; filename: string } | null>(
    null
  );
  const [folder, setFolder] = useState("");
  const [name, setName] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [status, setStatus] = useState<"idle" | "publishing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPending(null);
    setFolder("");
    setName("");
    setAnnotation("");
    setError(null);
    setStatus("idle");
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const preds = parsePredictionsFile(text);
      setPending({ predictions: preds, filename: file.name });
      setName(file.name.replace(/\.(json|jsonl)$/i, ""));
      setError(null);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file");
    }
  };

  const publish = async () => {
    if (!pending || !folder.trim() || !name.trim()) return;
    setStatus("publishing");
    setError(null);
    try {
      const profile = await uploadProfile({
        folder: folder.trim(),
        name: name.trim(),
        annotation: annotation.trim(),
        predictions: pending.predictions,
      });
      reset();
      onPublished(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  };

  const canPublish = folder.trim().length > 0 && name.trim().length > 0 && status !== "publishing";

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`text-xs px-3 py-2 rounded border border-dashed cursor-pointer text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.jsonl,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <span className="text-zinc-500">Drop a predictions .json/.jsonl to publish as a profile</span>
        {error && !pending && <p className="text-red-500 mt-1">{error}</p>}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl">
            <h2 className="text-base font-semibold mb-1">Publish {pending.filename}</h2>
            <p className="text-xs text-zinc-500 mb-4">
              This profile will be visible to everyone on the site. Both fields below are required.
            </p>

            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Your name (organizes profiles into a folder)
            </label>
            <input
              autoFocus
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="e.g. Alice"
              className="w-full px-2 py-1.5 mb-3 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
            />

            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Profile name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. run-42-highlr"
              className="w-full px-2 py-1.5 mb-3 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
            />

            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Annotation / notes (optional)
            </label>
            <textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="What's different about this run?"
              rows={3}
              className="w-full px-2 py-1.5 mb-3 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-transparent resize-none"
            />

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={publish}
                disabled={!canPublish}
                className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-white disabled:opacity-40 hover:bg-zinc-700"
              >
                {status === "publishing" ? "Publishing…" : "Publish for everyone"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
