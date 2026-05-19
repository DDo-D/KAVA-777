"""두루미 — KAVA 약품검색 연동 + yfinance 재무정보 병렬 추출."""

from __future__ import annotations

import re

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, render_template, request, session

from dart_extractor.kava_client import KavaClientError, search_manufacturers
from dart_extractor.yfinance_extractor import (
    CSV_COLUMNS,
    extract_parallel,
    financials_to_csv_rows,
    financials_to_csv_text,
)

load_dotenv()

app = Flask(__name__)
app.secret_key = __import__("os").environ.get(
    "FLASK_SECRET_KEY", "durumi-dev-secret-change-me"
)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024


def _parse_company_names(raw: str) -> list[str]:
    names: list[str] = []
    for line in raw.splitlines():
        for part in re.split(r"[,;\t]+", line):
            name = part.strip()
            if name and name not in names:
                names.append(name)
    return names


def _run_extract(companies: list[str]):
    results = extract_parallel(companies, max_workers=min(8, len(companies)))
    rows = financials_to_csv_rows(results)
    csv_text = financials_to_csv_text(results)
    session["last_csv"] = csv_text
    return results, rows, csv_text


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/kava/search", methods=["POST"])
def kava_search():
    """KAVA 약품 검색 → 제조사 선택 화면."""
    query = request.form.get("kava_query", "").strip()
    search_type = request.form.get("kava_type", "name")
    try:
        limit = int(request.form.get("kava_limit", "30"))
    except ValueError:
        limit = 30

    try:
        kava_result = search_manufacturers(query, search_type, limit=limit)
    except KavaClientError as exc:
        return render_template(
            "index.html",
            error=str(exc),
            kava_query=query,
            kava_type=search_type,
        )

    if not kava_result.manufacturers:
        return render_template(
            "index.html",
            error="검색 결과에서 제조사를 찾지 못했습니다.",
            kava_query=query,
            kava_type=search_type,
        )

    return render_template(
        "kava_select.html",
        kava=kava_result,
        kava_query=query,
        kava_type=search_type,
        kava_limit=limit,
    )


@app.route("/kava/extract", methods=["POST"])
def kava_extract():
    """선택한 제조사 또는 검색어 전체 제조사 → 재무 추출."""
    selected = [n.strip() for n in request.form.getlist("manufacturers") if n.strip()]
    query = request.form.get("kava_query", "").strip()
    search_type = request.form.get("kava_type", "name")
    extract_all = request.form.get("extract_all") == "1"

    companies: list[str] = selected
    kava_meta: dict | None = None

    if not companies and query:
        try:
            kava_result = search_manufacturers(
                query,
                search_type,
                limit=int(request.form.get("kava_limit", "30")),
            )
        except KavaClientError as exc:
            return render_template(
                "index.html",
                error=str(exc),
                kava_query=query,
                kava_type=search_type,
            )
        companies = kava_result.manufacturer_names()
        kava_meta = {
            "query": kava_result.query,
            "type": kava_result.search_type,
            "warnings": kava_result.warnings,
            "drug_count": kava_result.drug_count,
        }

    if not companies:
        return render_template(
            "index.html",
            error="추출할 제조사를 한 곳 이상 선택해 주세요.",
            kava_query=query,
            kava_type=search_type,
        )

    results, rows, csv_text = _run_extract(companies)
    companies_input = "\n".join(companies)
    if kava_meta:
        companies_input = (
            f"# KAVA 검색: {kava_meta['query']} ({kava_meta['type']})\n"
            + companies_input
        )

    return render_template(
        "results.html",
        companies_input=companies_input,
        rows=rows,
        columns=CSV_COLUMNS,
        csv_text=csv_text,
        count=len(results),
        kava_meta=kava_meta,
        extract_all=extract_all,
    )


@app.route("/api/kava/search", methods=["POST"])
def api_kava_search():
    """JSON: KAVA 검색 + (선택) 즉시 재무 추출."""
    body = request.get_json(silent=True) or {}
    query = (body.get("query") or "").strip()
    search_type = body.get("type", "name")
    limit = int(body.get("limit") or 30)
    do_extract = bool(body.get("extract"))

    try:
        kava_result = search_manufacturers(query, search_type, limit=limit)
    except KavaClientError as exc:
        return jsonify({"error": str(exc)}), 502

    payload: dict = {
        "query": kava_result.query,
        "type": kava_result.search_type,
        "warnings": kava_result.warnings,
        "drugCount": kava_result.drug_count,
        "manufacturers": [
            {
                "displayName": m.display_name,
                "drugCount": m.drug_count,
                "key": m.key,
            }
            for m in kava_result.manufacturers
        ],
        "manufacturerNames": kava_result.manufacturer_names(),
    }

    if do_extract and kava_result.manufacturer_names():
        results = extract_parallel(
            kava_result.manufacturer_names(),
            max_workers=min(8, len(kava_result.manufacturers)),
        )
        payload["financials"] = financials_to_csv_rows(results)

    return jsonify(payload)


@app.route("/api/extract", methods=["POST"])
def api_extract():
    """JSON: 회사명 목록 → yfinance 재무 추출."""
    body = request.get_json(silent=True) or {}
    companies = [n.strip() for n in (body.get("companies") or []) if n.strip()]
    if not companies:
        return jsonify({"error": "companies list is empty"}), 400
    results = extract_parallel(companies, max_workers=min(8, len(companies)))
    return jsonify({"financials": financials_to_csv_rows(results)})


@app.route("/extract", methods=["POST"])
def extract():
    raw = request.form.get("companies", "")
    companies = _parse_company_names(raw)
    if not companies:
        return render_template(
            "index.html",
            error="상장사명을 한 개 이상 입력해 주세요.",
            companies=raw,
        )

    results, rows, csv_text = _run_extract(companies)

    return render_template(
        "results.html",
        companies_input=raw,
        rows=rows,
        columns=CSV_COLUMNS,
        csv_text=csv_text,
        count=len(results),
    )


@app.route("/download", methods=["POST"])
def download_csv():
    csv_body = session.get("last_csv", "")
    if not csv_body:
        return Response(
            "추출 결과가 없습니다. 먼저 재무정보를 추출해 주세요.", status=400
        )
    return Response(
        "\ufeff" + csv_body,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="yfinance_financials.csv"'
        },
    )


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
