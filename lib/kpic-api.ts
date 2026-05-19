/**
 * health.kr 직접 호출 클라이언트.
 * MCP stdio 서브프로세스 없이 Next.js API 라우트에서 바로 사용.
 */

const BASE = "https://health.kr";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

interface Session {
  cookie: string;
  csrfToken: string;
}

interface KavaGlobal {
  __kavaSession?: Session;
}
const g = globalThis as unknown as KavaGlobal;

async function getSession(forceRefresh = false): Promise<Session> {
  if (!forceRefresh && g.__kavaSession) return g.__kavaSession;

  const res = await fetch(
    `${BASE}/searchDrug/search_total_result.asp?search_word=test`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko,en-US;q=0.9",
      },
      redirect: "follow",
    },
  );

  if (!res.ok) throw new Error(`Session init failed: ${res.statusText}`);

  const html = await res.text();
  const tokenMatch = html.match(/window\.csrfToken\s*=\s*"([^"]+)"/);
  if (!tokenMatch) throw new Error("Could not extract CSRF token from health.kr");

  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie
    .split(",")
    .map((s) => s.trim().split(";")[0])
    .filter(Boolean)
    .join("; ");

  g.__kavaSession = { cookie, csrfToken: tokenMatch[1] };
  return g.__kavaSession;
}

export async function searchDrugsRaw(query: string): Promise<unknown[]> {
  const doSearch = async (retry = false): Promise<unknown[]> => {
    if (retry) g.__kavaSession = undefined;
    const { cookie, csrfToken } = await getSession(retry);

    const url =
      `${BASE}/searchDrug/ajax/ajax_commonSearch.asp` +
      `?search_word=${encodeURIComponent(query)}` +
      `&csrf_token=${encodeURIComponent(csrfToken)}` +
      `&search_flag=all&_=${Date.now()}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "ko,en-US;q=0.9,en;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrfToken,
        Referer: `${BASE}/searchDrug/search_total_result.asp`,
        "User-Agent": UA,
        Cookie: cookie,
      },
      body: `search_word=${encodeURIComponent(query)}&search_flag=all&csrf_token=${encodeURIComponent(csrfToken)}`,
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);

    const data = await response.text();
    if (!retry && data.includes("invalid csrf token")) return doSearch(true);

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) throw new Error("Invalid response format: expected array");
    return parsed;
  };

  return doSearch();
}
