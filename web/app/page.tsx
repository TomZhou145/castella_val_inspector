"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Index, Profile } from "@/lib/types";
import WaveformPlayer, { type WaveformHandle } from "@/components/WaveformPlayer";
import TrackLanes, { type Track } from "@/components/TrackLanes";
import UploadProfilePanel from "@/components/UploadProfilePanel";
import ProfileDirectory from "@/components/ProfileDirectory";
import IouBadge from "@/components/IouBadge";
import {
  GT_COLOR,
  BUILTIN_ANNOTATIONS,
  TOP_ROW_MODELS,
  PERSONAL_FOLDER_NAME,
  colorForModel,
  colorForCommunityProfile,
} from "@/lib/colors";
import { top1Iou } from "@/lib/iou";
import { LABEL_WIDTH } from "@/lib/layout";
import { fetchProfiles, deleteProfile, type CommunityProfile } from "@/lib/profilesApi";

const AUDIO_BASE = process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "/audio";
const COMMUNITY_POLL_MS = 25_000;

export default function Home() {
  const [data, setData] = useState<Index | null>(null);
  const [search, setSearch] = useState("");
  const [selectedQid, setSelectedQid] = useState<string | null>(null);
  const [activeProfileIds, setActiveProfileIds] = useState<string[]>([]);
  const [showGt, setShowGt] = useState(true);
  const [topK, setTopK] = useState(3);

  const [communityProfiles, setCommunityProfiles] = useState<CommunityProfile[]>([]);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const waveformRef = useRef<WaveformHandle>(null);

  const reloadCommunityProfiles = useCallback(() => {
    fetchProfiles()
      .then(setCommunityProfiles)
      .catch(() => {});
  }, []);

  const handlePublished = useCallback((profile: CommunityProfile) => {
    // Show it immediately rather than waiting on a re-fetch: a blob that was
    // just written can briefly 404 on the public CDN before it propagates.
    setCommunityProfiles((prev) => [...prev, profile]);
  }, []);

  useEffect(() => {
    fetch("/index.json")
      .then((r) => r.json())
      .then((d: Index) => {
        setData(d);
        setActiveProfileIds([d.models[0]]);
        setSelectedQid(Object.keys(d.qids)[0]);
      });
    reloadCommunityProfiles();
    const interval = setInterval(reloadCommunityProfiles, COMMUNITY_POLL_MS);
    return () => clearInterval(interval);
  }, [reloadCommunityProfiles]);

  const profiles: Profile[] = useMemo(() => {
    if (!data) return [];
    const builtins: Profile[] = data.models.map((model) => {
      const isTopRow = TOP_ROW_MODELS.includes(model);
      return {
        id: model,
        name: model,
        annotation: BUILTIN_ANNOTATIONS[model] ?? "",
        color: colorForModel(model),
        builtin: isTopRow,
        folder: isTopRow ? undefined : PERSONAL_FOLDER_NAME,
        deletable: false,
        windowsFor: (qid: string) => data.qids[qid]?.preds[model],
      };
    });
    const community: Profile[] = communityProfiles.map((p, i) => ({
      id: p.id,
      name: p.name,
      annotation: p.annotation,
      color: colorForCommunityProfile(i),
      builtin: false,
      folder: p.folder,
      deletable: true,
      windowsFor: (qid: string) => p.predictions[qid],
    }));
    return [...builtins, ...community];
  }, [data, communityProfiles]);

  const folderGroups = useMemo(() => {
    const order: string[] = [];
    const byFolder = new Map<string, Profile[]>();
    for (const profile of profiles) {
      if (profile.builtin || !profile.folder) continue;
      if (!byFolder.has(profile.folder)) {
        byFolder.set(profile.folder, []);
        order.push(profile.folder);
      }
      byFolder.get(profile.folder)!.push(profile);
    }
    return order.map((folder) => ({ folder, profiles: byFolder.get(folder)! }));
  }, [profiles]);

  const filteredQids = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return Object.entries(data.qids).filter(([qid, entry]) => {
      if (!q) return true;
      return (
        qid.toLowerCase().includes(q) ||
        entry.vid.toLowerCase().includes(q) ||
        entry.query.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const toggleProfile = (id: string, checked: boolean) => {
    setActiveProfileIds((prev) => (checked ? [...prev, id] : prev.filter((p) => p !== id)));
  };

  const toggleFolder = (ids: string[], checked: boolean) => {
    setActiveProfileIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...ids]));
      return prev.filter((p) => !ids.includes(p));
    });
  };

  const handleDeleteProfile = async (profile: Profile) => {
    if (!profile.deletable) return;
    if (!window.confirm(`Delete "${profile.name}" for everyone? This can't be undone.`)) return;
    try {
      await deleteProfile(profile.id);
      setActiveProfileIds((prev) => prev.filter((p) => p !== profile.id));
      reloadCommunityProfiles();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (!data || !selectedQid) {
    return <div className="p-8 text-zinc-500">Loading index…</div>;
  }

  const entry = data.qids[selectedQid];
  const siblings = data.videos[entry.vid].qids.filter((q) => q !== selectedQid);
  const audioUrl = `${AUDIO_BASE}/${entry.vid}.mp3`;
  const primaryActive = profiles.find((p) => activeProfileIds.includes(p.id));

  const tracks: Track[] = [];
  if (showGt) {
    tracks.push({
      key: "gt",
      label: "ground truth",
      color: GT_COLOR,
      solid: true,
      windows: entry.gt_windows.map(([start, end]) => ({ start, end, score: 1 })),
    });
  }
  for (const profile of profiles) {
    if (!activeProfileIds.includes(profile.id)) continue;
    tracks.push({
      key: profile.id,
      label: profile.name,
      color: profile.color,
      windows: (profile.windowsFor(selectedQid) ?? [])
        .slice(0, topK)
        .map(([start, end, score]) => ({ start, end, score })),
    });
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search query, qid, or vid…"
            className="w-full px-2 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
          />
          <p className="text-xs text-zinc-500">
            {filteredQids.length} / {Object.keys(data.qids).length} qids
          </p>
          <UploadProfilePanel onPublished={handlePublished} />
        </div>
        <ProfileDirectory
          folders={folderGroups}
          activeProfileIds={activeProfileIds}
          onToggleProfile={toggleProfile}
          onToggleFolder={toggleFolder}
          onDelete={handleDeleteProfile}
          gtWindows={entry.gt_windows}
          selectedQid={selectedQid}
        />
        <ul className="overflow-y-auto flex-1">
          {filteredQids.map(([qid, e]) => {
            const iou = primaryActive ? top1Iou(e.gt_windows, primaryActive.windowsFor(qid) ?? []) : null;
            return (
              <li key={qid}>
                <button
                  onClick={() => setSelectedQid(qid)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                    qid === selectedQid ? "bg-zinc-100 dark:bg-zinc-800" : ""
                  }`}
                >
                  <div className="truncate">{e.query}</div>
                  <div className="text-xs text-zinc-500 flex justify-between">
                    <span>
                      {qid} · {e.vid}
                    </span>
                    {primaryActive && <IouBadge value={iou} />}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        <h1 className="text-lg font-semibold">{entry.query}</h1>
        <p className="text-sm text-zinc-500 mb-4">
          qid {selectedQid} · video {entry.vid} · {entry.duration}s
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showGt} onChange={(e) => setShowGt(e.target.checked)} />
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: `rgba(${GT_COLOR},0.6)` }} />
            ground truth
          </label>
          {profiles.filter((p) => p.builtin).map((profile) => (
            <label
              key={profile.id}
              className="flex items-center gap-1.5 cursor-pointer"
              title={profile.annotation || undefined}
            >
              <input
                type="checkbox"
                checked={activeProfileIds.includes(profile.id)}
                onChange={(e) => toggleProfile(profile.id, e.target.checked)}
              />
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: `rgba(${profile.color},0.6)` }}
              />
              {profile.name}
              <IouBadge value={top1Iou(entry.gt_windows, profile.windowsFor(selectedQid) ?? [])} />
            </label>
          ))}
          {folderGroups.length > 0 && (
            <span className="text-xs text-zinc-500">
              + {activeProfileIds.filter((id) => profiles.find((p) => p.id === id && !p.builtin)).length} community profile(s) active
              (see sidebar)
            </span>
          )}
          <label className="flex items-center gap-1.5 ml-auto">
            top-K
            <input
              type="number"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-14 px-1 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
            />
          </label>
        </div>

        <div className="flex items-stretch">
          <div style={{ width: LABEL_WIDTH }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <WaveformPlayer
              key={entry.vid}
              ref={waveformRef}
              audioUrl={audioUrl}
              onReady={setDuration}
              onTimeUpdate={setCurrentTime}
            />
          </div>
        </div>

        <TrackLanes
          duration={duration}
          currentTime={currentTime}
          tracks={tracks}
          onSeek={(t) => waveformRef.current?.seekAndPlay(t)}
        />

        {siblings.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Other queries on this video</p>
            <div className="flex flex-wrap gap-2">
              {siblings.map((qid) => (
                <button
                  key={qid}
                  onClick={() => setSelectedQid(qid)}
                  className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  {data.qids[qid].query}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
