/**
 * KPIC 약품 검색 — health.kr 직접 호출.
 * (기존 MCP stdio 방식에서 직접 fetch로 교체)
 */

import { searchDrugsRaw } from "../kpic-api";
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

export async function searchDrugs(query: string): Promise<NormalizedDrug[]> {
  const arr = (await searchDrugsRaw(query)) as KpicSearchRaw[];
  return arr.map(normalizeDrug).filter((d) => d.code && d.name);
}
