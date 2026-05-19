/**
 * yahoo-finance2로 한국 상장사 PER·EV/EBITDA 조회.
 * 한국어 회사명 → KRX 종목코드 정적 매핑 + KIND API 폴백 → quoteSummary로 지표 추출.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

export interface CompanyFinancials {
  name: string;
  ticker: string | null;
  per: number | null;
  evEbitda: number | null;
  error?: string;
}

// 한국 제약사 회사명 → Yahoo Finance 티커 (정적 매핑)
const STATIC_KR_TICKERS: Record<string, string> = {
  // 유가증권시장 (KOSPI, .KS)
  "종근당": "185750.KS",
  "한미약품": "128940.KS",
  "유한양행": "000100.KS",
  "동아ST": "170900.KS",
  "동아에스티": "170900.KS",
  "대웅제약": "069620.KS",
  "보령": "003850.KS",
  "보령제약": "003850.KS",
  "JW중외제약": "001060.KS",
  "광동제약": "009290.KS",
  "삼진제약": "005500.KS",
  "동화약품": "000020.KS",
  "부광약품": "003000.KS",
  "신풍제약": "019170.KS",
  "녹십자": "006280.KS",
  "GC녹십자": "006280.KS",
  "셀트리온": "068270.KS",
  "셀트리온헬스케어": "091990.KS",
  "현대약품": "004310.KS",
  "JW생명과학": "234080.KS",
  "SK케미칼": "285130.KS",
  "경동제약": "011040.KS",
  "제일약품": "271980.KS",
  "한독": "002390.KS",
  "대원제약": "003220.KS",
  "일양약품": "007570.KS",
  "영진약품": "003520.KS",
  "삼일제약": "000520.KS",
  "국제약품": "002720.KS",
  "동성제약": "002210.KS",
  "삼양홀딩스": "000070.KS",
  "한미사이언스": "008930.KS",
  "대웅": "003090.KS",
  "동아제약": "000640.KS",
  "동아쏘시오홀딩스": "000640.KS",
  "한국콜마": "161890.KS",
  "종근당홀딩스": "020150.KS",
  "일동홀딩스": "000230.KS",
  "JW홀딩스": "096760.KS",
  "한올바이오파마": "009420.KS",
  "삼아약품": "009300.KS",
  // 코스닥 (KOSDAQ, .KQ)
  "일동제약": "249420.KQ",
  "이연제약": "102460.KQ",
  "동국제약": "086450.KQ",
  "안국약품": "027790.KQ",
  "바이넥스": "053030.KQ",
  "하나제약": "293480.KQ",
  "화일약품": "061250.KQ",
  "휴온스": "243070.KQ",
  "명인제약": "017180.KQ",
  "한국유나이티드제약": "033270.KQ",
  "코오롱제약": "023680.KQ",
  "태준제약": "204990.KQ",
  "씨티씨바이오": "060590.KQ",
  "에이치엘비": "028300.KQ",
  "휴젤": "145020.KQ",
  "메디톡스": "086900.KQ",
  "파마리서치": "214450.KQ",
  "삼양바이오팜": "245810.KQ",
};

// KIND(기업공시채널) 검색으로 종목코드 조회 (정적 매핑 미등록 종목용)
async function lookupKindTicker(name: string): Promise<string | null> {
  try {
    const url =
      `https://kind.krx.co.kr/corpgeneral/corpList.do?method=searchCorpList` +
      `&searchCorpName=${encodeURIComponent(name)}&currentPage=1&maxResults=5` +
      `&maxLinks=5&startPage=1&orderMode=3&orderStat=D&searchType=13` +
      `&fiscalYearEnd=all&comAbstract=all`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("euc-kr").decode(buf);
    // href에 repIsuSrtCd=XXXXXX 패턴으로 종목코드 등장
    const m = html.match(/repIsuSrtCd=(\d{6})/);
    if (m) return `${m[1]}.KS`; // 미상장이면 quoteSummary에서 에러 → KQ 재시도
    return null;
  } catch {
    return null;
  }
}

async function resolveKrTicker(companyName: string): Promise<string | null> {
  return STATIC_KR_TICKERS[companyName] ?? (await lookupKindTicker(companyName));
}

async function fetchSummary(ticker: string) {
  const summary = (await yahooFinance.quoteSummary(ticker, {
    modules: ["summaryDetail", "defaultKeyStatistics"] as any,
  })) as any;

  // trailingPE는 defaultKeyStatistics에 있음 (summaryDetail에는 없는 경우 많음)
  const raw_per: number | undefined =
    summary?.defaultKeyStatistics?.trailingPE ??
    summary?.summaryDetail?.trailingPE ??
    summary?.defaultKeyStatistics?.forwardPE;
  const raw_ev: number | undefined = summary?.defaultKeyStatistics?.enterpriseToEbitda;

  const per = raw_per != null && isFinite(raw_per) ? Math.round(raw_per * 100) / 100 : null;
  const evEbitda = raw_ev != null && isFinite(raw_ev) ? Math.round(raw_ev * 100) / 100 : null;
  return { per, evEbitda };
}

async function fetchFinancials(name: string): Promise<CompanyFinancials> {
  const ticker = await resolveKrTicker(name);
  if (!ticker) {
    return { name, ticker: null, per: null, evEbitda: null, error: "ticker not found" };
  }

  try {
    const { per, evEbitda } = await fetchSummary(ticker);
    return { name, ticker, per, evEbitda };
  } catch {
    // KS → KQ 또는 KQ → KS 교차 재시도
    const altTicker = ticker.endsWith(".KS")
      ? ticker.replace(".KS", ".KQ")
      : ticker.replace(".KQ", ".KS");
    try {
      const { per, evEbitda } = await fetchSummary(altTicker);
      return { name, ticker: altTicker, per, evEbitda };
    } catch (e) {
      return {
        name,
        ticker,
        per: null,
        evEbitda: null,
        error: e instanceof Error ? e.message : "unknown",
      };
    }
  }
}

export async function fetchFinancialsParallel(
  companies: string[],
  maxConcurrency = 5,
): Promise<CompanyFinancials[]> {
  const results: CompanyFinancials[] = [];
  for (let i = 0; i < companies.length; i += maxConcurrency) {
    const batch = companies.slice(i, i + maxConcurrency);
    const settled = await Promise.allSettled(batch.map(fetchFinancials));
    for (const s of settled) {
      results.push(
        s.status === "fulfilled"
          ? s.value
          : { name: "", ticker: null, per: null, evEbitda: null, error: "rejected" },
      );
    }
  }
  return results;
}
