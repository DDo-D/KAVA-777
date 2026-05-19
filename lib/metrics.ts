import type { AverageMetrics, Company } from "@/types/company";

/**
 * 평균 계산 / 포맷 유틸.
 *
 * 규칙:
 *  - null / undefined / NaN 은 평균에서 제외
 *  - 음수는 유효한 숫자로 포함
 *  - 숫자는 소수점 2자리로 표시
 *  - 값이 없으면 "N/A"
 */

function isValidNumber(n: number | null | undefined): n is number {
  return typeof n === "number" && !Number.isNaN(n);
}

export function arithmeticMean(
  values: ReadonlyArray<number | null | undefined>,
): number | null {
  const valid: number[] = [];
  for (const v of values) {
    if (isValidNumber(v)) valid.push(v);
  }
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return sum / valid.length;
}

export function computeAverages(companies: Company[]): AverageMetrics {
  return {
    per: arithmeticMean(companies.map((c) => c.metrics.per)),
    evEbitda: arithmeticMean(companies.map((c) => c.metrics.evEbitda)),
  };
}

export function formatMetric(value: number | null | undefined): string {
  if (!isValidNumber(value)) return "N/A";
  return value.toFixed(2);
}
