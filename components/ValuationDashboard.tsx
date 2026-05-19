"use client";

import { useCallback, useMemo, useState } from "react";

import SearchBar from "./SearchBar";
import CompanyResults from "./CompanyResults";
import SelectedCompaniesPanel from "./SelectedCompaniesPanel";
import MetricsComparisonTable from "./MetricsComparisonTable";
import AverageMetricsCards from "./AverageMetricsCards";

import { mockCompanies } from "@/lib/mockCompanies";
import { searchCompanies } from "@/lib/searchCompanies";
import { computeAverages } from "@/lib/metrics";

const SUGGESTED_KEYWORDS: ReadonlyArray<string> = [
  "GLP-1",
  "obesity",
  "diabetes",
  "oncology",
  "immunology",
  "migraine",
  "Alzheimer",
  "hypertension",
];

/**
 * 화면 전체 컨테이너. 검색 → 결과 → 선택 → 비교 → 평균 흐름을 한 페이지에서 처리.
 *
 * 데이터 접근은 lib/* 만 사용하므로, 이후 mock 데이터를 실제 API로 교체할 때
 * 본 컴포넌트는 수정할 필요가 없다.
 */
export default function ValuationDashboard() {
  const [query, setQuery] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const results = useMemo(() => searchCompanies(query), [query]);

  const selectedCompanies = useMemo(
    () => mockCompanies.filter((c) => selectedIds.has(c.id)),
    [selectedIds],
  );

  const averages = useMemo(
    () => computeAverages(selectedCompanies),
    [selectedCompanies],
  );

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

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
          Search by drug, ingredient, indication, or therapeutic area. Select
          companies to compare PER and EV/EBITDA side by side.
        </p>
      </header>

      <div className="mt-8 sm:mt-10">
        <SearchBar
          value={query}
          onChange={setQuery}
          suggestions={SUGGESTED_KEYWORDS}
        />
      </div>

      <div className="mt-8 sm:mt-10">
        <CompanyResults
          query={query}
          companies={results}
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
          <AverageMetricsCards
            averages={averages}
            count={selectedCompanies.length}
          />
        </div>
      )}
    </div>
  );
}
