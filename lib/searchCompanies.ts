import type { Company } from "@/types/company";
import { mockCompanies } from "./mockCompanies";

/**
 * 키워드 기반 회사 검색. 점수 매겨 정렬 후 반환.
 *
 * 점수 규칙:
 *  - exact keyword 일치: +6
 *  - keyword 부분 일치: +3
 *  - 회사명 부분 일치:   +5
 *  - 요약 본문 일치:     +1
 *
 * 추후 실제 API로 대체할 때 같은 시그니처를 유지하면 컴포넌트는 변경할 필요가 없다.
 */
export function searchCompanies(
  query: string,
  source: Company[] = mockCompanies,
): Company[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = source
    .map((c) => ({ company: c, score: scoreMatch(c, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.company);
}

function scoreMatch(c: Company, q: string): number {
  let score = 0;
  if (c.name.toLowerCase().includes(q)) score += 5;
  for (const kw of c.relatedKeywords) {
    const k = kw.toLowerCase();
    if (k === q) score += 6;
    else if (k.includes(q) || q.includes(k)) score += 3;
  }
  if (c.relevanceSummary.toLowerCase().includes(q)) score += 1;
  return score;
}
