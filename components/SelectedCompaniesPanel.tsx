"use client";

import type { Company } from "@/types/company";

interface SelectedCompaniesPanelProps {
  companies: Company[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function SelectedCompaniesPanel({
  companies,
  onRemove,
  onClear,
}: SelectedCompaniesPanelProps) {
  return (
    <section
      aria-label="Selected companies"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Selected ({companies.length})
        </h2>
        {companies.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-900"
          >
            Clear all
          </button>
        )}
      </div>

      {companies.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Click any company card to add it to the comparison. Click again to
          remove.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2" role="list">
          {companies.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100"
                aria-label={`Remove ${c.name}`}
              >
                <span>{c.name}</span>
                <span
                  aria-hidden="true"
                  className="text-indigo-500 transition group-hover:text-indigo-700"
                >
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
