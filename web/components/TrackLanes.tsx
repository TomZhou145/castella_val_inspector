"use client";

import { LABEL_WIDTH } from "@/lib/layout";

export interface LaneWindow {
  start: number;
  end: number;
  score: number;
}

export interface Track {
  key: string;
  label: string;
  color: string; // "r,g,b"
  windows: LaneWindow[];
  solid?: boolean; // ground truth: fixed opacity, no score
}

interface Props {
  duration: number;
  currentTime: number;
  tracks: Track[];
  onSeek: (time: number) => void;
}

export default function TrackLanes({ duration, currentTime, tracks, onSeek }: Props) {
  if (duration <= 0) return null;
  const playheadPct = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  return (
    <div className="w-full mt-3 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
      <div className="relative">
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
          style={{ left: `calc(${LABEL_WIDTH} + (100% - ${LABEL_WIDTH}) * ${playheadPct / 100})` }}
        />
        {tracks.map((track) => (
          <div
            key={track.key}
            className="flex items-stretch border-b last:border-b-0 border-zinc-200 dark:border-zinc-800"
          >
            <div
              style={{ width: LABEL_WIDTH }}
              className="shrink-0 flex items-center gap-1.5 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800"
            >
              <span
                className="inline-block w-2 h-2 rounded-sm shrink-0"
                style={{ background: `rgba(${track.color},0.8)` }}
              />
              <span className="truncate">{track.label}</span>
            </div>
            <div
              className="relative flex-1 h-9 cursor-pointer bg-white dark:bg-zinc-950"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                onSeek(pct * duration);
              }}
            >
              {track.windows.map((w, i) => {
                const left = (w.start / duration) * 100;
                const width = Math.max(((w.end - w.start) / duration) * 100, 0.3);
                const opacity = track.solid ? 0.55 : 0.15 + w.score * 0.55;
                return (
                  <div
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(w.start);
                    }}
                    title={`${w.start.toFixed(1)}s–${w.end.toFixed(1)}s${
                      track.solid ? "" : ` · score ${w.score.toFixed(2)}`
                    }`}
                    className="absolute top-1.5 bottom-1.5 rounded-sm hover:brightness-110"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: `rgba(${track.color},${opacity.toFixed(2)})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex text-[10px] text-zinc-400 px-2 py-1 border-t border-zinc-200 dark:border-zinc-800">
        <div style={{ width: LABEL_WIDTH }} className="shrink-0" />
        <div className="flex-1 flex justify-between">
          {Array.from({ length: 6 }, (_, i) => (i * duration) / 5).map((t, i) => (
            <span key={i}>{t.toFixed(0)}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}
