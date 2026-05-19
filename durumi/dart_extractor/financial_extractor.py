"""재무제표 계정 추출 및 시가총액 조회."""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any

from .dart_client import DartClient, parse_amount, REPRT_PRIORITY

REPRT_LABEL = {code: label for code, label in REPRT_PRIORITY}


@dataclass
class CompanyFinancials:
    input_name: str
    corp_name: str | None = None
    corp_code: str | None = None
    stock_code: str | None = None
    report: str | None = None
    bsns_year: str | None = None
    reprt_code: str | None = None
    fs_div: str | None = None
    영업이익: int | None = None
    감가상각비: int | None = None
    무형자산상각비: int | None = None
    시가총액: int | None = None
    총차입금: int | None = None
    현금및현금성자산: int | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _pick_amount(row: dict[str, Any], reprt_code: str) -> int | None:
    """분기·반기 보고서는 누적(thstrm_add_amount) 우선."""
    if reprt_code in ("11013", "11014", "11012"):
        val = parse_amount(row.get("thstrm_add_amount")) or parse_amount(
            row.get("thstrm_amount")
        )
    else:
        val = parse_amount(row.get("thstrm_amount")) or parse_amount(
            row.get("thstrm_add_amount")
        )
    return val


def _match_account(account_nm: str, patterns: list[str], exclude: list[str] | None = None) -> bool:
    nm = account_nm.replace(" ", "")
    if exclude and any(ex in nm for ex in exclude):
        return False
    return any(p.replace(" ", "") in nm for p in patterns)


def extract_from_statements(
    rows: list[dict[str, Any]], reprt_code: str
) -> dict[str, int | None]:
    result = {
        "영업이익": None,
        "감가상각비": None,
        "무형자산상각비": None,
        "총차입금": None,
        "현금및현금성자산": None,
    }

    borrow_parts: list[tuple[int, str]] = []

    for row in rows:
        sj = row.get("sj_div", "")
        nm = row.get("account_nm", "") or ""
        amt = _pick_amount(row, reprt_code)
        if amt is None:
            continue

        if sj in ("IS", "CIS"):
            if _match_account(
                nm, ["영업이익"], exclude=["영업이익률", "영업이익(손실)", "계속영업"]
            ):
                if result["영업이익"] is None or "영업이익" == nm.replace(" ", ""):
                    result["영업이익"] = amt
            if _match_account(nm, ["감가상각비"], exclude=["무형", "상각비율"]):
                if result["감가상각비"] is None:
                    result["감가상각비"] = amt
            if _match_account(nm, ["무형자산상각"]):
                if result["무형자산상각비"] is None:
                    result["무형자산상각비"] = amt

        if sj == "CF":
            if _match_account(nm, ["감가상각비"], exclude=["무형"]):
                if result["감가상각비"] is None:
                    result["감가상각비"] = amt
            if _match_account(nm, ["무형자산상각"]):
                if result["무형자산상각비"] is None:
                    result["무형자산상각비"] = amt

        if sj == "BS":
            if _match_account(
                nm,
                ["현금및현금성자산", "현금 및 현금성자산", "현금및현금등가물"],
            ):
                result["현금및현금성자산"] = amt

            if _match_account(nm, ["총차입금", "차입금합계", "차입금총계"]):
                result["총차입금"] = amt
            elif _match_account(
                nm,
                ["단기차입금", "장기차입금", "차입금"],
                exclude=["차입금의", "차입금관련", "순차입"],
            ):
                borrow_parts.append((amt, nm))

    if result["총차입금"] is None and borrow_parts:
        # 단기+장기 차입금 합산 (중복 '차입금' 총계 행 제외)
        short = long = bond = 0
        has_parts = False
        for amt, nm in borrow_parts:
            n = nm.replace(" ", "")
            if "단기차입" in n:
                short = amt
                has_parts = True
            elif "장기차입" in n and "비유동" not in n:
                long = amt
                has_parts = True
            elif n == "차입금" or n.endswith("차입금"):
                if result["총차입금"] is None:
                    result["총차입금"] = amt
        if has_parts and result["총차입금"] is None:
            result["총차입금"] = short + long

    return result


def get_market_cap(stock_code: str) -> int | None:
    if not stock_code or not stock_code.strip():
        return None
    code = stock_code.strip().zfill(6)
    try:
        from pykrx import stock
    except ImportError:
        return None

    today = datetime.today()
    for delta in range(0, 10):
        d = today - timedelta(days=delta)
        if d.weekday() >= 5:
            continue
        date_str = d.strftime("%Y%m%d")
        try:
            cap_df = stock.get_market_cap_by_ticker(date_str, market="ALL")
            if code in cap_df.index:
                return int(cap_df.loc[code, "시가총액"])
        except Exception:
            continue
    return None


def process_company(client: DartClient, company_name: str) -> CompanyFinancials:
    out = CompanyFinancials(input_name=company_name)
    try:
        corp_code = client.resolve_corp_code(company_name)
        if not corp_code:
            out.error = f"회사를 찾을 수 없습니다: {company_name}"
            return out
        out.corp_code = corp_code

        info = client.get_company(corp_code)
        out.corp_name = info.get("corp_name") or info.get("stock_name")
        out.stock_code = (info.get("stock_code") or "").strip() or None

        latest = client.find_latest_regular_report(corp_code)
        if not latest:
            out.error = "최근 사업/분기보고서 재무제표를 찾지 못했습니다."
            return out

        bsns_year, reprt_code, report_label = latest
        out.bsns_year = bsns_year
        out.reprt_code = reprt_code
        out.report = report_label

        rows = client.fetch_financial_statements(corp_code, bsns_year, reprt_code)
        if not rows:
            out.error = "재무제표 데이터가 비어 있습니다."
            return out

        if rows:
            fs = rows[0].get("fs_div") or ("CFS" if "연결" in report_label else "OFS")
            out.fs_div = fs

        metrics = extract_from_statements(rows, reprt_code)
        out.영업이익 = metrics["영업이익"]
        out.감가상각비 = metrics["감가상각비"]
        out.무형자산상각비 = metrics["무형자산상각비"]
        out.총차입금 = metrics["총차입금"]
        out.현금및현금성자산 = metrics["현금및현금성자산"]

        if out.stock_code:
            out.시가총액 = get_market_cap(out.stock_code)

    except Exception as exc:
        out.error = str(exc)

    return out


def extract_parallel(
    client: DartClient,
    company_names: list[str],
    max_workers: int = 5,
) -> list[CompanyFinancials]:
    client.load_corp_codes()
    results: list[CompanyFinancials] = []
    workers = min(max_workers, max(1, len(company_names)))

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_company, client, name): name
            for name in company_names
        }
        for future in as_completed(futures):
            results.append(future.result())

    order = {_normalize_order(n): i for i, n in enumerate(company_names)}

    def sort_key(item: CompanyFinancials) -> int:
        return order.get(item.input_name.strip(), 999)

    results.sort(key=sort_key)
    return results


def _normalize_order(name: str) -> str:
    return name.strip()


CSV_COLUMNS = [
    "입력회사명",
    "법인명",
    "종목코드",
    "보고서",
    "사업연도",
    "영업이익",
    "감가상각비",
    "무형자산상각비",
    "시가총액",
    "총차입금",
    "현금및현금성자산",
    "오류",
]


def _fmt_amount(val: int | None) -> str:
    if val is None:
        return ""
    return str(val)


def financials_to_csv_rows(items: list[CompanyFinancials]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in items:
        rows.append(
            {
                "입력회사명": item.input_name,
                "법인명": item.corp_name or "",
                "종목코드": item.stock_code or "",
                "보고서": item.report or "",
                "사업연도": item.bsns_year or "",
                "영업이익": _fmt_amount(item.영업이익),
                "감가상각비": _fmt_amount(item.감가상각비),
                "무형자산상각비": _fmt_amount(item.무형자산상각비),
                "시가총액": _fmt_amount(item.시가총액),
                "총차입금": _fmt_amount(item.총차입금),
                "현금및현금성자산": _fmt_amount(item.현금및현금성자산),
                "오류": item.error or "",
            }
        )
    return rows


def financials_to_csv_text(items: list[CompanyFinancials]) -> str:
    import csv
    import io

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=CSV_COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(financials_to_csv_rows(items))
    return buf.getvalue()
