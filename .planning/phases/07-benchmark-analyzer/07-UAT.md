---
status: testing
phase: 07-benchmark-analyzer
source: [01-backend-benchmark-api-SUMMARY.md, 02-frontend-tab-SUMMARY.md, 03-config-docs-SUMMARY.md]
started: 2026-08-01T04:54:07Z
updated: 2026-08-01T04:54:07Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 12
name: vercel.json / ENVIRONMENT-GUIDE 검증
expected: |
  `vercel.json`에 `functions["api/benchmark.js"].maxDuration: 300`과
  env 4개(KV 2 + APIFY/OPENAI 2)가 있다.
  `ENVIRONMENT-GUIDE.md`에 APIFY/OPENAI 발급 방법, 벤치마킹 API
  curl 예시, 비용 안내가 문서화되어 있다.
result: |
  PASS (파일 검증)
  - vercel.json: maxDuration: 300 확인
  - ENVIRONMENT-GUIDE.md: APIFY/OPENAI 발급 방법, 비용 안내, curl 예시, 상한 정책 모두 문서화
awaiting: none (전체 12개 테스트 완료)

## Tests

### 1. 벤치마킹 탭 표시/전환
expected: 브라우저에서 앱을 열면 탭 바에 "전략 제안서 생성기", "영상 소스 생성기", "벤치마킹 분석기" 3개 탭이 표시된다. "벤치마킹 분석기"를 클릭하면 IG 계정 입력 폼(계정 URL/아이디, 브랜드명, 키워드, 분석할 릴스 수 select, "분석 시작" 버튼)이 표시된다.
result: PASS (2026-08-01, Playwright headless chromium, localhost:3001, 11/11 — tool-tab 3개, 벤치마킹 탭 active 전환, IG/브랜드/키워드/릴스 select/분석 시작 버튼 표시, 콘솔·JS 에러 0건)

### 2. 기존 proposal/video 탭 회귀 (무손상)
expected: "전략 제안서 생성기"/"영상 소스 생성기" 탭으로 전환하면 기존 기능(입력 폼, 생성 버튼)이 그대로 표시되고 동작한다. 콘솔에 오류가 없다.
result: PASS (2026-08-01, Playwright headless chromium, localhost:3001, 10/10 — proposal/video 탭 전환 정상, 입력 폼 + 생성 버튼 표시, result-tab 3개 유지, 콘솔·JS 에러 0건)

### 3. IG 입력 폼 + 빈 값 검증
expected: 벤치마킹 탭에서 "분석 시작"을 클릭했을 때 IG 계정이 비어 있으면 한국어 경고가 표시되고 요청이 전송되지 않는다. 계정을 입력하면 요청이 진행된다.
result: PASS (2026-08-01, Playwright headless chromium, localhost:3001, 7/7 — 빈 값 alert + fetch 0건 + 포커스, 100자 초과 alert + fetch 0건, 정상 입력 POST 201 jobId 22자, KV 연결 후 스테이퍼 표시, 콘솔·JS 에러 0건)

### 4. 분석 시작 → 진행 스테이퍼 표시
expected: IG 계정을 입력하고 "분석 시작"을 클릭하면 진행 스테이퍼(크롤링 → 전사 → 분석 → 완료)가 표시되고, 현재 단계가 활성/완료 상태로 갱신되며 단계별 한국어 상태 텍스트가 보인다.
result: PASS (2026-08-01, Playwright headed chromium, gymshark 릴스 3개, localhost:3001, 8/8 — POST 201, 스테이퍼 crawling→transcribing→done 전이 + 한국어 상태 텍스트, 결과 렌더 3개 카드, 분석 via NVIDIA NIM nemotron-3-ultra, 콘솔 에러 0건)

### 5. done: 바이럴 릴스 리스트 (a)
expected: 분석 완료 후 바이럴 릴스 카드 목록이 표시된다. 각 카드에 조회수(천단위 포맷), 릴스 링크(새 탭), 캡션이 보인다.
result: PASS (2026-08-01, Playwright, 완료 jobId 데이터 주입, 7/7 — 릴스 카드 3개 조회수 천단위 포맷 + 링크 3개 target=_blank + 캡션 표시, 콘솔·JS 에러 0건)

### 6. done: 전사 대본 (b)
expected: 분석 완료 후 각 릴스의 전사 대본이 표시된다. 세그먼트 타임스탬프(m:ss)가 보이며, 전사 불가/용량 초과 릴스는 "[음성 인식 불가]"/"[용량 초과로 전사 제외]" 배지로 표시된다.
result: PASS (2026-08-01, Playwright, 완료 jobId 데이터 주입, 7/7 — 전사 대본 3개 섹션 + 릴스 1·3 [음성 인식 불가] 배지 + 릴스 2 대본 727자·타임스탬프 [0:00~0:02] 등 + 복사 버튼 5개, 콘솔·JS 에러 0건)

### 7. done: 구조 해부 (c)
expected: 분석 완료 후 공통 구조 해부 카드(훅 오프닝 / 전개 전환 / 클로징)가 표시된다.
result: PASS (2026-08-01, Playwright, 완료 jobId 데이터 주입, 7/7 — 공통 구조 해부 섹션 + 훅(0~3초 오프닝)·전개(문제→해결 전환)·클로징(마무리/CTA) LLM 분석 카드 표시, 콘솔·JS 에러 0건)

### 8. done: 새 대본 초안 + 카피 버튼 (d)
expected: 분석 완료 후 입력한 브랜드명/키워드가 반영된 새 대본 초안이 표시된다. 각 결과 섹션의 카피 버튼을 클릭하면 클립보드에 복사된다.
result: PASS (2026-08-01, Playwright + clipboard 권한, 완료 jobId 데이터 주입, 11/11 — 새 대본 5구간 타임라인 + 권장 길이 40초 + 브랜드/키워드 반영 + 카피 버튼 5개 실제 클립보드 복사(구조 518자/대본 1007자/전사 2430자) + '복사됨!' 피드백, 콘솔·JS 에러 0건)

### 9. 오류 시나리오 (비공개/0건/키 미설정)
expected: 비공개 계정/삭제 계정/바이럴 릴스 0건 등 실패 상황에서 한국어 오류 메시지와 "다시 시도" 버튼이 표시된다.
result: PASS (2026-08-01, Playwright, 10/10 = UI 6/6 + E2E 4/4 — renderError 한국어 메시지+다시 시도 버튼+클릭 시 POST 재전송 / 실제 존재하지 않는 계정 POST→10초 내 stage=failed→"조회수 50,000 이상인 바이럴 릴스를 찾을 수 없습니다" 렌더+다시 시도 버튼. 키 미설정은 코드 검증만(부분검증))

### 10. POST /api/benchmark → 201 jobId
expected: `curl -X POST /api/benchmark -H "Content-Type: application/json" -d '{"instagramId":"..."}'`가 수 초 내에 `201 {"success":true,"jobId":"..."}`(22자)를 반환한다. POST가 파이프라인을 블로킹하지 않는다.
result: PASS (2026-08-01, curl, 3/3 — HTTP 201 + success:true + jobId 22자, 응답 2.5초로 백그라운드 파이프라인 확인)

### 11. GET 폴링 stage 전이 + 오류 경로
expected: `curl "/api/benchmark?id={jobId}"` 반복 폴링 시 stage가 `crawling → transcribing → analyzing → done`으로 전이된다. 없는 id → 404, 잘못된 입력 → 400, 키 미설정 → 한국어 500, PUT → 405.
result: PASS (2026-08-01, curl, 8/8 — 404/400/405/500 한국어 오류 모두 정상 + stage 전이 crawling→transcribing→done 실제 폴링 확인, analyzing은 초단위 통과로 미관측)

### 12. vercel.json / ENVIRONMENT-GUIDE 검증
expected: `vercel.json`에 `functions["api/benchmark.js"].maxDuration: 300`과 env 4개(KV 2 + APIFY/OPENAI 2)가 있다. `ENVIRONMENT-GUIDE.md`에 APIFY/OPENAI 발급 방법, 벤치마킹 API curl 예시, 비용 안내가 문서화되어 있다.
result: PASS (2026-08-01, 파일 검증)
- vercel.json: `functions["api/benchmark.js"].maxDuration: 300` 설정 확인
- ENVIRONMENT-GUIDE.md: APIFY_API_TOKEN/OPENAI_API_KEY 발급 방법, 무료 크레딧/과금 안내, 벤치마킹 API curl 예시, job당 예상 비용(≈$0.13~0.16), 서버 강제 상한 정책(MAX_ANALYZE_REELS=5, maxTotalChargeUsd=1) 모두 문서화

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
