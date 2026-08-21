export type Window3 = [number, number, number]; // start, end, score
export type Window2 = [number, number]; // start, end

export interface QidEntry {
  vid: string;
  query: string;
  duration: number;
  gt_windows: Window2[];
  preds: Record<string, Window3[]>;
}

export interface VideoEntry {
  duration: number;
  qids: string[];
}

export interface Index {
  models: string[];
  videos: Record<string, VideoEntry>;
  qids: Record<string, QidEntry>;
}

export interface Profile {
  id: string;
  name: string;
  annotation: string;
  color: string;
  builtin: boolean;
  folder?: string; // uploader name, shown grouped in the sidebar directory
  deletable: boolean; // only true for real Blob-backed community uploads
  windowsFor: (qid: string) => Window3[] | undefined;
}
