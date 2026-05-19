"""로컬 corp_code.xml로 회사명 → 종목코드 매핑 (DART API 불필요)."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CORP_XML = DATA_DIR / "corp_code.xml"


def _normalize_name(name: str) -> str:
    s = name.strip().upper()
    for token in ("(주)", "주식회사", "㈜", " ", "\u3000"):
        s = s.replace(token, "")
    return s


@dataclass(frozen=True)
class CorpEntry:
    corp_name: str
    stock_code: str


class CorpResolver:
    def __init__(self) -> None:
        self._name_to_entry: dict[str, CorpEntry] | None = None
        self._code_to_entry: dict[str, CorpEntry] | None = None

    def load(self) -> None:
        if self._name_to_entry is not None:
            return
        if not CORP_XML.exists():
            raise FileNotFoundError(
                f"고유번호 파일이 없습니다: {CORP_XML}\n"
                "data/corp_code.xml을 준비하거나 DART에서 corpCode.xml을 받아 두세요."
            )

        tree = ET.parse(CORP_XML)
        by_name: dict[str, CorpEntry] = {}
        by_code: dict[str, CorpEntry] = {}

        for item in tree.getroot().findall("list"):
            corp_name = (item.findtext("corp_name") or "").strip()
            stock_code = (item.findtext("stock_code") or "").strip()
            if not corp_name or not stock_code:
                continue
            entry = CorpEntry(corp_name=corp_name, stock_code=stock_code.zfill(6))
            by_name[_normalize_name(corp_name)] = entry
            by_code[entry.stock_code] = entry
            stock_name = (item.findtext("stock_name") or "").strip()
            if stock_name:
                by_name[_normalize_name(stock_name)] = entry

        self._name_to_entry = by_name
        self._code_to_entry = by_code

    def resolve(self, company_name: str) -> CorpEntry | None:
        self.load()
        assert self._name_to_entry is not None

        raw = company_name.strip()
        if not raw:
            return None

        # 티커 직접 입력: 005930.KS, 005930
        ticker_match = raw.upper()
        if "." in ticker_match:
            code = ticker_match.split(".")[0]
            if code.isdigit() and self._code_to_entry:
                return self._code_to_entry.get(code.zfill(6))
        if raw.isdigit() and len(raw) <= 6 and self._code_to_entry:
            return self._code_to_entry.get(raw.zfill(6))

        key = _normalize_name(raw)
        if key in self._name_to_entry:
            return self._name_to_entry[key]

        candidates = [
            entry
            for norm, entry in self._name_to_entry.items()
            if key in norm or norm in key
        ]
        if len(candidates) == 1:
            return candidates[0]
        if len(candidates) > 1:
            candidates.sort(
                key=lambda e: abs(
                    len(_normalize_name(e.corp_name)) - len(key)
                )
            )
            return candidates[0]
        return None
