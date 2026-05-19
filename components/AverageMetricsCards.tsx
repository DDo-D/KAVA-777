import type { AverageMetrics } from "@/types/company";
import { formatMetric } from "@/lib/metrics";

interface AverageMetricsCardsProps {
  averages: AverageMetrics;
  count: number;
}

/**
 * 산술 평균 카드 2개. PER, EV/EBITDA 만 표시.
 */
export default function AverageMetricsCards({
  averages,
  count,
}: AverageMetricsCardsProps) {
  if (count === 0) return null;

  return (
    <section
      aria-label="Average metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Card
        label="Average PER"
        value={formatMetric(averages.per)}
        count={count}
      />
      <Card
        label="Average EV/EBITDA"
        value={formatMetric(averages.evEbitda)}
        count={count}
      />
    </section>
  );
}

function Card({
  label,
  value,
  count,
}: {
  label: string;
  value: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Across {count} selected {count === 1 ? "company" : "companies"}
      </p>
    </div>
  );
}
