/**
 * KPIC MCP 래퍼.
 * vendor/kpic-mcp가 노출하는 두 tool:
 *   - search_drugs_by_name(drugname)
 *   - get_drug_detail_by_id(drugcode)
 *
 * 각 tool은 content[0].text 에 JSON 문자열을 반환한다.
 */

import { getKpicClient } from "./client";
import type { NormalizedDrug } from "../types";

interface KpicSearchRaw {
  drug_code: string;
  drug_name: string;
  drug_enm?: string;
  upso_name_kfda?: string;
  list_sunb_name?: string;
  sunb_count?: number;
  ingr_mg?: string;
  dosage?: string;
  effect?: string;
  drug_form?: string;
  drug_class?: string;
  pack_img?: string;
  drug_pic?: string;
  boh_price?: string;
}

function extractTextPayload(result: unknown): string {
  if (
    result &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray((result as { content: unknown[] }).content)
  ) {
    const content = (result as { content: Array<{ type?: string; text?: string }> })
      .content;
    const first = content.find((c) => c?.type === "text" && typeof c.text === "string");
    if (first?.text) return first.text;
  }
  throw new Error("KPIC MCP returned unexpected payload shape");
}

function safeParseArray(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function normalizeDrug(raw: KpicSearchRaw): NormalizedDrug {
  return {
    code: raw.drug_code,
    name: raw.drug_name?.trim() ?? "",
    nameEn: raw.drug_enm?.trim() || undefined,
    manufacturer: (raw.upso_name_kfda ?? "").trim(),
    ingredients: raw.list_sunb_name?.trim() || undefined,
    ingredientCount: raw.sunb_count,
    dosage: raw.dosage?.trim() || undefined,
    effect: raw.effect?.trim() || undefined,
    drugForm: raw.drug_form?.trim() || undefined,
    drugClass: raw.drug_class?.trim() || undefined,
    packageImage: raw.pack_img || undefined,
    drugImage: raw.drug_pic || undefined,
    price: raw.boh_price?.trim() || undefined,
  };
}

/**
 * 약품명/키워드로 검색. KPIC API 자체가 이름·성분·효능 통합 검색이므로
 * 호출은 동일하고, 결과 필터링/스코어링은 호출자가 수행.
 */
export async function searchDrugs(query: string): Promise<NormalizedDrug[]> {
  const client = await getKpicClient();
  const result = await client.callTool({
    name: "search_drugs_by_name",
    arguments: { drugname: query },
  });

  const text = extractTextPayload(result);
  const arr = safeParseArray(text) as KpicSearchRaw[];

  return arr
    .map(normalizeDrug)
    .filter((d) => d.code && d.name);
}
