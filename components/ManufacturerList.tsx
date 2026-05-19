import type { NormalizedManufacturer } from "@/lib/types";

export function ManufacturerList({
  manufacturers,
}: {
  manufacturers: NormalizedManufacturer[];
}) {
  if (manufacturers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center text-sm text-foreground/60">
        매칭된 제조사가 없습니다.
      </div>
    );
  }

  const max = Math.max(...manufacturers.map((m) => m.drugCount), 1);

  return (
    <ul className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
      {manufacturers.map((m) => {
        const pct = Math.round((m.drugCount / max) * 100);
        return (
          <li key={m.key} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="font-medium truncate" title={m.displayName}>
                {m.displayName}
              </span>
              <span className="text-xs font-mono text-foreground/60 shrink-0">
                {m.drugCount}건
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/8 overflow-hidden">
              <div
                className="h-full bg-foreground/70 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
