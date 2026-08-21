"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export interface WaveformHandle {
  seekAndPlay: (time: number) => void;
}

interface Props {
  audioUrl: string;
  onReady?: (duration: number) => void;
  onTimeUpdate?: (time: number) => void;
}

const WaveformPlayer = forwardRef<WaveformHandle, Props>(function WaveformPlayer(
  { audioUrl, onReady, onTimeUpdate },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isPlaying, setIsPlaying] = useState(false);

  useImperativeHandle(ref, () => ({
    seekAndPlay(time: number) {
      const ws = wsRef.current;
      if (!ws) return;
      const duration = ws.getDuration();
      if (duration > 0) ws.seekTo(Math.max(0, Math.min(time, duration)) / duration);
      ws.play();
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus("loading");

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#94a3b8",
      progressColor: "#475569",
      cursorColor: "#0f172a",
      height: 80,
      url: audioUrl,
      normalize: true,
    });
    wsRef.current = ws;

    ws.on("ready", () => {
      setStatus("ready");
      onReady?.(ws.getDuration());
    });
    ws.on("error", () => setStatus("error"));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));
    ws.on("timeupdate", (t) => onTimeUpdate?.(t));

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      />
      {status === "loading" && (
        <p className="text-sm text-zinc-500 mt-1">Loading audio…</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 mt-1">
          Audio unavailable for this video (source may be missing or removed).
        </p>
      )}
      {status === "ready" && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => wsRef.current?.playPause()}
            className="px-3 py-1 rounded bg-zinc-800 text-white text-sm hover:bg-zinc-700"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}
    </div>
  );
});

export default WaveformPlayer;
