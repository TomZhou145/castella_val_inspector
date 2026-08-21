"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile, Window2 } from "@/lib/types";
import { top1Iou } from "@/lib/iou";
import IouBadge from "@/components/IouBadge";

interface FolderGroup {
  folder: string;
  profiles: Profile[];
}

interface Props {
  folders: FolderGroup[];
  activeProfileIds: string[];
  onToggleProfile: (id: string, checked: boolean) => void;
  onToggleFolder: (ids: string[], checked: boolean) => void;
  onDelete: (profile: Profile) => void;
  gtWindows: Window2[];
  selectedQid: string;
}

function FolderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function ProfileDirectory({
  folders,
  activeProfileIds,
  onToggleProfile,
  onToggleFolder,
  onDelete,
  gtWindows,
  selectedQid,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (folders.length === 0) return null;

  const toggleExpanded = (folder: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-500 px-3 pt-2">Community profiles</p>
      <div className="max-h-56 overflow-y-auto px-2 pb-2">
        {folders.map(({ folder, profiles }) => {
          const ids = profiles.map((p) => p.id);
          const activeCount = ids.filter((id) => activeProfileIds.includes(id)).length;
          const isExpanded = expanded.has(folder);
          return (
            <div key={folder} className="mt-1">
              <div
                onClick={() => toggleExpanded(folder)}
                className="flex items-center gap-1.5 px-1 py-1 rounded text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <FolderCheckbox
                  checked={activeCount === ids.length}
                  indeterminate={activeCount > 0 && activeCount < ids.length}
                  onChange={(checked) => onToggleFolder(ids, checked)}
                />
                <span className="text-zinc-400 w-3 shrink-0">{isExpanded ? "▾" : "▸"}</span>
                <span className="truncate font-medium">{folder}</span>
                <span className="text-xs text-zinc-500 shrink-0">({profiles.length})</span>
              </div>
              {isExpanded && (
                <ul className="ml-6 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                  {profiles.map((profile) => (
                    <li key={profile.id} className="flex items-center gap-1.5 py-1 text-xs">
                      <label
                        className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                        title={profile.annotation || undefined}
                      >
                        <input
                          type="checkbox"
                          checked={activeProfileIds.includes(profile.id)}
                          onChange={(e) => onToggleProfile(profile.id, e.target.checked)}
                        />
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ background: `rgba(${profile.color},0.8)` }}
                        />
                        <span className="truncate">{profile.name}</span>
                      </label>
                      <IouBadge value={top1Iou(gtWindows, profile.windowsFor(selectedQid) ?? [])} />
                      <button
                        onClick={() => onDelete(profile)}
                        title="Delete this profile for everyone"
                        className="text-zinc-400 hover:text-red-500 leading-none px-0.5 shrink-0"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
