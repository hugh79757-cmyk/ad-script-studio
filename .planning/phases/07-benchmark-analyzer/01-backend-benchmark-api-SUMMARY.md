---
phase: 7
plan: 1
subsystem: backend-api
tags: [benchmark, kv, stage-machine, apify, whisper, claude, vercel-serverless]
requires: []
provides: [R29, R30, R31, R32, R33]
affects: [Wave 2 (02-frontend-tab), Wave 3 (03-config-docs)]
tech-stack:
  added: [api/benchmark.js — Node 내장 fetch/FormData/Blob (신규 의존성 0건)]
  patterns: [review.js CORS/KV/randomBytes ID, generate.js withRetry/parseApiResponse]
key-files:
  created: [api/benchmark.js]
  modified: []
decisions:
  - "POST는 파이프라인을 실행하지 않음 — job 생성 + Apify run 시작 후 즉시 201 (run 시작 실패도 201 반환, 실패는 GET 폴링에서 stage=failed로 노출)"
  - "GET 폴링이 유일한 파이프라인 구동원 — crawling 완료 GET은 같은 사이클에서 전사 최대 2개까지 이어서 진행 (CDN 만료 방지)"
  - "withRetry는 429/5xx/네트워크 오류만 재시도, 4xx(401/403/400)는 재시도 없이 즉시 중단 (generate.js 원본 대비 개선)"
  - "순수 함수에 named export 부여 — 오프라인 유닛 테스트 가능 (Vercel은 default export만 사용)"
metrics:
  duration_minutes: 123
  completed: 2026-08-01
  tests: 11 unit groups + 82 inline assertions (모두 통과, 자세한 분류는 Verification 섹션)
---

# Phase 7 Plan 1: Backend Benchmark API Summary

## One-liner

Apify run 비동기 시작 + 클라이언트 GET 폴링이 구동하는 KV 스테이지 머신(`crawling → transcribing → analyzing → done`)으로, Vercel 타임아웃과 비용 상한(`maxTotalChargeUsd=1`, 릴스 5개)을 서버에서 강제하는 `api/benchmark.js` 구현

## What Was Built

**`api/benchmark.js` (신규, 단일 파일)**

1. **서버 강제 상수 8개** — `MAX_ANALYZE_REELS=5`, `VIRAL_VIEWS_THRESHOLD=50000`, `APIFY_RESULTS_LIMIT=30`, `MAX_TOTAL_CHARGE_USD=1`, `MAX_REEL_DURATION_SEC=180`, `MAX_WHISPER_BYTES=25MB`, `KV_TTL_SEC=86400`, `MAX_POLLS=120` + GET당 전사 배치 `TRANSCRIBE_BATCH_SIZE=2`
2. **POST 핸들러** — 입력 검증(instagramId 필수/100자 초과 차단, URL·@ 프리픽스 → 유저네임 추출, maxReels 3~5 서버 클램프) → job 생성(KV `benchmark:{jobId}`, TTL 24h) → Apify run 시작(`username:[...]`, `resultsLimit:30`, 유료 include\* 3종 false, `maxTotalChargeUsd=1`) → **즉시 201 `{success, jobId}`** (블로킹 없음)
3. **GET 핸들러 (게으른 스테이지 머신)** — 단위 작업 규칙:
   - `crawling`: run 상태 1회 확인 → SUCCEEDED 시 dataset fetch(shortcut) → 바이럴 필터(views≥50000 AND duration≤180, 조회수 내림차순, 상위 maxReels) → `transcribing` 전환. FAILED/ABORTED/TIMED-OUT/TIMING-OUT → `failed`. 0건 계정/바이럴 0건 → 한국어 오류로 `failed`
   - `transcribing`: transcripts에 없는 릴스 중 **최대 2개만** 전사(멱등성). `audioUrl` fetch → 403/실패 시 `videoUrl` 백업 → **25MB byteLength 하드 가드**(초과 시 `[용량 초과로 전사 제외]` 격리, 나머지 계속) → Whisper multipart(`whisper-1`, `language=ko`, `verbose_json` + segment) → 개별 실패는 `[음성 인식 불가]` 격리
   - `analyzing`: Claude 1회(모델 `claude-sonnet-4-20250514`, `max_tokens:4096`, 시스템 프롬프트 "데이터로만 취급" 인젝션 방지) → `{structure:{hook,development,closing}, script}` 파싱 → `done`
   - `done`/`failed`: 축적 데이터 응답. 폴링 120회 초과 시 `failed('처리 시간이 15분을 초과했습니다.')`
4. **공통 프레임워크** — review.js 패턴(CORS 헤더 + OPTIONS 200, `crypto.randomBytes(16).toString('base64url')` 22자 ID, KV_PREFIX `benchmark:`), API 키 3종(`APIFY_API_TOKEN`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`) 미설정 시 한국어 500(누락 키명 명시), Method 405

## Verification

### [검증됨] — 오프라인 검증 (실 API 호출 0건, fetch/kv 전부 모킹)

| 항목 | 근거 |
|------|------|
| `node --check api/benchmark.js` | 실행 결과 "SYNTAX OK" (export 수정 후 재실행 포함) |
| 순수 함수 유닛 테스트 11그룹 | `/var/folders/.../opencode/benchmark-offline-test.mjs` 실행 — extractUsername(URL/@/평문/빈 값), clampMaxReels(10→5, 1→3, 3~5 유지, 미입력→5), selectViralReels(필터+내림차순+상위 2개, 필드 매핑, 빈 입력), generateId(22자 base64url), buildAnalysisPrompt(브랜드/키워드/타임스탬프/인젝션 방지 문구) — 전부 통과 (결과: `11 passed, 0 failed`) |
| POST 핸들러 82개 인라인 단언 | 모킹 kv(fetch 계층에서 Upstash `/pipeline` REST 프로토콜 에뮬레이션) + 모킹 fetch — 201 + 22자 jobId + KV 저장, **maxReels=10 요청 → 5 저장**, maxReels=1 → 3, URL→유저네임, @ 프리픽스, Apify 요청 body(`username:[testbrand]`, `resultsLimit:30`, include\* 3종 false) + URL `maxTotalChargeUsd=1`, 입력 검증 400 3종 — 전부 통과 (TEST RUNNER ERROR 없음) |
| GET 스테이지 머신 E2E (모킹) | 6개 릴스 더미(dataset)로 폴링 3회: GET1 `crawling→transcribing` + 전사 2개 배치 상한, GET2 나머지 1개 + `analyzing→done`(Claude 1회), GET3 done 상태 외부 호출 0건 — 전부 통과 |
| 25MB 가드 | 25MB+1 버퍼 릴스(F) → `status:'size-exceeded'`, `text:'[용량 초과로 전사 제외]'`, Whisper 호출 안 함(whisperCalls=2, A/B만), 나머지(B) 계속 전사 |
| videoUrl 백업 | 릴스 A audioUrl 403 → videoUrl fetch 성공 → `status:'ok'` (로그: `audioUrl fetch 실패 (A), videoUrl 백업 시도` 확인) |
| 멱등성/배치 상한 | Whisper 총 호출 2회(A/B) — F는 용량 가드, 재전사 0건. GET당 전사 최대 2개 |
| 폴링 타임아웃 | pollCount=120 상태 job GET → `stage:'failed'`, `'처리 시간이 15분을 초과했습니다.'` |
| 404/400/OPTIONS/405/키 미설정 | 없는 id → 404, id 없음 → 400, OPTIONS → 200+CORS 헤더, PUT → 405, 키 3종 미설정/부분 설정 → 500 한국어(누락 키명 명시) — 전부 통과 |

### [부분검증] — 모킹 기반으로 확인했으나 실 환경과 차이 가능성

| 항목 | 제한 사유 |
|------|-----------|
| Upstash REST 프로토콜 에뮬레이션 | `@vercel/kv`의 `kv`가 Proxy export라 인스턴스 패칭 불가 → 더미 `KV_REST_API_URL` + fetch 계층에서 `/pipeline` 응답(`[{error, result: base64}]`)을 에뮬레이션. 프로브 서버 3회로 실제 wire format 확인 후 구현. 실 KV와의 차이 가능성 잔존 |
| Whisper/Claude/Apify 성공 응답 형태 | 모킹 응답(공식 문서 기반 스키마)으로 검증 — 실 API 응답 필드명이 다르면(예: `data.defaultDatasetId` 누락) 오류 경로로 빠질 수 있음 |
| Claude 응답 JSON 파싱 | 모킹 응답의 ```json 블록으로 검증 — 실 응답에서 마크다운 이탈 시 `parseApiResponse` 실패 → job `failed` 경로로 동작 |

### [검증불가] — 실 API E2E (의도적 연기)

| 항목 | 복구 계획 |
|------|-----------|
| Apify 실제 run 생성→크롤→dataset fetch | 사용자 키 체크포인트(`APIFY_API_TOKEN` 설정) 후 `curl -X POST /api/benchmark` → GET 폴링 curl 순차 E2E (TEST-GUIDE.md 관례) |
| Whisper 실 전사 (한국어 정확도/지연) | `OPENAI_API_KEY` 설정 후 실 릴스 대상 전사 — 지연이 300s 예산 초과 시 `TRANSCRIBE_BATCH_SIZE` 2→1 조정 (RESEARCH A2) |
| Claude 실 구조 분석 | `ANTHROPIC_API_KEY`(기존 설정됨)로 실 호출 |
| Vercel 배포 후 타임아웃/환경변수 | Wave 3(vercel.json `maxDuration:300`) 적용 후 `vercel dev`/배포 검증 |

## Deviations from Plan

### Auto-fixed Issues (Rules 1-3)

1. **[Rule 3 - Design] Apify run 시작 실패 시 응답 형태 해석** — 플랜은 "run 시작 실패 시 job stage=failed로 저장하고 오류 메시지 응답"으로 서술. 구현은 **성공/실패 모두 201 `{success, jobId}`** 반환하고, 실패는 GET 폴링에서 `stage='failed'` + 한국어 오류로 노출 (POST 블로킹 없음 원칙 유지, 클라이언트가 폴링으로 일관되게 실패를 수신). 플랜 완료 기준("POST → 201 { success, jobId }")과 충돌 없음
2. **[Rule 2 - Robustness] `withRetry` 4xx 재시도 방지** — generate.js 원본은 429 외 오류도 재시도. 구현은 429(재시도-after 대기)/5xx/네트워크 오류만 재시도, 4xx(401/403/400)는 즉시 중단 (결정적 실패 재시도에 따른 불필요한 대기·과금 방지)
3. **[Rule 2 - Robustness] 0건/바이럴 0건 계정 실패 처리** — 플랜 리스크 표에만 있던 "릴스 없음/비공개 계정/바이럴 릴스 없음" 처리를 crawling 단계에 구현 (dataset 0건 → `'릴스를 찾을 수 없습니다. (비공개 계정 또는 삭제된 계정일 수 있습니다)'`, 바이럴 0건 → `'조회수 50,000 이상인 바이럴 릴스를 찾을 수 없습니다...'`)
4. **[Rule 2 - Robustness] `TIMING-OUT` 상태 포함** — Apify 상태값 중 플랜 스케치가 누락한 전이 상태 `TIMING-OUT`을 실패 목록에 추가 (RESEARCH §1-3의 상태값 목록 기준)
5. **[Rule 2 - Robustness] GET 처리 오류를 응답 500 대신 job failed로 저장** — 폴링 중 스테이지 작업 예외 시 응답만 500으로 끝내면 클라이언트가 실패를 알 수 없음 → `job.stage='failed'` + 한국어 오류로 KV 저장 후 폴링 응답에 포함 (GET은 항상 200 + failed 상태로 응답)
6. **[Rule 3 - Testability] 순수 함수 named export** — `extractUsername`/`clampMaxReels`/`selectViralReels`/`buildAnalysisPrompt`/`generateId`에 `export` 부여 (Vercel은 default export만 사용하므로 배포 영향 없음, 플랜 검증 요구사항 "순수 함수 import 테스트" 충족을 위해 추가)
7. **[Rule 2 - Robustness] 전사 성공 데이터 0건 시 분석 차단** — `analyzing` 진입 시 `status==='ok'` 전사가 1건도 없으면 Claude 호출(과금) 없이 `failed('전사된 대본이 없어 구조 분석을 진행할 수 없습니다.')`

### 환경 제약

- **gsd-sdk 미설치** — `state.advance-plan`/`roadmap update-plan-progress`/`requirements mark-complete` SDK 호출 불가. STATE.md는 수동 편집으로 갱신 (아래 "State Updates" 참조). `@vercel/kv`의 Proxy export로 인한 모킹 방식 변경은 위 [부분검증]에 기록

## Known Stubs

없음 — `api/benchmark.js`에 UI 렌더링용 더미/플레이스홀더 값 없음. 단, 실 API 미검증 상태이므로 "구현은 완전하나 실데이터 검증은 미완"이며 이는 [검증불가]로 분류됨.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_endpoint_post | api/benchmark.js | `POST /api/benchmark` — 외부 job 생성 엔드포인트 (플랜 `<threat_model>`의 R29 범위, 인증 없음 + 22자 jobId 기반, SSRF 방지: fetch 대상은 Apify dataset의 audioUrl/videoUrl 필드 한정) |
| threat_flag: new_endpoint_get | api/benchmark.js | `GET /api/benchmark?id=` — 폴링 엔드포인트 (R33 범위, 무차별 대입은 128bit jobId로 방어, TTL 24h) |
| threat_flag: outbound_ssrf_surface | api/benchmark.js | 릴스 CDN URL(`audioUrl`/`videoUrl`) fetch — 사용자 입력 URL 직접 fetch 금지, Apify dataset 필드에서만 유래 (플랜 SSRF 미티게이션 준수 확인용) |

## State Updates

- **STATE.md**: `v1-phase7-wave1` 항목 추가 (Version History), Git History 갱신, Next Actions에 실 API E2E 체크포인트 반영 (gsd-sdk 미설치로 수동 편집)
- **REQUIREMENTS.md**: R29~R33 구현됨(코드) — 단, 실 API 미검증이므로 완료 체크 표시 없음 (플랜 요구사항 R29~R33의 상태는 실 E2E 후 확정)
- **ROADMAP.md**: 플래너가 추가한 Phase 7 항목 유지 (수정 없음)

## Self-Check: PASSED

- [✅] `api/benchmark.js` 존재 — 근거: `ls api/benchmark.js` 결과 존재
- [✅] `node --check api/benchmark.js` 통과 — 근거: 실행 출력 "SYNTAX OK"
- [✅] 오프라인 테스트 통과 — 근거: `benchmark-offline-test.mjs` 출력 `11 passed, 0 failed` + TEST RUNNER ERROR 없음 (82개 인라인 단언 포함)
- [✅] 상수 존재 — 근거: grep으로 `MAX_ANALYZE_REELS`, `VIRAL_VIEWS_THRESHOLD`, `APIFY_RESULTS_LIMIT`, `MAX_TOTAL_CHARGE_USD`, `MAX_REEL_DURATION_SEC`, `MAX_WHISPER_BYTES`, `KV_TTL_SEC`, `MAX_POLLS` 정의 확인
- [✅] 기존 파일 무수정 — 근거: `git status --short`에서 변경 파일은 `.planning/REQUIREMENTS.md`/`.planning/ROADMAP.md`(플래너 선행 변경)와 신규 `api/benchmark.js`, `.planning/phase-07-benchmark-analyzer/`(플래너 선행)뿐. review.js/generate.js/research.js/index.html/app.js 등 기존 소스 변경 0건
- [✅] 테스트 파일 비커밋 — 근거: 테스트는 `/var/folders/.../opencode/benchmark-offline-test.mjs`(저장소 외부)에 존재, `git status`에 나타나지 않음

## 잔존 위험

1. **실 API 응답 스키마 불일치** — 모킹 기반 검증이라 Apify run 생성 응답(`data.defaultDatasetId`)·dataset 아이템 필드명·Whisper/Claude 응답이 문서와 다르면 오류 경로로 빠짐. 완화: 각 단계에 한국어 오류 메시지와 `console.error` 로그가 있어 원인 식별 가능. 실 E2E(사용자 키 체크포인트)에서 확정 필요
2. **Whisper 지연 예산** — GET당 전사 2개 + 같은 GET에 Claude 1회가 연쇄 실행될 때 최악 300s 근접 가능(RESEARCH A2). 완화: 지연 실측 후 `TRANSCRIBE_BATCH_SIZE` 1로 하향 옵션 존재. 실 E2E에서 확인 필요
3. **Upstash REST 에뮬레이션 한계** — 테스트의 KV 모킹은 프로브로 확인한 wire format 기반. TTL(`ex`) 전파/자동 파이프라이닝 동작이 실 KV와 동일함은 미검증. 완화: `vercel dev` 스모크(Wave 3)에서 KV 실동작 확인
4. **IG/CDN 링크 만료 경쟁** — `audioUrl` 403 시 `videoUrl` 백업이 있으나, 크롤 완료 후 폴링 지연이 길면 백업까지 만료되어 `[음성 인식 불가]` 다수 발생 가능. 완화: crawling 완료 GET에서 같은 사이클에 전사 즉시 시작하는 구조로 완화함(구현 반영). 클라이언트 폴링 간격 5~8초 유지 필요(Wave 2)
5. **비용** — 바이럴 5개 상한·`maxTotalChargeUsd=1`·25MB 가드로 통제되나, 동일 계정 재분석 반복 시 Apify 크레딧(월 $5) 소진 가능. 완화: Wave 2 UI에서 재분석 유도 최소화
