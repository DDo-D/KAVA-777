"""DART Open API 클라이언트."""

from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://opendart.fss.or.kr/api"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# 보고서 코드 (최신순 탐색용)
REPRT_PRIORITY = [
    ("11013", "1분기보고서"),
    ("11014", "3분기보고서"),
    ("11012", "반기보고서"),
    ("11011", "사업보고서"),
]


def _normalize_name(name: str) -> str:
    s = name.strip().upper()
    for token in ("(주)", "주식회사", "㈜", " ", "\u3000"):
        s = s.replace(token, "")
    return s


def parse_amount(raw: str | None) -> int | None:
    if raw is None or str(raw).strip() in ("", "-", "–"):
        return None
    s = str(raw).strip().replace(",", "")
    negative = s.startswith("(") and s.endswith(")")
    if negative:
        s = s[1:-1]
    try:
        val = int(float(s))
        return -val if negative else val
    except ValueError:
        return None


class DartClient:
    def __init__(self, api_key: str, session: requests.Session | None = None):
        self.api_key = api_key
        self.session = session or requests.Session()
        self._corp_map: dict[str, str] | None = None

    def _get(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{BASE_URL}/{endpoint}"
        p = {"crtfc_key": self.api_key, **params}
        resp = self.session.get(url, params=p, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status", "900")
        if status not in ("000", "013"):
            raise RuntimeError(f"DART API 오류 [{status}]: {data.get('message', data)}")
        return data

    def load_corp_codes(self, force_refresh: bool = False) -> dict[str, str]:
        """회사명(정규화) → corp_code 매핑."""
        if self._corp_map is not None and not force_refresh:
            return self._corp_map

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        xml_path = DATA_DIR / "corp_code.xml"
        zip_path = DATA_DIR / "corp_code.zip"

        if force_refresh or not xml_path.exists():
            r = self.session.get(
                f"{BASE_URL}/corpCode.xml",
                params={"crtfc_key": self.api_key},
                timeout=120,
            )
            r.raise_for_status()
            zip_path.write_bytes(r.content)
            with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
                names = zf.namelist()
                xml_name = next(n for n in names if n.lower().endswith(".xml"))
                xml_path.write_bytes(zf.read(xml_name))

        import xml.etree.ElementTree as ET

        tree = ET.parse(xml_path)
        mapping: dict[str, str] = {}
        for item in tree.getroot().findall("list"):
            corp_name = (item.findtext("corp_name") or "").strip()
            corp_code = (item.findtext("corp_code") or "").strip()
            stock_code = (item.findtext("stock_code") or "").strip()
            if not corp_code:
                continue
            if stock_code and stock_code.strip():
                mapping[_normalize_name(corp_name)] = corp_code
                stock_name = (item.findtext("stock_name") or "").strip()
                if stock_name:
                    mapping[_normalize_name(stock_name)] = corp_code

        self._corp_map = mapping
        return mapping

    def resolve_corp_code(self, company_name: str) -> str | None:
        mapping = self.load_corp_codes()
        key = _normalize_name(company_name)
        if key in mapping:
            return mapping[key]
        # 부분 일치 (동명이인 방지: 입력이 포함되거나 입력이 이름에 포함)
        candidates = [
            (norm, code)
            for norm, code in mapping.items()
            if key in norm or norm in key
        ]
        if len(candidates) == 1:
            return candidates[0][1]
        if len(candidates) > 1:
            candidates.sort(key=lambda x: abs(len(x[0]) - len(key)))
            return candidates[0][1]
        return None

    def get_company(self, corp_code: str) -> dict[str, Any]:
        data = self._get("company.json", {"corp_code": corp_code})
        return {k: v for k, v in data.items() if k not in ("status", "message")}

    def find_latest_regular_report(
        self, corp_code: str, years_back: int = 2
    ) -> tuple[str, str, str] | None:
        """(bsns_year, reprt_code, report_label) 반환. list API 우선, 없으면 연도·코드 역탐색."""
        from datetime import datetime

        end_de = datetime.today().strftime("%Y%m%d")
        bgn_de = f"{datetime.today().year - years_back}0101"

        try:
            data = self._get(
                "list.json",
                {
                    "corp_code": corp_code,
                    "bgn_de": bgn_de,
                    "end_de": end_de,
                    "pblntf_ty": "A",
                    "page_count": 100,
                    "sort": "date",
                    "sort_mth": "desc",
                },
            )
            reports = data.get("list") or []
            pattern = re.compile(r"(사업보고서|분기보고서|반기보고서)")
            for row in reports:
                report_nm = row.get("report_nm", "")
                if not pattern.search(report_nm):
                    continue
                rcept_dt = row.get("rcept_dt", "")
                # report_nm 예: '분기보고서 (2025.03)' / '사업보고서 (2024.12)'
                m = re.search(r"\((\d{4})\.(\d{2})\)", report_nm)
                if m:
                    year, month = m.group(1), int(m.group(2))
                    reprt_code = self._reprt_code_from_month(month, report_nm)
                    if reprt_code:
                        label = f"{report_nm} (접수 {rcept_dt})"
                        return year, reprt_code, label
        except RuntimeError:
            pass

        return self._probe_financial_report(corp_code)

    def _reprt_code_from_month(self, month: int, report_nm: str) -> str | None:
        if "사업보고서" in report_nm:
            return "11011"
        if "반기보고서" in report_nm:
            return "11012"
        if "분기보고서" in report_nm:
            if month in (1, 2, 3):
                return "11013"
            if month in (4, 5, 6):
                return "11012"
            if month in (7, 8, 9):
                return "11014"
            if month in (10, 11, 12):
                return "11014"
        return None

    def _probe_financial_report(self, corp_code: str) -> tuple[str, str, str] | None:
        from datetime import datetime

        year = datetime.today().year
        for y in range(year, year - 3, -1):
            for reprt_code, label in REPRT_PRIORITY:
                try:
                    data = self._get(
                        "fnlttSinglAcntAll.json",
                        {
                            "corp_code": corp_code,
                            "bsns_year": str(y),
                            "reprt_code": reprt_code,
                            "fs_div": "CFS",
                        },
                    )
                    if data.get("list"):
                        return str(y), reprt_code, label
                except RuntimeError:
                    continue
                try:
                    data = self._get(
                        "fnlttSinglAcntAll.json",
                        {
                            "corp_code": corp_code,
                            "bsns_year": str(y),
                            "reprt_code": reprt_code,
                            "fs_div": "OFS",
                        },
                    )
                    if data.get("list"):
                        return str(y), reprt_code, f"{label} (개별)"
                except RuntimeError:
                    continue
        return None

    def fetch_financial_statements(
        self, corp_code: str, bsns_year: str, reprt_code: str
    ) -> list[dict[str, Any]]:
        for fs_div in ("CFS", "OFS"):
            try:
                data = self._get(
                    "fnlttSinglAcntAll.json",
                    {
                        "corp_code": corp_code,
                        "bsns_year": bsns_year,
                        "reprt_code": reprt_code,
                        "fs_div": fs_div,
                    },
                )
                rows = data.get("list") or []
                if rows:
                    return rows
            except RuntimeError:
                continue
        return []
