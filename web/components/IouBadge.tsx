export default function IouBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-400">–</span>;
  const pct = Math.round(value * 100);
  const color =
    value >= 0.5
      ? "text-green-600 dark:text-green-400"
      : value >= 0.2
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-500";
  return <span className={`font-mono ${color}`}>IoU {pct}%</span>;
}
