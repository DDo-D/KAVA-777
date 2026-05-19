import type { Company } from "@/types/company";
import { formatMetric } from "@/lib/metrics";

interface MetricsComparisonTableProps {
  companies: Company[];
}

/**
 * 비교 테이블. 컬럼은 정확히 3개로 고정:
 *  - Company
 *  - PER
 *  - EV/EBITDA
 *
 * 다른 어떤 지표도 추가하지 않는다.
 */
export default function MetricsComparisonTable({
  companies,
}: MetricsComparisonTableProps) {
  if (companies.length === 0) return null;

  return (
    <section
      aria-label="Valuation comparison"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Comparison
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Company
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                PER
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                EV/EBITDA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">
                  {c.name}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {formatMetric(c.metrics.per)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                  {formatMetric(c.metrics.evEbitda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
