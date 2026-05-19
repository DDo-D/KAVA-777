/**
 * 검색 파이프라인.
 *
 * 1차 (KPIC): 약품 검색 → 정규화
 * 1.5차      : 제조사 문자열 정규화 + dedupe + 카운트
 * (2차 DART: 추후 구현)
 */

import { searchDrugs } from "./mcp/kpic";
import type {
  NormalizedDrug,
  NormalizedManufacturer,
  SearchResponse,
  SearchType,
} from "./types";

/**
 * "주식회사 한국얀센", "(주)종근당", "종근당(주)" 등을 정규화 키로 변환.
 * 매칭/그룹핑용이지 화면 표기용은 아니다.
 */
export function normalizeManufacturerKey(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  s = s.replace(/[\(\[]\s*주\s*[\)\]]/g, "");
  s = s.replace(/주식회사/g, "");
  s = s.replace(/유한회사/g, "");
  s = s.replace(/\bInc\.?\b/gi, "");
  s = s.replace(/\bCo\.?\b/gi, "");
  s = s.replace(/\bLtd\.?\b/gi, "");
  s = s.replace(/\s+/g, "");
  return s;
}

export function dedupeManufacturers(
  drugs: NormalizedDrug[],
): NormalizedManufacturer[] {
  const byKey = new Map<
    string,
    {
      displayCounts: Map<string, number>;
      drugCodes: string[];
    }
  >();

  for (const d of drugs) {
    const original = d.manufacturer?.trim();
    if (!original) continue;
    const key = normalizeManufacturerKey(original);
    if (!key) continue;

    let entry = byKey.get(key);
    if (!entry) {
      entry = { displayCounts: new Map(), drugCodes: [] };
      byKey.set(key, entry);
    }
    entry.displayCounts.set(
      original,
      (entry.displayCounts.get(original) ?? 0) + 1,
    );
    entry.drugCodes.push(d.code);
  }

  const out: NormalizedManufacturer[] = [];
  for (const [key, entry] of byKey) {
    let topDisplay = "";
    let topCount = -1;
    for (const [display, c] of entry.displayCounts) {
      if (c > topCount) {
        topDisplay = display;
        topCount = c;
      }
    }
    out.push({
      key,
      displayName: topDisplay,
      drugCount: entry.drugCodes.length,
      drugCodes: entry.drugCodes,
    });
  }

  out.sort((a, b) => b.drugCount - a.drugCount || a.displayName.localeCompare(b.displayName, "ko"));
  return out;
}

/**
 * 성분/효능 토글은 동일 API에 같은 키워드를 전달하되,
 * 결과는 해당 필드에 키워드가 포함된 항목 우선으로 재정렬한다.
 */
function rerankBySearchType(
  drugs: NormalizedDrug[],
  query: string,
  type: SearchType,
): NormalizedDrug[] {
  if (type === "name" || !query) return drugs;
  const q = query.toLowerCase();
  const field: keyof NormalizedDrug =
    type === "ingredient" ? "ingredients" : "effect";

  const scored = drugs.map((d) => {
    const v = (d[field] ?? "").toString().toLowerCase();
    const hit = v.includes(q);
    return { d, hit };
  });
  return [
    ...scored.filter((s) => s.hit).map((s) => s.d),
    ...scored.filter((s) => !s.hit).map((s) => s.d),
  ];
}

/**
 * ingredients 필드에서 첫 번째 성분명(INN)을 추출.
 * "Acetaminophen 500mg" → "Acetaminophen"
 * "Acetaminophen Granule 177.778mg" → "Acetaminophen"
 */
function extractPrimaryIngredient(drugs: NormalizedDrug[]): string | null {
  for (const d of drugs) {
    if (!d.ingredients) continue;
    const first = d.ingredients.trim().split(/[\s\(,;\/]/)[0];
    if (first.length >= 3) return first;
  }
  return null;
}

export async function runSearch(opts: {
  query: string;
  type: SearchType;
  limit?: number;
}): Promise<SearchResponse> {
  const { query, type } = opts;
  const limit = Math.max(1, Math.min(opts.limit ?? 30, 100));
  const warnings: string[] = [];

  const rawDrugs = await searchDrugs(query);
  let allDrugs: NormalizedDrug[] = rawDrugs.map((d) => ({ ...d, source: "primary" as const }));
  let genericExpanded = false;
  let genericIngredient: string | undefined;

  // 약품명 검색 시 성분명으로 2차 검색해 제네릭 제조사 추가
  if (type === "name" && rawDrugs.length > 0) {
    const ingredient = extractPrimaryIngredient(rawDrugs);
    if (ingredient && ingredient.toLowerCase() !== query.toLowerCase()) {
      const genericDrugs = await searchDrugs(ingredient).catch(() => []);
      const primaryCodes = new Set(rawDrugs.map((d) => d.code));
      const newGenerics = genericDrugs
        .filter((d) => !primaryCodes.has(d.code))
        .map((d) => ({ ...d, source: "generic" as const }));
      if (newGenerics.length > 0) {
        allDrugs = [...allDrugs, ...newGenerics];
        genericExpanded = true;
        genericIngredient = ingredient;
        warnings.push(
          `${ingredient} 동일 성분 제네릭 ${newGenerics.length}개 약품이 추가됐습니다.`,
        );
      }
    }
  }

  const drugs = rerankBySearchType(allDrugs, query, type).slice(0, limit);

  if (rawDrugs.length === 0) {
    warnings.push("검색 결과가 없습니다. 다른 키워드로 시도해 보세요.");
  } else if (allDrugs.length > limit) {
    warnings.push(`총 ${allDrugs.length}건 중 상위 ${limit}건만 표시합니다.`);
  }

  const manufacturers = dedupeManufacturers(drugs);

  return {
    query,
    type,
    drugs,
    manufacturers,
    warnings,
    ...(genericExpanded && { genericExpanded, genericIngredient }),
  };
}
