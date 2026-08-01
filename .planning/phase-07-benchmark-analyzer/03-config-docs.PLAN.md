# PLAN — Wave 3: Config/문서 — 배포 설정 + 환경변수 가이드

> Phase: 7
> Wave: 3
> Requirements: R34
> Dependencies: Wave 1 완료 후 (vercel.json functions 설정은 `api/benchmark.js` 파일 존재 필요; ENVIRONMENT-GUIDE.md 편집은 독립적이나 동일 Wave로 묶음)

---

## Goal

벤치마킹 분석기 API(`api/benchmark.js`)의 Vercel 배포 설정과 신규 환경변수 문서를 정비한다. 두 가지 결과물을 산출한다: (1) `vercel.json`의 함수 타임아웃 명시 + env 블록 확장, (2) `ENVIRONMENT-GUIDE.md`에 Apify/OpenAI 환경변수 발급 방법·확인 curl·비용 안내 추가.

---

## Tasks

### Task 1: vercel.json 수정 — 함수 타임아웃 + env 블록 확장

**Description:** `api/benchmark.js`가 Vercel 타임아웃으로 종료되는 것을 방지하기 위해 `maxDuration`을 명시적으로 설정하고, 신규 외부 서비스(Apify, OpenAI) 키를 Vercel env 블록에 추가한다. 기존 KV env 2개(`KV_REST_API_URL`, `KV_REST_API_TOKEN`)는 유지한다.

**Implementation:**
```json
// vercel.json — 기존 "env" 블록 아래에 추가
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" },
    { "src": "*.html", "use": "@vercel/static" },
    { "src": "*.js", "use": "@vercel/static" },
    { "src": "*.css", "use": "@vercel/static" },
    { "src": "skills/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/review/(.*)", "dest": "/client-review.html" },
    { "src": "/(.*\\.(html|js|css|json|md|png|jpg|svg|ico|woff|woff2|ttf|eot))", "dest": "/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "KV_REST_API_URL": "@kv-rest-api-url",
    "KV_REST_API_TOKEN": "@kv-rest-api-token",
    "APIFY_API_TOKEN": "@apify-api-token",
    "OPENAI_API_KEY": "@openai-api-key"
  },
  "functions": {
    "api/benchmark.js": {
      "maxDuration": 300
    }
  }
}
```

**Acceptance Criteria:**
- [ ] `functions` 객체에 `api/benchmark.js` 경로의 `maxDuration: 300` 항목이 존재
- [ ] `env` 블록에 기존 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 포함 총 4개 항목 존재
- [ ] `APIFY_API_TOKEN`과 `OPENAI_API_KEY` 값이 각각 `@apify-api-token`, `@openai-api-key` 센티널 레퍼런스로 기록
- [ ] JSON 파싱이 오류 없이 성공
- [ ] `vercel.json`의 기존 `builds`, `routes` 블록이 변경되지 않고 보존

---

### Task 2: ENVIRONMENT-GUIDE.md 수정 — 신규 환경변수 문서 추가

**Description:** 벤치마킹 분석기에 필요한 `APIFY_API_TOKEN`과 `OPENAI_API_KEY`를 환경변수 표·발급 방법·확인 curl·비용 안내·API 엔드포인트 표에 반영한다. 기존 ANTHROPIC/TAVILY/KV 항목은 보존한다.

**Implementation:**
```markdown
<!-- ENVIRONMENT-GUIDE.md "필수 환경변수" 표 — 기존 4행 뒤에 2행 추가 -->

| 변수명 | 설명 | 설정 위치 | 필수 여부 |
|--------|------|-----------|-----------|
| ANTHROPIC_API_KEY | Claude API 키 (자동 모드) | Vercel 대시보드 → Settings → Environment Variables | 자동 모드 사용 시 필수 |
| TAVILY_API_KEY | Tavily Search API 키 (자동 조사) | Vercel 대시보드 → Settings → Environment Variables | 자동 조사 기능 사용 시 필수 |
| KV_REST_API_URL | Vercel KV REST API URL | Vercel 대시보드 → Storage → KV → Settings | 기획안 검토 기능 사용 시 필수 |
| KV_REST_API_TOKEN | Vercel KV REST API 토큰 | Vercel 대시보드 → Storage → KV → Settings | 기획안 검토 기능 사용 시 필수 |
| **APIFY_API_TOKEN** | **Apify API 토큰 (벤치마킹 크롤링)** | **Vercel 대시보드 → Settings → Environment Variables** | **벤치마킹 분석기 사용 시 필수** |
| **OPENAI_API_KEY** | **OpenAI API 키 (Whisper 음성 전사)** | **Vercel 대시보드 → Settings → Environment Variables** | **벤치마킹 분석기 사용 시 필수** |

<!-- 발급 방법 섹션 — 기존 "TAVILY_API_KEY 발급 방법" 뒤에 추가 -->

## APIFY_API_TOKEN 발급 방법

1. https://apify.com 접속
2. 회원가입 후 로그인 (무료 가입, 신용카드 불필요)
3. Dashboard 왼쪽 메뉴 → **Settings** → **API & Integration**
4. "Create new token" 클릭 → 토큰 발급
5. 발급받은 토큰 복사

### Apify 무료 플랜
- 월 **$5 크레딧** 제공 (이월 없음)
- 1회 분석 ≈ $0.08 (resultsLimit 30 기준)
- 크레딧 소진 시 다음 주기까지 run 차단 (과금 아님)

## OPENAI_API_KEY 발급 방법

1. https://platform.openai.com 접속
2. 로그인 후 좌측 메뉴 → **API keys**
3. "Create new secret key" 클릭 → 키 발급
4. 발급받은 키 복사

### Whisper 과금
- **$0.006/분** (60초 릴스 1개 기준 ≈ $0.006)
- 5개 릴스 분석 시 ≈ $0.03

<!-- 확인 방법 섹션 — 기존 curl 예시 뒤에 벤치마킹 API 예시 추가 -->

## 벤치마킹 API 테스트

```bash
# 1. 분석 작업 생성
curl https://your-app.vercel.app/api/benchmark \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"instagramId": "target_account"}'

# 응답: { "success": true, "jobId": "xxxxxxxxxxxxxxxxxxxxxx" }

# 2. 작업 상태 폴링 (jobId는 위 응답에서 받은 값)
curl "https://your-app.vercel.app/api/benchmark?id=xxxxxxxxxxxxxxxxxxxxxx"

# 응답 예시 (crawling 단계):
# { "jobId": "...", "status": "processing", "stage": "crawling" }

# 응답 예시 (done 단계):
# { "jobId": "...", "status": "completed", "stage": "done", "reels": [...], "result": {...} }
```

### 비용 안내

| 항목 | 비용 | 비고 |
|------|------|------|
| Apify 크롤링 (1회) | ≈ $0.08 | resultsLimit 30, 바이럴 상위 5개만 분석 |
| Whisper 전사 (1개 릴스, 60초) | $0.006 | $0.006/분 과금 |
| Claude 구조 분석 (1회) | ≈ $0.02~0.05 | 단일 호출 |
| **job당 총 예상 비용** | **≈ $0.13~0.16** | 상한 정책으로 통제 |
| Apify 월 크레딧 | $5 (무료) | 약 60회 분석 가능 |

### 서버 강제 상한 정책

- `MAX_ANALYZE_REELS = 5` — 분석할 릴스 개수 상한 (UI에서 3~5 선택 가능하나 서버가 5로 클램프)
- `maxTotalChargeUsd = 1` — Apify run 단일 비용 상한 (요청 시 자동 적용)
- `videoDuration > 180초` 릴스는 전사 제외 (장편 릴스 비용/품질 방어)

<!-- API 엔드포인트 표 — /api/benchmark 행 추가 -->

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/generate` | POST | Claude API 자동 생성 |
| `/api/research` | POST | Tavily 기반 자동 조사 |
| `/api/review` | POST | 기획안 검토 생성 |
| `/api/review?id=xxx` | GET | 기획안 검토 조회 |
| `/api/review` | PATCH | 승인/수정요청 상태 업데이트 |
| `/api/benchmark` | POST | 벤치마킹 분석 작업 생성 |
| `/api/benchmark?id=xxx` | GET | 벤치마킹 작업 상태 조회 / 폴링 |
| `/review/{id}` | GET | 고객 검토 페이지 (client-review.html) |
```

**Acceptance Criteria:**
- [ ] 필수 환경변수 표에 `APIFY_API_TOKEN`, `OPENAI_API_KEY` 행이 추가되어 기존 4개와 함께 총 6개 표시
- [ ] `APIFY_API_TOKEN` 발급 방법 섹션(가입 → Settings → API & Integration → 토큰 발급) + 무료 $5 크레딧 안내 포함
- [ ] `OPENAI_API_KEY` 발급 방법 섹션(Platform → API keys → 시크릿 키 발급) + Whisper $0.006/분 안내 포함
- [ ] 벤치마킹 API 테스트 curl 예시가 `POST /api/benchmark` + `GET /api/benchmark?id=` 두 호출 모두 포함
- [ ] 비용 안내 표에 job당 예상 비용($0.13~0.16) + 상한 정책 설명(MAX_ANALYZE_REELS=5, maxTotalChargeUsd=1, 180초 캡) 포함
- [ ] API 엔드포인트 표에 `/api/benchmark` POST/GET 행 추가
- [ ] 기존 `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` 항목이 보존

---

## Dependencies

- **Wave 1 완료 후**: `vercel.json`의 `functions.api/benchmark.js` 항목은 해당 파일이 실제로 존재해야 의미가 있으므로 Wave 1(`api/benchmark.js` 신규 작성) 선행 필요.
- **ENVIRONMENT-GUIDE.md**는 Wave 1과 독립적으로 편집 가능하나, 사용자 검증 순서 상 같은 Wave로 묶어 Wave 1 직후 진행.

---

## Files to Create/Modify

| 파일 | 상태 | 내용 |
|------|------|------|
| `vercel.json` | **MODIFY** | `functions` 블록에 `api/benchmark.js` maxDuration 300 추가 + `env` 블록에 `APIFY_API_TOKEN`/`OPENAI_API_KEY` 추가 (기존 KV env 2개 보존) |
| `ENVIRONMENT-GUIDE.md` | **MODIFY** | 필수 환경변수 표 2행 추가 + 발급 방법 2개 섹션 + 벤치마킹 API 테스트 curl + 비용 안내 + 엔드포인트 표 2행 추가 |

---

## Verification

- [ ] **JSON 유효성**: `node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"` 실행 → 파싱 오류 없음 (exit 0)
- [ ] **maxDuration 확인**: 파싱 결과 `functions["api/benchmark.js"].maxDuration === 300`
- [ ] **env 개수 확인**: `env` 블록 키 개수 == 4 (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `APIFY_API_TOKEN`, `OPENAI_API_KEY`)
- [ ] **ENVIRONMENT-GUIDE 발급 방법**: 파일 내 "APIFY_API_TOKEN 발급 방법" 및 "OPENAI_API_KEY 발급 방법" 섹션 텍스트 존재 확인
- [ ] **ENVIRONMENT-GUIDE curl**: `POST /api/benchmark`와 `GET /api/benchmark?id=` curl 예시 블록 존재 확인
- [ ] **ENVIRONMENT-GUIDE 비용 안내**: `MAX_ANALYZE_REELS`, `maxTotalChargeUsd`, `$0.13~0.16` 등 키 수치 포함 확인
- [ ] **ENVIRONMENT-GUIDE 엔드포인트 표**: `/api/benchmark` POST/GET 행 존재 확인
- [ ] **로컬 dev 스모크**: 사용자 키 설정 후 `vercel dev` 실행 → `api/benchmark.js`가 정상 로드되어 env 없이도 한국어 500 메시지 응답 (`APIFY_API_TOKEN`/`OPENAI_API_KEY` 미설정 시 키 미설정 한글 오류 반환 확인)
