"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import SearchBar from "./SearchBar";
import CompanyResults from "./CompanyResults";
import SelectedCompaniesPanel from "./SelectedCompaniesPanel";
import MetricsComparisonTable from "./MetricsComparisonTable";
import AverageMetricsCards from "./AverageMetricsCards";

import { computeAverages } from "@/lib/metrics";
import type { Company } from "@/types/company";

const SUGGESTED_KEYWORDS: ReadonlyArray<string> = [
  "타이레놀",
  "아스피린",
  "이부프로펜",
  "메트포르민",
  "아토르바스타틴",
  "암로디핀",
];

export default function ValuationDashboard() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [durumiUnavailable, setDurumiUnavailable] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const selectedCompanies = useMemo(
    () => companies.filter((c) => selectedIds.has(c.id)),
    [companies, selectedIds],
  );

  const averages = useMemo(() => computeAverages(selectedCompanies), [selectedCompanies]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      handleSubmit(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async (forceQuery?: string) => {
    const q = (forceQuery ?? query).trim();
    if (!q) return;

    // 이전 요청 취소
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setCompanies([]);
    setSelectedIds(new Set());
    setWarnings([]);
    setDurumiUnavailable(false);
    setCompaniesLoading(true);
    setFinancialsLoading(false);

    // Phase 1: KAVA 검색 → 제조사 카드 즉시 표시
    let manufacturerNames: string[] = [];
    try {
      const res = await fetch("/api/screener", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q, type: "name" }),
        signal: ac.signal,
      });
      const data = await res.json();
      const fetched: Company[] = data.companies ?? [];
      setCompanies(fetched);
      setWarnings(data.warnings ?? []);
      manufacturerNames = fetched.map((c) => c.name);
    } catch {
      if (!ac.signal.aborted) setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }

    if (!manufacturerNames.length || ac.signal.aborted) return;

    // Phase 2: durumi → yfinance 재무 데이터 (백그라운드)
    setFinancialsLoading(true);
    try {
      const res = await fetch("/api/screener/financials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companies: manufacturerNames }),
        signal: ac.signal,
      });
      const data = await res.json();

      if (data.unavailable) {
        setDurumiUnavailable(true);
      } else {
        const fin: Record<string, { per: number | null; evEbitda: number | null }> =
          data.financials ?? {};
        setCompanies((prev) =>
          prev.map((c) =>
            fin[c.name] ? { ...c, metrics: fin[c.name] } : c,
          ),
        );
      }
    } catch {
      if (!ac.signal.aborted) setDurumiUnavailable(true);
    } finally {
      if (!ac.signal.aborted) setFinancialsLoading(false);
    }
  }, [query]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14 lg:py-16">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Valuation Screener
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Drug &amp; Indication Valuation Screener
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
          약품명 또는 성분명으로 검색하면 제조사를 추출하고, yfinance로 PER·EV/EBITDA를 조회합니다.
        </p>
      </header>

      <div className="mt-8 sm:mt-10">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          loading={companiesLoading}
          suggestions={SUGGESTED_KEYWORDS}
        />
      </div>

      {warnings.length > 0 && (
        <ul className="mt-4 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
          {warnings.map((w, i) => <li key={i}>• {w}</li>)}
        </ul>
      )}

      {durumiUnavailable && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          durumi 서버(포트 5000)에 연결할 수 없어 재무 데이터를 가져오지 못했습니다.{" "}
          <code className="text-xs">cd durumi && python app.py</code> 로 먼저 실행해 주세요.
        </div>
      )}

      {financialsLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          yfinance로 PER·EV/EBITDA 조회 중…
        </div>
      )}

      <div className="mt-8 sm:mt-10">
        <CompanyResults
          query={query}
          companies={companies}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
        />
      </div>

      <div className="mt-8 sm:mt-10">
        <SelectedCompaniesPanel
          companies={selectedCompanies}
          onRemove={toggleSelected}
          onClear={clearSelection}
        />
      </div>

      {selectedCompanies.length > 0 && (
        <div className="mt-8 space-y-6 sm:mt-10">
          <MetricsComparisonTable companies={selectedCompanies} />
          <AverageMetricsCards averages={averages} count={selectedCompanies.length} />
        </div>
      )}
    </div>
  );
}
