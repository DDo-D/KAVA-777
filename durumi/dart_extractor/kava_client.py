"""KAVA-777 (약품 검색) API 클라이언트 — 제조사 목록 조회."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import requests

DEFAULT_KAVA_URL = "http://127.0.0.1:3000"
SEARCH_TYPES = ("name", "ingredient", "efficacy")


@dataclass
class KavaManufacturer:
    display_name: str
    drug_count: int
    key: str = ""

    @classmethod
    def from_api(cls, raw: dict[str, Any]) -> KavaManufacturer:
        return cls(
            display_name=(raw.get("displayName") or "").strip(),
            drug_count=int(raw.get("drugCount") or 0),
            key=(raw.get("key") or "").strip(),
        )


@dataclass
class KavaSearchResult:
    query: str
    search_type: str
    manufacturers: list[KavaManufacturer] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    drug_count: int = 0
    generic_expanded: bool = False
    generic_ingredient: str | None = None

    def manufacturer_names(self) -> list[str]:
        names: list[str] = []
        for m in self.manufacturers:
            if m.display_name and m.display_name not in names:
                names.append(m.display_name)
        return names


class KavaClientError(RuntimeError):
    pass


def get_kava_base_url() -> str:
    return os.environ.get("KAVA_API_URL", DEFAULT_KAVA_URL).rstrip("/")


def search_manufacturers(
    query: str,
    search_type: str = "name",
    limit: int = 30,
    *,
    base_url: str | None = None,
    timeout: float = 120.0,
) -> KavaSearchResult:
    """KAVA POST /api/search 호출 후 제조사 목록 반환."""
    q = query.strip()
    if not q:
        raise KavaClientError("약품 검색어를 입력해 주세요.")

    st = search_type if search_type in SEARCH_TYPES else "name"
    url = f"{base_url or get_kava_base_url()}/api/search"

    try:
        resp = requests.post(
            url,
            json={"query": q, "type": st, "limit": max(1, min(limit, 100))},
            timeout=timeout,
        )
    except requests.ConnectionError as exc:
        raise KavaClientError(
            f"KAVA 서버에 연결할 수 없습니다 ({url}). "
            "KAVA-777에서 `pnpm dev`로 http://127.0.0.1:3000 을 먼저 실행했는지 확인하세요."
        ) from exc
    except requests.Timeout as exc:
        raise KavaClientError("KAVA 검색 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.") from exc

    try:
        data = resp.json()
    except ValueError as exc:
        raise KavaClientError("KAVA 응답이 JSON이 아닙니다.") from exc

    if resp.status_code >= 400:
        msg = data.get("message") or data.get("error") or resp.reason
        hint = data.get("hint", "")
        detail = f"{msg} {hint}".strip()
        raise KavaClientError(detail or f"KAVA API 오류 (HTTP {resp.status_code})")

    manufacturers = [
        KavaManufacturer.from_api(m) for m in (data.get("manufacturers") or [])
    ]
    manufacturers = [m for m in manufacturers if m.display_name]

    return KavaSearchResult(
        query=data.get("query") or q,
        search_type=data.get("type") or st,
        manufacturers=manufacturers,
        warnings=list(data.get("warnings") or []),
        drug_count=len(data.get("drugs") or []),
        generic_expanded=bool(data.get("genericExpanded")),
        generic_ingredient=data.get("genericIngredient"),
    )
