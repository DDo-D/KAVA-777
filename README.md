# KAVA — 약품 검색 → 제약회사

약학정보원(KPIC) 데이터를 기반으로 약품을 검색하고, 결과에 등장하는 제약회사를
한 화면에 정리해 주는 Next.js 16 웹앱.

> **1차 마일스톤**: 약품명·성분·효능 검색 → 약품 카드 + 제조사 dedupe 리스트.
> **2차 마일스톤(예정)**: DART OpenAPI로 제조사별 매출/영업이익 등 재무 요약.

## 아키텍처

```
Browser
  └─ POST /api/search  (Node runtime)
       └─ lib/orchestrator.ts
            └─ lib/mcp/kpic.ts
                 └─ MCP stdio  (vendor/kpic-mcp/dist/index.js)
                      └─ health.kr API
```

- `vendor/kpic-mcp` 는 `scripts/setup-mcps.sh` 가 clone + build.
- `@modelcontextprotocol/sdk` 의 `Client` + `StdioClientTransport` 로 KPIC MCP
  서버를 자식 프로세스로 spawn 한 뒤 JSON-RPC 호출.
- Next 개발 서버의 HMR로 모듈이 재실행돼도 같은 자식 프로세스를 재사용하기
  위해 `globalThis.__kavaKpic` 에 클라이언트를 캐싱.

## 디렉토리

```
app/
  page.tsx                  서버 컴포넌트 + <SearchPanel /> 마운트
  api/search/route.ts       POST {query, type, limit} → JSON 응답
components/
  SearchPanel.tsx           탭(이름/성분/효능) + 입력 + 결과 렌더
  DrugList.tsx              약품 카드 그리드
  ManufacturerList.tsx      제조사 dedupe + 빈도 바
lib/
  types.ts                  NormalizedDrug, NormalizedManufacturer, ...
  orchestrator.ts           파이프라인 + dedupe + rerank
  mcp/
    client.ts               MCP stdio 클라이언트 싱글톤
    kpic.ts                 search_drugs_by_name 래퍼
vendor/
  kpic-mcp/                 antegral/kpic-mcp clone (gitignored)
scripts/
  setup-mcps.sh             vendor 디렉토리 셋업/빌드
```

## 로컬 실행

```bash
# 1) 의존성 설치
pnpm install

# 2) KPIC MCP clone + build (vendor/kpic-mcp/dist/index.js 생성)
pnpm setup-mcps

# 3) 개발 서버
pnpm dev
# → http://localhost:3000
```

`@modelcontextprotocol/sdk` 의 stdio transport 는 Node 런타임이 필요합니다.
`/api/search` 라우트는 `export const runtime = "nodejs"` 로 강제돼 있습니다.

## 검색 타입

KPIC API 자체가 약품명·성분·효능 통합 검색이라, 세 탭 모두 동일한
`search_drugs_by_name(query)` 를 호출합니다. 차이는 결과 재정렬에 있습니다:

- **약품명**: API 응답 순서 그대로
- **성분**: 결과의 `list_sunb_name` 에 키워드가 포함된 항목을 상단으로
- **효능**: 결과의 `effect` 에 키워드가 포함된 항목을 상단으로

## 제조사 정규화

`upso_name_kfda` (식약처 등록 제조사명) 을 그룹핑 키로 사용합니다.
정규화 규칙:

- `(주)`, `[주]`, `주식회사`, `유한회사`, `Inc/Co/Ltd` 제거
- 공백 제거

화면 표기는 그룹 내에서 가장 흔하게 등장한 원문을 사용합니다.

## 환경변수

`.env.local` 에서 오버라이드 가능 (`.env.example` 참고):

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `KPIC_MCP_PATH` | `vendor/kpic-mcp/dist/index.js` | KPIC MCP 빌드 결과물 경로 |

## 한계 / 다음 단계

- KPIC API 가 단일 통합 검색만 제공하므로 성분/효능 정확도는 키워드 의존적.
- 상세 정보(`get_drug_detail_by_id`) 호출은 아직 사용 안 함 — 필요해질 때
  카드 상세 패널 등에서 lazy 로드 예정.
- 2차 파이프라인(DART) 은 별도 작업: `vendor/dart-mcp` 클론 + `lib/mcp/dart.ts`
  + 제조사 → corp_code 매칭 + recharts 차트.
