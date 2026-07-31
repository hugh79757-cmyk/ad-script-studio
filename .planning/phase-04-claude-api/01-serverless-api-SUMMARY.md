# Phase 4 Plan 1: 서버리스 API Summary

> Vercel 서버리스 함수에서 Anthropic Claude API 호출 — 26 마케팅 원칙 시스템 프롬프트 주입

## Meta

| Field | Value |
|-------|-------|
| Phase | 4 |
| Plan | 1 |
| Subsystem | Backend / API |
| Tags | serverless, claude-api, vercel, marketing-principles |
| Duration | ~2분 |
| Completed | 2026-07-31 |

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | api/generate.js 생성 | 667eca3 | `api/generate.js` |
| 2 | vercel.json 설정 | 667eca3 | `vercel.json` |

## Dependency Graph

| Relation | Target |
|----------|--------|
| requires | Phase 3 (당위성 엔진) |
| provides | POST /api/generate 엔드포인트 |
| affects | 프론트엔드 auto 모드 (Wave 2에서 연결) |

## Tech Stack

### Added
- **@vercel/node**: Serverless 런타임 (API 라우팅)
- **Anthropic Messages API**: `claude-sonnet-4-20250514` 모델 사용
- **26 마케팅 원칙**: `shortform-copywriting.md` 기반 시스템 프롬프트 주입

### Patterns
- Vercel Serverless Function (Node.js 런타임)
- CORS preflight 핸들링 (OPTIONS + POST)
- 지수 백오프 재시도 (rate limit 대응)
- JSON 응답 파싱 (```json 블록 + 직접 파싱)

## Key Files

### Created
- `api/generate.js` — Claude API 호출 서버리스 함수
  - `buildSystemPrompt(inputs)`: 26원칙 + 입력값 컨텍스트 시스템 프롬프트
  - `generateUserPrompt(inputs, mode)`: 사용자 프롬프트 생성
  - `parseApiResponse(data)`: JSON 블록 추출 + 구조화된 결과 반환
  - `withRetry(fn, maxRetries)`: 지수 백오프 재시도
  - `handler(req, res)`: 메인 핸들러 (CORS, 검증, 에러 핸들링)
- `vercel.json` — Vercel 배포 설정
  - `api/**/*.js` → `@vercel/static` 빌드
  - `skills/**` → 정적 파일 서빙
  - SPA fallback 라우팅

## Decisions Made

1. **시스템 프롬프트에 26원칙 하드코딩**: 파일 시스템 읽기 대신 런타임 fetch 없이 원칙을 인라인. 서버리스 함수의 냉 시작 시간 단축 및 안정성 확보.
2. **claude-sonnet-4-20250514 모델 사용**: plan에서 지정한 대로 적용.
3. **CORS `*` 허용**: 로컬 개발 편의성 우선. 프로덕션에서 도메인 제한 필요 시 업데이트.
4. **SPA fallback 라우팅**: `/(.*)` → `index.html`으로 모든 경로를 index.html로 리다이렉트.

## Deviations from Plan

None — plan대로 실행됨.

## Known Stubs

- **api/generate.js**: `ANTHROPIC_API_KEY` 환경변수가 Vercel에 설정되지 않으면 500 에러 반환. Wave 2에서 프론트엔드 연결 시 Vercel 대시보드에서 Secret 설정 필요.

## Threat Flags

None — API 키는 서버 사이드에서만 사용, 프론트엔드에 노출되지 않음.

## Verification

- [✅] `api/generate.js` 존재 및 handler 함수 export 확인
- [✅] `vercel.json` 존재 및 유효한 JSON 확인
- [✅] 문법 검사 통과 (`node --check`)
- [✅] 26개 마케팅 원칙 시스템 프롬프트에 포함 확인
- [✅] CORS 헤더 설정 확인
- [✅] 에러 핸들링 (405, 400, 500, 429, 529) 확인

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| api/generate.js exists | FOUND |
| vercel.json exists | FOUND |
| Commit 667eca3 exists | FOUND |
| No unexpected file deletions | CONFIRMED |
