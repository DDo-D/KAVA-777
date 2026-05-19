# 두루미 — KAVA 약품검색 + yfinance 재무 추출

[KAVA-777](https://github.com/0gam-song/KAVA-777)에서 약품을 검색해 나온 **제조사**를 모은 뒤, **yfinance**로 재무 지표를 병렬 조회합니다.

| 산출 지표 | 계산식 |
|-----------|--------|
| **EBITDA** | 영업이익 + 감가상각비 + 무형자산상각비 |
| **EV** | 시가총액 + 총차입금 − 현금및현금성자산 |
| **EV/EBITDA** | EV ÷ EBITDA |
| **PER** | 시가총액 ÷ 당기순이익 |

## 연동 구조

```
두루미 (Flask :5000)
  └─ POST KAVA /api/search  → 제조사 displayName 목록
       └─ yfinance 병렬 추출 → EBITDA / EV / PER …
```

## 설치

```bash
cd "두루미"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

`data/corp_code.xml` — 회사명→종목코드 (DART corpCode 캐시, API 키 불필요)

## 1) KAVA 서버 실행 (별도 터미널)

[KAVA-777](https://github.com/0gam-song/KAVA-777) 저장소에서:

```bash
pnpm install
pnpm setup-mcps
pnpm dev
# → http://127.0.0.1:3000
```

## 2) 두루미 실행

```bash
# .env (선택)
# KAVA_API_URL=http://127.0.0.1:3000

python app.py
# → http://127.0.0.1:5000
```

웹 흐름: **약품 검색** → 제조사 체크 → **재무정보 추출** → CSV

## CLI

```bash
# KAVA 검색어로 제조사 자동 수집 후 추출
python main.py --kava-query 타이레놀 --kava-type name

# 회사명 직접
python main.py 종근당 유한양행
```

## API (JSON)

```http
POST /api/kava/search
Content-Type: application/json

{"query": "타이레놀", "type": "name", "limit": 30, "extract": true}
```

`extract: true`이면 제조사 재무까지 한 번에 반환합니다.

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `KAVA_API_URL` | `http://127.0.0.1:3000` | KAVA Next.js 서버 |
| `FLASK_SECRET_KEY` | (개발용 기본값) | Flask 세션 |
