import type { Company } from "@/types/company";

/**
 * 임시 mock 데이터. 추후 yfinance/DART/Bloomberg 등 실데이터 API로 교체하기 쉽도록
 * 컴포넌트는 이 배열을 직접 알지 못하고 lib/searchCompanies를 통해서만 접근한다.
 *
 * - 15개 이상의 제약/바이오 기업
 * - GLP-1, obesity, diabetes, oncology, immunology, migraine, Alzheimer,
 *   hypertension 등으로 검색 가능
 * - PER/EV·EBITDA에 null 포함 (BMS, BioMarin, Alnylam)
 * - 음수 포함 (Moderna)
 */
export const mockCompanies: Company[] = [
  {
    id: "novo-nordisk",
    name: "Novo Nordisk",
    relatedKeywords: [
      "GLP-1",
      "obesity",
      "diabetes",
      "semaglutide",
      "Ozempic",
      "Wegovy",
    ],
    relevanceSummary:
      "GLP-1 시장 리더. Ozempic·Wegovy로 당뇨와 비만 매출을 동시 견인.",
    metrics: { per: 28.4, evEbitda: 21.6 },
  },
  {
    id: "eli-lilly",
    name: "Eli Lilly",
    relatedKeywords: [
      "GLP-1",
      "obesity",
      "diabetes",
      "tirzepatide",
      "Mounjaro",
      "Zepbound",
      "Alzheimer",
      "donanemab",
    ],
    relevanceSummary:
      "Tirzepatide(GLP-1/GIP dual)로 GLP-1 시장 점유율 확대. Alzheimer donanemab 라인업.",
    metrics: { per: 62.3, evEbitda: 42.1 },
  },
  {
    id: "pfizer",
    name: "Pfizer",
    relatedKeywords: [
      "oncology",
      "immunology",
      "vaccines",
      "Paxlovid",
      "respiratory",
    ],
    relevanceSummary:
      "Oncology·immunology 자산 다각화. 코로나 매출 정상화 국면.",
    metrics: { per: 13.7, evEbitda: 8.9 },
  },
  {
    id: "roche",
    name: "Roche",
    relatedKeywords: [
      "oncology",
      "immunology",
      "diagnostics",
      "Hemlibra",
      "ophthalmology",
    ],
    relevanceSummary:
      "Oncology 글로벌 톱티어. 진단·바이오시밀러 압박을 신약 파이프라인으로 방어.",
    metrics: { per: 17.9, evEbitda: 12.5 },
  },
  {
    id: "merck",
    name: "Merck & Co.",
    relatedKeywords: [
      "oncology",
      "immunology",
      "Keytruda",
      "vaccines",
      "HPV",
    ],
    relevanceSummary:
      "Keytruda 매출 집중. LOE 대비 oncology 차세대 파이프라인 가속.",
    metrics: { per: 22.1, evEbitda: 14.4 },
  },
  {
    id: "abbvie",
    name: "AbbVie",
    relatedKeywords: [
      "immunology",
      "Humira",
      "Rinvoq",
      "Skyrizi",
      "oncology",
      "psoriasis",
    ],
    relevanceSummary:
      "Humira 특허 만료 이후 Skyrizi·Rinvoq로 immunology 매출 재구성.",
    metrics: { per: 16.8, evEbitda: 11.7 },
  },
  {
    id: "astrazeneca",
    name: "AstraZeneca",
    relatedKeywords: [
      "oncology",
      "respiratory",
      "rare disease",
      "Tagrisso",
      "Imfinzi",
    ],
    relevanceSummary:
      "Oncology + 호흡기 듀얼 엔진. Alexion 인수로 rare disease 보강.",
    metrics: { per: 33.2, evEbitda: 19.6 },
  },
  {
    id: "bristol-myers-squibb",
    name: "Bristol-Myers Squibb",
    relatedKeywords: [
      "oncology",
      "immunology",
      "Opdivo",
      "Eliquis",
      "cardiovascular",
    ],
    relevanceSummary:
      "Opdivo·Eliquis 양대 자산. Cardiology LOE 대응을 위한 BD 적극.",
    metrics: { per: null, evEbitda: 9.8 },
  },
  {
    id: "sanofi",
    name: "Sanofi",
    relatedKeywords: [
      "immunology",
      "diabetes",
      "Dupixent",
      "vaccines",
      "rare disease",
    ],
    relevanceSummary:
      "Dupixent로 immunology 매출 가속. Diabetes 사업은 단계적 정리.",
    metrics: { per: 14.6, evEbitda: 10.2 },
  },
  {
    id: "johnson-johnson",
    name: "Johnson & Johnson",
    relatedKeywords: [
      "oncology",
      "immunology",
      "Stelara",
      "Darzalex",
      "neuroscience",
    ],
    relevanceSummary:
      "Pharma + MedTech 결합. Stelara 바이오시밀러 진입 대응이 관건.",
    metrics: { per: 24.5, evEbitda: 15.3 },
  },
  {
    id: "gsk",
    name: "GSK",
    relatedKeywords: ["vaccines", "immunology", "HIV", "respiratory", "RSV"],
    relevanceSummary:
      "RSV 백신 Arexvy 출시 효과. HIV/respiratory가 기존 캐쉬카우.",
    metrics: { per: 10.9, evEbitda: 7.8 },
  },
  {
    id: "novartis",
    name: "Novartis",
    relatedKeywords: [
      "oncology",
      "immunology",
      "migraine",
      "cardiovascular",
      "Aimovig",
      "Kisqali",
      "hypertension",
    ],
    relevanceSummary:
      "Spin-off 이후 순수 혁신약 중심. Migraine Aimovig·cardio Entresto로 다각화.",
    metrics: { per: 19.2, evEbitda: 13.4 },
  },
  {
    id: "eisai",
    name: "Eisai",
    relatedKeywords: ["Alzheimer", "Leqembi", "oncology", "neurology"],
    relevanceSummary:
      "Biogen 공동 Leqembi로 Alzheimer 신약 시장 선점 시도.",
    metrics: { per: 38.7, evEbitda: 23.5 },
  },
  {
    id: "biogen",
    name: "Biogen",
    relatedKeywords: [
      "Alzheimer",
      "Leqembi",
      "MS",
      "neurology",
      "rare disease",
    ],
    relevanceSummary:
      "MS 코어 매출 둔화, Alzheimer 신규 Leqembi launch ramp 관건.",
    metrics: { per: 15.4, evEbitda: 10.8 },
  },
  {
    id: "amgen",
    name: "Amgen",
    relatedKeywords: [
      "oncology",
      "immunology",
      "migraine",
      "Aimovig",
      "obesity",
      "MariTide",
      "cardiovascular",
    ],
    relevanceSummary:
      "Repatha + Prolia에 더해 MariTide(obesity) 임상 진척이 valuation key.",
    metrics: { per: 27.6, evEbitda: 17.2 },
  },
  {
    id: "vertex",
    name: "Vertex Pharmaceuticals",
    relatedKeywords: [
      "cystic fibrosis",
      "rare disease",
      "pain",
      "gene therapy",
      "Casgevy",
    ],
    relevanceSummary:
      "CF franchise 독점. 비-CF (Casgevy 등) 다각화로 valuation 재평가.",
    metrics: { per: 26.9, evEbitda: 18.4 },
  },
  {
    id: "regeneron",
    name: "Regeneron",
    relatedKeywords: [
      "ophthalmology",
      "Eylea",
      "immunology",
      "Dupixent",
      "oncology",
    ],
    relevanceSummary:
      "Eylea HD·Dupixent 양축. Eylea 바이오시밀러 진입 시점이 risk.",
    metrics: { per: 18.6, evEbitda: 12.1 },
  },
  {
    id: "moderna",
    name: "Moderna",
    relatedKeywords: [
      "vaccines",
      "mRNA",
      "respiratory",
      "RSV",
      "oncology",
      "immunology",
    ],
    relevanceSummary:
      "COVID 매출 정상화 국면. mRNA 플랫폼 oncology·RSV로 확장 시도.",
    metrics: { per: -8.4, evEbitda: -5.7 },
  },
  {
    id: "biomarin",
    name: "BioMarin",
    relatedKeywords: [
      "rare disease",
      "gene therapy",
      "Roctavian",
      "Voxzogo",
      "pediatric",
    ],
    relevanceSummary:
      "Roctavian·Voxzogo로 rare disease 라인업 확장. Genetic 인디케이션 다각화.",
    metrics: { per: 41.3, evEbitda: null },
  },
  {
    id: "alnylam",
    name: "Alnylam Pharmaceuticals",
    relatedKeywords: [
      "rare disease",
      "RNAi",
      "cardiovascular",
      "amyloidosis",
      "hypertension",
    ],
    relevanceSummary:
      "RNAi 플랫폼 리더. ATTR·hypertension 등 cardio 인디케이션 확장.",
    metrics: { per: null, evEbitda: null },
  },
  {
    id: "incyte",
    name: "Incyte",
    relatedKeywords: ["oncology", "immunology", "Jakafi", "dermatology"],
    relevanceSummary:
      "Jakafi 단일 의존도 높음. Opzelura(dermatology) 등 immunology 확대.",
    metrics: { per: 17.1, evEbitda: 9.4 },
  },
];
