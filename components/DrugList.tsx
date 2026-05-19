import type { NormalizedDrug } from "@/lib/types";

export function DrugList({ drugs }: { drugs: NormalizedDrug[] }) {
  if (drugs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 dark:border-white/15 p-8 text-center text-sm text-foreground/60">
        검색 결과가 없습니다.
      </div>
    );
  }

  return (
    <ul className="grid sm:grid-cols-2 gap-3">
      {drugs.map((d) => (
        <li
          key={d.code}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] p-4 hover:border-foreground/40 transition"
        >
          <div className="flex justify-between gap-3 items-start">
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">
                {d.name}
              </h3>
              {d.nameEn && (
                <p className="text-xs text-foreground/55 truncate">
                  {d.nameEn}
                </p>
              )}
            </div>
            <span className="text-[10px] font-mono bg-foreground/8 rounded px-1.5 py-0.5 shrink-0">
              {d.code}
            </span>
          </div>

          {d.manufacturer && (
            <p className="mt-2 text-sm font-medium text-foreground/85">
              {d.manufacturer}
            </p>
          )}

          <dl className="mt-2 space-y-1 text-xs text-foreground/70">
            {d.ingredients && (
              <Row label="성분">
                <span className="line-clamp-2">{d.ingredients}</span>
              </Row>
            )}
            {d.effect && (
              <Row label="효능">
                <span className="line-clamp-2">{d.effect}</span>
              </Row>
            )}
            {d.drugForm && <Row label="제형">{d.drugForm}</Row>}
            {d.drugClass && <Row label="구분">{d.drugClass}</Row>}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 w-9 text-foreground/45">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
