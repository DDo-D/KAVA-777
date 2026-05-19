"use client";

import type { Company } from "@/types/company";

interface CompanyCardProps {
  company: Company;
  selected: boolean;
  onToggle: (id: string) => void;
}

/**
 * 검색 결과 카드.
 *
 * 표시 항목은 다음으로만 제한된다 (요구사항):
 *  - 기업명
 *  - 관련성 설명
 *  - 선택 상태
 *
 * 티커 / 거래소 / 시가총액 / 매출 / 순이익 / EPS 등 그 외 정보는 절대 표시하지 않는다.
 */
export default function CompanyCard({
  company,
  selected,
  onToggle,
}: CompanyCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(company.id)}
      aria-pressed={selected}
      className={
        "group flex h-full w-full flex-col items-start gap-3 rounded-xl border p-5 text-left transition " +
        (selected
          ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm")
      }
    >
      <div className="flex w-full items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          {company.name}
        </h3>
        <span
          className={
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide " +
            (selected
              ? "border-indigo-500 bg-indigo-500 text-white"
              : "border-slate-300 text-slate-500 group-hover:border-slate-400")
          }
        >
          {selected ? "Selected" : "Select"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">
        {company.relevanceSummary}
      </p>
    </button>
  );
}
