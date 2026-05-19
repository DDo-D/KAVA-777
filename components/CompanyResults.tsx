import type { Company } from "@/types/company";
import CompanyCard from "./CompanyCard";

interface CompanyResultsProps {
  query: string;
  companies: Company[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export default function CompanyResults({
  query,
  companies,
  selectedIds,
  onToggle,
}: CompanyResultsProps) {
  const trimmed = query.trim();

  if (!trimmed) {
    return (
      <EmptyState
        title="Enter a keyword to begin"
        body="Start typing a drug, ingredient, indication, or therapeutic area. The suggested keywords above are a quick way to start."
      />
    );
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        title={`No matches for "${trimmed}"`}
        body="Try a broader keyword — a mechanism, indication, or therapeutic area like oncology or immunology."
      />
    );
  }

  return (
    <section aria-label="Search results">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Results
        </h2>
        <span className="text-xs text-slate-400">{companies.length} matched</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <CompanyCard
            key={c.id}
            company={c}
            selected={selectedIds.has(c.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{body}</p>
    </div>
  );
}
