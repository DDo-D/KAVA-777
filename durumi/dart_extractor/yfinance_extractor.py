"""yfinance로 재무제표·시가총액 조회 및 EBITDA/EV/PER 계산."""

from __future__ import annotations

import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from typing import Any

import pandas as pd
import yfinance as yf

from .corp_resolver import CorpResolver

# 손익계산서
_INCOME_PATTERNS: dict[str, list[str]] = {
    "영업이익": ["Operating Income"],
    "당기순이익": [
        "Net Income Common Stockholders",
        "Net Income",
        "Net Income Including Noncontrolling Interests",
    ],
}

# 현금흐름표
_CF_PATTERNS: dict[str, list[str]] = {
    "감가상각비": ["Depreciation"],
    "무형자산상각비": [
        "Amortization Cash Flow",
        "Amortization Of Intangibles",
        "Amortization",
    ],
}

# 재무상태표
_BS_PATTERNS: dict[str, list[str]] = {
    "총차입금": ["Total Debt"],
    "현금및현금성자산": ["Cash And Cash Equivalents"],
}

_CF_FALLBACK_DEPRECIATION = ["Depreciation And Amortization"]


@dataclass
class CompanyFinancials:
    input_name: str
    corp_name: str | None = None
    stock_code: str | None = None
    yf_ticker: str | None = None
    period_end: str | None = None
    statement_basis: str | None = None
    currency: str | None = None
    영업이익: float | None = None
    감가상각비: float | None = None
    무형자산상각비: float | None = None
    시가총액: float | None = None
    총차입금: float | None = None
    현금및현금성자산: float | None = None
    당기순이익: float | None = None
    EBITDA: float | None = None
    EV: float | None = None
    EV_EBITDA: float | None = None
    PER: float | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _match_row(index: pd.Index, patterns: list[str], exclude: list[str] | None = None) -> str | None:
    exclude = exclude or []
    for pat in patterns:
        for label in index:
            if pat.lower() == str(label).lower():
                if not any(ex.lower() in str(label).lower() for ex in exclude):
                    return str(label)
    for pat in patterns:
        for label in index:
            s = str(label)
            if pat.lower() in s.lower():
                if exclude and any(ex.lower() in s.lower() for ex in exclude):
                    continue
                return s
    return None


def _latest_value(df: pd.DataFrame | None, row_label: str | None) -> tuple[float | None, str | None]:
    if df is None or df.empty or row_label is None or row_label not in df.index:
        return None, None
    series = df.loc[row_label]
    if hasattr(series, "iloc"):
        val = series.iloc[0]
        period = series.index[0]
    else:
        val = series
        period = None
    if pd.isna(val):
        return None, _format_period(period)
    try:
        return float(val), _format_period(period)
    except (TypeError, ValueError):
        return None, _format_period(period)


def _format_period(period: Any) -> str | None:
    if period is None:
        return None
    if isinstance(period, pd.Timestamp):
        return period.strftime("%Y-%m-%d")
    return str(period)[:10]


def _extract_metric(
    df: pd.DataFrame | None, patterns: list[str], exclude: list[str] | None = None
) -> tuple[float | None, str | None]:
    if df is None or df.empty:
        return None, None
    row = _match_row(df.index, patterns, exclude=exclude)
    return _latest_value(df, row)


def _sum_components(*values: float | None) -> float | None:
    if all(v is None for v in values):
        return None
    return sum(v or 0.0 for v in values)


def _safe_ratio(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None:
        return None
    if denominator == 0:
        return None
    return numerator / denominator


def _compute_derived(out: CompanyFinancials) -> None:
    out.EBITDA = _sum_components(out.영업이익, out.감가상각비, out.무형자산상각비)
    if out.시가총액 is not None:
        debt = out.총차입금 or 0.0
        cash = out.현금및현금성자산 or 0.0
        out.EV = out.시가총액 + debt - cash
    out.EV_EBITDA = _safe_ratio(out.EV, out.EBITDA)
    out.PER = _safe_ratio(out.시가총액, out.당기순이익)


def _resolve_yf_symbol(stock_code: str) -> str | None:
    code = stock_code.zfill(6)
    for suffix in (".KS", ".KQ"):
        symbol = f"{code}{suffix}"
        try:
            info = yf.Ticker(symbol).info or {}
        except Exception:
            continue
        if info.get("marketCap") or info.get("quoteType") == "EQUITY":
            return symbol
    return f"{code}.KS"


def _pick_statements(ticker: yf.Ticker) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, str]:
    inc = ticker.quarterly_financials
    cf = ticker.quarterly_cashflow
    bs = ticker.quarterly_balance_sheet
    if inc is not None and not inc.empty:
        return inc, cf, bs, "분기(최신)"

    inc = ticker.financials
    cf = ticker.cashflow
    bs = ticker.balance_sheet
    return inc, cf, bs, "연간(최신)"


def process_company(resolver: CorpResolver, company_name: str) -> CompanyFinancials:
    out = CompanyFinancials(input_name=company_name)
    try:
        entry = resolver.resolve(company_name)
        if not entry:
            out.error = f"회사를 찾을 수 없습니다: {company_name}"
            return out

        out.corp_name = entry.corp_name
        out.stock_code = entry.stock_code
        symbol = _resolve_yf_symbol(entry.stock_code)
        out.yf_ticker = symbol

        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        out.currency = info.get("currency")

        market_cap = info.get("marketCap")
        if market_cap is not None and not (isinstance(market_cap, float) and math.isnan(market_cap)):
            out.시가총액 = float(market_cap)

        inc, cf, bs, basis = _pick_statements(ticker)
        out.statement_basis = basis

        if inc is None or inc.empty:
            out.error = "손익계산서 데이터를 가져오지 못했습니다."
            return out

        periods: list[str] = []
        for key, patterns in _INCOME_PATTERNS.items():
            val, period = _extract_metric(inc, patterns)
            setattr(out, key, val)
            if period:
                periods.append(period)

        if cf is not None and not cf.empty:
            dep, p1 = _extract_metric(
                cf, _CF_PATTERNS["감가상각비"], exclude=["Amortization"]
            )
            if dep is None:
                dep, p1 = _extract_metric(cf, _CF_FALLBACK_DEPRECIATION)
            out.감가상각비 = dep
            if p1:
                periods.append(p1)

            amort, p2 = _extract_metric(
                cf,
                _CF_PATTERNS["무형자산상각비"],
                exclude=["Depreciation And Amortization"],
            )
            out.무형자산상각비 = amort
            if p2:
                periods.append(p2)

        if bs is not None and not bs.empty:
            debt, p3 = _extract_metric(bs, _BS_PATTERNS["총차입금"])
            out.총차입금 = debt
            if p3:
                periods.append(p3)

            cash, p4 = _extract_metric(bs, _BS_PATTERNS["현금및현금성자산"])
            out.현금및현금성자산 = cash
            if p4:
                periods.append(p4)

        if periods:
            out.period_end = max(periods)

        _compute_derived(out)

    except Exception as exc:
        out.error = str(exc)

    return out


def extract_parallel(
    company_names: list[str],
    max_workers: int = 5,
) -> list[CompanyFinancials]:
    resolver = CorpResolver()
    resolver.load()
    results: list[CompanyFinancials] = []
    workers = min(max_workers, max(1, len(company_names)))

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_company, resolver, name): name
            for name in company_names
        }
        for future in as_completed(futures):
            results.append(future.result())

    order = {n.strip(): i for i, n in enumerate(company_names)}
    results.sort(key=lambda r: order.get(r.input_name.strip(), 999))
    return results


CSV_COLUMNS = [
    "입력회사명",
    "법인명",
    "종목코드",
    "Yahoo티커",
    "재무기준",
    "결산일",
    "통화",
    "영업이익",
    "감가상각비",
    "무형자산상각비",
    "EBITDA",
    "시가총액",
    "총차입금",
    "현금및현금성자산",
    "EV",
    "당기순이익",
    "EV/EBITDA",
    "PER",
    "오류",
]

_NUMERIC_COLS = {
    "영업이익",
    "감가상각비",
    "무형자산상각비",
    "EBITDA",
    "시가총액",
    "총차입금",
    "현금및현금성자산",
    "EV",
    "당기순이익",
}
_RATIO_COLS = {"EV/EBITDA", "PER"}


def _fmt_amount(val: float | None) -> str:
    if val is None:
        return ""
    if abs(val) >= 1:
        return str(int(round(val)))
    return str(val)


def _fmt_ratio(val: float | None) -> str:
    if val is None:
        return ""
    return f"{val:.2f}"


def financials_to_csv_rows(items: list[CompanyFinancials]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in items:
        rows.append(
            {
                "입력회사명": item.input_name,
                "법인명": item.corp_name or "",
                "종목코드": item.stock_code or "",
                "Yahoo티커": item.yf_ticker or "",
                "재무기준": item.statement_basis or "",
                "결산일": item.period_end or "",
                "통화": item.currency or "",
                "영업이익": _fmt_amount(item.영업이익),
                "감가상각비": _fmt_amount(item.감가상각비),
                "무형자산상각비": _fmt_amount(item.무형자산상각비),
                "EBITDA": _fmt_amount(item.EBITDA),
                "시가총액": _fmt_amount(item.시가총액),
                "총차입금": _fmt_amount(item.총차입금),
                "현금및현금성자산": _fmt_amount(item.현금및현금성자산),
                "EV": _fmt_amount(item.EV),
                "당기순이익": _fmt_amount(item.당기순이익),
                "EV/EBITDA": _fmt_ratio(item.EV_EBITDA),
                "PER": _fmt_ratio(item.PER),
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
