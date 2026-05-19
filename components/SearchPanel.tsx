"use client";

import { useState, useTransition } from "react";
import type { SearchResponse, SearchType } from "@/lib/types";
import { DrugList } from "./DrugList";
import { ManufacturerList } from "./ManufacturerList";

const TABS: { id: SearchType; label: string; hint: string }[] = [
  { id: "name", label: "약품명", hint: "예: 타이레놀, 게보린, 아스피린" },
  { id: "ingredient", label: "성분", hint: "예: acetaminophen, ibuprofen" },
  { id: "efficacy", label: "효능", hint: "예: 해열, 진통, 소염" },
];

export function SearchPanel() {
  const [type, setType] = useState<SearchType>("name");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTab = TABS.find((t) => t.id === type)!;

  function submit() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: q, type, limit: 50 }),
        });
        const json = (await res.json()) as SearchResponse | { error: string; message?: string };
        if (!res.ok) {
          const msg =
            "message" in json && json.message
              ? `${(json as { error: string }).error}: ${json.message}`
              : (json as { error: string }).error;
          setError(msg);
          setData(null);
          return;
        }
        setData(json as SearchResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "요청 실패");
        setData(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {TABS.map((t) => {
            const active = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border
                  ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border-black/10 dark:border-white/15 text-foreground/80"
                  }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeTab.hint}
            className="flex-1 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-black/30 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-foreground/50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={pending || query.trim().length === 0}
            className="rounded-xl px-5 py-3 bg-foreground text-background font-semibold disabled:opacity-40"
          >
            {pending ? "검색 중…" : "검색"}
          </button>
        </form>

        <p className="mt-3 text-xs text-foreground/60">
          KPIC(약학정보원) 데이터를 사용합니다. 성분/효능 탭은 같은 검색 API에
          키워드를 전달하고, 결과 내에서 해당 필드 매칭 항목을 우선 표시합니다.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {data && data.warnings.length > 0 && (
        <ul className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 space-y-1">
          {data.warnings.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
      )}

      {data && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <section>
            <SectionHeader
              title="1차 결과 — 약품"
              count={data.drugs.length}
              subtitle={`"${data.query}" 검색`}
            />
            <DrugList drugs={data.drugs} />
          </section>
          <aside>
            <SectionHeader
              title="제약회사"
              count={data.manufacturers.length}
              subtitle="제조사별 dedupe 결과"
            />
            <ManufacturerList manufacturers={data.manufacturers} />
          </aside>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: number;
  subtitle?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-foreground/55">{subtitle}</p>
        )}
      </div>
      <span className="text-xs rounded-full bg-foreground/10 px-2 py-0.5 font-mono">
        {count}
      </span>
    </div>
  );
}
