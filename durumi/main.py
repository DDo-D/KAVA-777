"""
코스피/코스닥 상장사 재무정보 병렬 추출 (yfinance + KAVA 연동)

사용법:
  python main.py 삼성전자 SK하이닉스
  python main.py --kava-query 타이레놀 --kava-type name
  python main.py -f companies.txt -o output/result.xlsx
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from dart_extractor.kava_client import KavaClientError, search_manufacturers
from dart_extractor.yfinance_extractor import (
    CSV_COLUMNS,
    extract_parallel,
    financials_to_csv_rows,
)


def load_company_names(args: argparse.Namespace) -> list[str]:
    if args.kava_query:
        try:
            result = search_manufacturers(
                args.kava_query,
                args.kava_type,
                limit=args.kava_limit,
            )
        except KavaClientError as exc:
            print(f"KAVA 오류: {exc}", file=sys.stderr)
            raise SystemExit(1) from exc
        names = result.manufacturer_names()
        if not names:
            print("KAVA 검색 결과에 제조사가 없습니다.", file=sys.stderr)
            raise SystemExit(1)
        print(
            f"KAVA 「{result.query}」→ 제조사 {len(names)}곳: {', '.join(names[:8])}"
            + (" …" if len(names) > 8 else "")
        )
        for w in result.warnings:
            print(f"  ⚠ {w}")
        return names

    if args.companies:
        return [c.strip() for c in args.companies if c.strip()]
    if args.file:
        path = Path(args.file)
        if not path.exists():
            raise FileNotFoundError(f"회사 목록 파일 없음: {path}")
        lines = path.read_text(encoding="utf-8").splitlines()
        return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    default = Path(__file__).parent / "companies.txt"
    if default.exists():
        lines = default.read_text(encoding="utf-8").splitlines()
        return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    raise ValueError(
        "회사명을 인자로 넘기거나 --kava-query / companies.txt를 사용하세요."
    )


def format_won(value: float | None) -> str:
    if value is None:
        return ""
    return f"{int(round(value)):,}"


def format_ratio(value: float | None) -> str:
    if value is None:
        return ""
    return f"{value:.2f}"


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description="yfinance 재무정보 병렬 추출")
    parser.add_argument("companies", nargs="*", help="회사명 (복수 가능)")
    parser.add_argument("--file", "-f", help="회사명 목록 파일 (한 줄에 하나)")
    parser.add_argument("--output", "-o", default="output/재무정보_추출결과.xlsx")
    parser.add_argument("--workers", "-w", type=int, default=5, help="병렬 worker 수")
    parser.add_argument("--kava-query", help="KAVA 약품 검색어 → 제조사 자동 수집")
    parser.add_argument(
        "--kava-type",
        choices=("name", "ingredient", "efficacy"),
        default="name",
        help="KAVA 검색 유형",
    )
    parser.add_argument("--kava-limit", type=int, default=30, help="KAVA 약품 결과 상한")
    args = parser.parse_args()

    names = load_company_names(args)
    print(f"대상 회사 {len(names)}곳")

    results = extract_parallel(names, max_workers=args.workers)
    rows = financials_to_csv_rows(results)
    df = pd.DataFrame(rows, columns=CSV_COLUMNS)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(out_path, index=False)

    print("\n=== 추출 결과 ===")
    for r in results:
        title = r.corp_name or r.input_name
        if r.error:
            print(f"[오류] {title}: {r.error}")
            continue
        print(f"\n■ {title} ({r.yf_ticker or '-'})")
        print(f"  기준: {r.statement_basis} / 결산일 {r.period_end or '-'}")
        print(f"  EBITDA: {format_won(r.EBITDA)}  EV: {format_won(r.EV)}")
        print(f"  EV/EBITDA: {format_ratio(r.EV_EBITDA)}  PER: {format_ratio(r.PER)}")

    print(f"\n엑셀 저장: {out_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
