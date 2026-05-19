/**
 * KAVA 공용 도메인 타입.
 * KPIC raw 응답은 vendor/kpic-mcp/src/types.ts에 정의되어 있고,
 * 여기서는 UI/응답용으로 정규화한 슬림 타입만 둔다.
 */

export type SearchType = "name" | "ingredient" | "efficacy";

export interface NormalizedDrug {
  code: string;
  name: string;
  nameEn?: string;
  manufacturer: string;
  ingredients?: string;
  ingredientCount?: number;
  dosage?: string;
  effect?: string;
  drugForm?: string;
  drugClass?: string;
  packageImage?: string;
  drugImage?: string;
  price?: string;
  /** "primary": 직접 검색 결과 / "generic": 성분명 2차 검색으로 추가된 제네릭 */
  source?: "primary" | "generic";
}

export interface NormalizedManufacturer {
  /** 정규화된(공백/접두사 제거) 키 */
  key: string;
  /** 화면 표시용 원문 (가장 흔하게 등장한 표기) */
  displayName: string;
  /** 이 제조사가 등장한 약품 개수 */
  drugCount: number;
  /** 이 제조사로 매칭된 약품 코드 목록 */
  drugCodes: string[];
}

export interface SearchResponse {
  query: string;
  type: SearchType;
  drugs: NormalizedDrug[];
  manufacturers: NormalizedManufacturer[];
  warnings: string[];
  /** 성분명 2차 검색으로 제네릭이 추가됐을 때 true */
  genericExpanded?: boolean;
  /** 2차 검색에 사용된 성분명 */
  genericIngredient?: string;
}
