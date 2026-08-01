---
phase: 7
plan: 3
subsystem: config-docs
tags: [vercel-config, environment-variables, apify, openai, documentation, maxDuration]
requires: [R34]
provides: [R34]
affects: [Wave 1 (01-backend-benchmark-api), 실 API E2E (사용자 키 체크포인트 후)]
tech-stack:
  added: []
  patterns: ["Vercel env @-sentinel 레퍼런스 (실제 키 값은 대시보드에만 존재)", "functions.maxDuration 300 (Hobby 60s 한도 대비 명시적 함수 타임아웃)"]
key-files:
  created: []
  modified: [vercel.json, ENVIRONMENT-GUIDE.md]
decisions:
  - "maxDuration을 코드 주석이 아닌 vercel.json functions 블록에 명시 — fluid 여부와 무관하게 배포 설정으로 확정 (RESEARCH §3-1)"
  - "env 블록 신규 2개는 @-sentinel(@apify-api-token, @openai-api-key) 사용 — 키 값이 git에 노출되지 않도록 기존 KV 2개와 동일한 메커니즘 유지"
  - "curl 블록 주석을 기존 파일 스타일(# 기획안 검토 조회…)과 동일하게 'POST /api/benchmark — 분석 작업 생성' / 'GET /api/benchmark?id= — 작업 상태 폴링' 형태로 명명 — 검증 grep 문자열이 리터럴로 존재하도록"
metrics:
  duration_minutes: 30
  completed: 2026-08-01
  tests: 0 (오프라인 구성/문서 검증 — 실 API 호출 없음)
---

# Phase 7 Plan 3: Config/문서 — 배포 설정 + 환경변수 가이드 Summary

## One-liner

Vercel Hobby 함수 타임아웃(60s)을 우회하기 위해 `vercel.json`에 `functions["api/benchmark.js"].maxDuration: 300`을 명시하고 env 블록에 Apify/OpenAI 키 2개(@-sentinel)를 추가했으며, `ENVIRONMENT-GUIDE.md`에 두 키의 발급 방법·확인 curl·비용 안내·엔드포인트 표 행을 추가한 순수 추가(additive) 구성/문서 작업

## What Was Built

**`vercel.json` (수정, Task 1 — commit `cdfe74f`)**

1. `functions` 블록 신규 — `"api/benchmark.js": { "maxDuration": 300 }` (Wave 1에서 생성된 파일에 대한 Vercel 함수 타임아웃 명시)
2. `env` 블록 확장 — 기존 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 보존 + `APIFY_API_TOKEN: "@apify-api-token"`, `OPENAI_API_KEY: "@openai-api-key"` 추가 (총 4개)
3. `version: 2`, `builds` 5개, `routes` 4개 — 무변경 (diff 검증)

**`ENVIRONMENT-GUIDE.md` (수정, Task 2 — commit `9306ebe`)**

1. 필수 환경변수 표에 `APIFY_API_TOKEN`(벤치마킹 크롤링), `OPENAI_API_KEY`(Whisper 음성 전사) 2행 추가 (기존 4행 + 신규 2행 = 총 6행, bold 강조)
2. `## APIFY_API_TOKEN 발급 방법` 섹션 — apify.com 가입 → Settings → **API & Integration** → "Create new token" + Apify 무료 플랜(월 $5 크레딧, 1회 ≈ $0.08, 크레딧 소진 시 차단·과금 아님)
3. `## OPENAI_API_KEY 발급 방법` 섹션 — platform.openai.com → **API keys** → "Create new secret key" + Whisper 과금($0.006/분, 5개 릴스 ≈ $0.03)
4. `## 벤치마킹 API 테스트` 섹션 — POST `/api/benchmark`(job 생성) + GET `/api/benchmark?id=`(상태 폴링) curl 블록 + 응답 예시(crawling/done 단계)
5. `### 비용 안내` 표 — Apify ≈ $0.08, Whisper $0.006, Claude ≈ $0.02~0.05, **job당 총 ≈ $0.13~0.16**, Apify 월 $5 크레딧 ≈ 60회
6. `### 서버 강제 상한 정책` — `MAX_ANALYZE_REELS = 5`(서버 클램프), `maxTotalChargeUsd = 1`, `videoDuration > 180초` 전사 제외
7. API 엔드포인트 표에 `/api/benchmark` POST / `/api/benchmark?id=xxx` GET 2행 추가 (기존 `/api/generate`~`/review/{id}` 행 보존)

기존 내용(ANTHROPIC/TAVILY/KV 행, Vercel KV 설정, Tavily 발급, 확인 방법 curl, 문제 해결)은 모두 보존.

## Verification

### [검증됨] — 오프라인 검증 (실 API 호출 0건)

| 항목 | 근거 |
|------|------|
| `vercel.json` JSON 유효성 | `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` 실행 — 출력 "JSON parse: OK", 프로세스 exit 0 |
| `maxDuration === 300` | node 원라이너 출력: `maxDuration: 300 === 300: true` |
| env 블록 정확히 4개 | node 원라이너 출력: `env keys: 4 KV_REST_API_URL,KV_REST_API_TOKEN,APIFY_API_TOKEN,OPENAI_API_KEY` + 정렬 비교 `env exact match: true` |
| @-sentinel 레퍼런스 | node 출력: `APIFY sentinel: @apify-api-token`, `OPENAI sentinel: @openai-api-key` |
| builds/routes/version 무변경 | node 출력: `builds count: 5, routes count: 4, version: 2` + `git diff vercel.json`가 env 2행·functions 블록 추가만 표시 (builds/routes hunk 없음) |
| ENVIRONMENT-GUIDE 발급 방법 섹션 | `grep -n` — `## APIFY_API_TOKEN 발급 방법`(55행), `## OPENAI_API_KEY 발급 방법`(68행) 존재. 발급 단계 문자열(`Settings`→`API & Integration` 59행, `Create new token` 60행, `API keys` 71행, `Create new secret key` 72행) 존재 |
| 벤치마킹 curl 블록 | `grep -n 'POST /api/benchmark\|GET /api/benchmark?id='` — 110행(`# POST /api/benchmark — 분석 작업 생성`), 118행(`# GET /api/benchmark?id= — 작업 상태 폴링`) + 실제 curl 111·119행, POST body `{"instagramId": "target_account"}` |
| 비용/상한 키 수치 | `grep -n` — `$0.13~0.16`(135행), `MAX_ANALYZE_REELS = 5`(140행), `maxTotalChargeUsd = 1`(141행), `180초`(142행) 존재 |
| 엔드포인트 표 행 | `grep -n '/api/benchmark'` — 153행 POST, 154행 GET 존재 (기존 review 행 148~152, `/review/{id}` 155행 보존) |
| 기존 항목 보존 | `grep -c 'ANTHROPIC_API_KEY\|TAVILY_API_KEY\|KV_REST_API_URL\|KV_REST_API_TOKEN'` = 13 (기존 표 4행 7·8·9·10, KV 설정 21·22, 설정 방법 36·37·38, Tavily 발급 헤더 42, 문제 해결 159·164·169) |
| ENVIRONMENT-GUIDE diff 순수 추가 | `git diff ENVIRONMENT-GUIDE.md` — 65 insertions, 삭제 라인 0건 (`grep '^-'`가 diff 헤더 `---`만 매칭) |
| 커밋별 파일 격리 | `git show --stat` — Task 1 커밋은 `vercel.json` 1개 파일, Task 2 커밋은 `ENVIRONMENT-GUIDE.md` 1개 파일만 변경. 커밋 내 예기치 않은 파일 삭제 0건 (`git diff --diff-filter=D` 출력 없음) |

### [부분검증] — 없음

### [검증불가] — 실 배포/런타임 검증

| 항목 | 사유 | 복구 계획 |
|------|------|-----------|
| `vercel dev` 스모크 (api/benchmark.js 로드 + 키 미설정 한국어 500) | Vercel 대시보드에 `@apify-api-token`/`@openai-api-key` 센티널이 아직 설정되지 않아 로컬 `vercel dev`가 env 참조를 해석할 수 없음 — PLAN.md 재개 조건(사용자 키 체크포인트)에 따라 의도적 보류 | 사용자 키 체크포인트 후 `vercel dev` 실행 → `api/benchmark.js` 정상 로드 + `APIFY_API_TOKEN`/`OPENAI_API_KEY` 미설정 시 한국어 500 응답(누락 키명 명시) 확인, 이후 실 API curl E2E |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing grep-target strings] curl 블록 주석에 리터럴 문자열 명명**

- **Found during:** Task 2 (검증 단계)
- **Issue:** 계획 스케치의 curl 블록은 `# 1. 분석 작업 생성` / `# 2. 작업 상태 폴링` 주석을 사용하고 `-X POST`를 URL과 다른 줄에 배치 — 계획 검증 기준(및 실행 지시)의 grep 대상 문자열 `POST /api/benchmark`·`GET /api/benchmark?id=`가 단일 토큰으로 파일에 존재하지 않아 grep 검증이 0건으로 실패
- **Fix:** 기존 파일 주석 스타일(`# 기획안 검토 조회 (위 응답에서 받은 id 사용)`)과 동일하게 `# POST /api/benchmark — 분석 작업 생성` / `# GET /api/benchmark?id= — 작업 상태 폴링`으로 주석 교체. curl 명령·요청 body·응답 예시는 계획 스케치와 동일 (내용 변경 없음)
- **Files modified:** `ENVIRONMENT-GUIDE.md`
- **Commit:** `9306ebe`

**2. [Rule 2 - Tooling availability] gsd-sdk 부재 → STATE.md 수동 갱신**

- **Found during:** 실행 완료 후 상태 갱신 단계
- **Issue:** `gsd-sdk` CLI가 PATH/`node_modules`에 없어 `state.advance-plan`·`state.record-metric`·`roadmap.update-plan-progress`·`requirements.mark-complete` 호출 불가
- **Fix:** 기존 Wave 1 커밋(`docs(7-01)`)과 동일한 방식으로 STATE.md를 수동 편집(Current Phase·Status·Artifact Inventory·Next Actions·Git History·Version History). ROADMAP.md는 Phase 7 섹션에 플랜별 진행표가 없어 갱신 대상 없음. REQUIREMENTS.md는 R34 섹션 확인 결과 — 체크박스 메커니즘이 없고(상태 컬럼은 계획 표기 "신규") Wave 1과 동일하게 미변경 유지
- **Files modified:** `.planning/STATE.md` (및 R34 상태 확인)
- **Commit:** 최종 docs 커밋에 포함

## Known Stubs

없음. `vercel.json`의 `@apify-api-token`/`@openai-api-key`는 Vercel 대시보드 레퍼런스(센티널)로서 git에 키 값을 저장하지 않는 의도된 메커니즘 — 실제 값 설정은 사용자 키 체크포인트에서 수행. `ENVIRONMENT-GUIDE.md`의 `your-app.vercel.app`은 기존 문서와 동일한 자리표시자 도메인.

## Threat Flags

없음. 신규 env 엔트리는 @-sentinel 레퍼런스로 키 값이 저장소에 노출되지 않으며, `maxDuration`·문서 추가는 네트워크 엔드포인트·인증 경로·파일 접근 패턴 변경이 아님. 실 API 서버리스 함수(`api/benchmark.js`)는 Wave 1에서 이미 검토됨.

## 잔존 위험

1. **실 배포 무검증** — `functions.maxDuration`이 Vercel에 실제 적용되는지, env 센티널이 배포 파이프라인에서 정상 해석되는지는 사용자 키 설정 + 재배포 전까지 [검증불가]. 복구 계획: 키 체크포인트 후 `vercel deploy` + `curl -i`로 201/폴링 응답 확인.
2. **maxDuration 300s와 Apify run 최대 소요의 정합성** — Wave 1 구현은 GET 폴링당 단위 작업이라 개별 GET이 300s를 넘지 않는 설계이지만, transcribing 배치(2개) 전사 시간이 길면 근접 가능. 복구 계획: 실 E2E에서 GET 응답 시간 측정 후 필요 시 배치 축소(Wave 1 파라미터).
3. **비용 수치 추정치** — `$0.13~0.16`은 Apify resultsLimit 30·바이럴 5개·60초 릴스 기준 추정치로, 릴스 길이·전사 성공률에 따라 편차. 복구 계획: 실 API E2E에서 실제 청구 지표 수집 후 문서 수치 갱신.
4. **Wave 2(frontend 탭) 미완** — 본 Wave 3는 병렬 실행으로 완료되었으나 탭 UI·폴링 클라이언트(Wave 2)가 아직 없어 엔드포인트 문서는 코드 소비처 없이 대기 상태. 복구 계획: Wave 2 실행 후 브라우저 E2E.

## Self-Check: PASSED

| 확인 항목 | 결과 |
|-----------|------|
| `.planning/phases/07-benchmark-analyzer/03-config-docs-SUMMARY.md` 존재 | FOUND |
| 커밋 `cdfe74f` 존재 (`git log --oneline --all \| grep`) | FOUND |
| 커밋 `9306ebe` 존재 (`git log --oneline --all \| grep`) | FOUND |
| `vercel.json` JSON 재검증 (self-check 시점) | node `JSON.parse` 성공 |
| STATE.md 5개 섹션 갱신 (Current Phase·Status·Inventory·Next Actions·Git History·Version History) | 편집 적용 + 최종 커밋 시 diff 확인 |
