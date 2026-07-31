# PLAN — Phase 4: Claude API 자동화

> Created: 2026-07-31
> Phase: 4
> Requirements: R11, R12, R13

---

## Goal

Vercel 서버리스 함수에서 Anthropic Claude API를 호출하여 광고 기획안을 자동 생성하고, 수동/자동 모드 전환이 동작함

---

## Success Criteria

- [ ] Vercel 서버리스 함수 `/api/generate`에서 Anthropic API 호출
- [ ] API 키가 프론트엔드에 노출되지 않음 (환경변수 관리)
- [ ] "생성" 버튼 클릭 시 API 호출 → 로딩 스피너 → 결과 표시
- [ ] 수동 모드 ↔ 자동 모드 토글 스위치 동작
- [ ] 자동 모드에서 Phase 3의 당위성 엔진이 진짜 논리적 근거를 생성

---

## Waves

### Wave 1: 서버리스 함수 + 설정

**Plan文件:** `01-serverless-api.PLAN.md`

**Tasks:**
1. `api/generate.js` — Vercel 서버리스 함수 생성
   - Anthropic Claude API 호출 (claude-sonnet-4-20250514)
   - 시스템 프롬프트에 shortform-copywriting.md (26원칙) 주입
   - 입력값 (브랜드명, 상품명, 타겟, 컨셉, 톤앤매너, 리뷰, 경쟁사 등) 컨텍스트로 전달
   - 당위성 근거 자동 생성 로직 (수동 모드의 정형 문구와 차별화)
   - 에러 핸들링 + 재시도 로직
   - API 키는 `ANTHROPIC_API_KEY` 환경변수로 관리

2. `vercel.json` — Vercel 설정
   - Serverless functions 라우팅 설정
   - API 엔드포인트 매핑

**Dependencies:** None (first wave)

---

### Wave 2: 프론트엔드 API 호출 + 모드 전환

**Plan文件:** `02-frontend-integration.PLAN.md`

**Tasks:**
1. `app.js` 업데이트 — API 호출 로직 추가
   - 자동 모드: "생성" 버튼 클릭 → `/api/generate` POST 호출
   - 로딩 스피너 표시
   - 결과 수신 후 렌더링
   - 에러 처리 + 사용자 피드백

2. `app.js` 업데이트 — 모드 전환 UI
   - 수동 모드 ↔ 자동 모드 토글 스위치
   - 모드 상태 관리 (appState.mode)
   - 수동 모드: 기존 템플릿 기반 로직 유지
   - 자동 모드: API 호출 로직 활성화

3. `index.html` 업데이트 — 모드 전환 UI 추가
   - 토글 스위치 컴포넌트
   - 모드 상태 표시

4. `style.css` 업데이트 — 로딩 스피너 + 모드 전환 스타일

**Dependencies:** Wave 1 완료 후

---

## Requirements Mapping

| Requirement | Task | Wave |
|-------------|------|------|
| R11: Vercel 서버리스 함수에서 Anthropic Claude API 호출 | api/generate.js | 1 |
| R12: API 키 서버 사이드 관리 | api/generate.js + vercel.json | 1 |
| R13: 수동 모드 ↔ 자동 모드 전환 | app.js + index.html | 2 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Vercel 서버리스 CWD for skill file access | shortform-copywriting.md 내용을 시스템 프롬프트에 직접 번들링 |
| Claude API rate limits | 재시도 로직 + exponential backoff |
| API 키 노출 | 서버리스 함수에서만 호출, 프론트엔드에 키 전달 금지 |

---

## Verification Plan

- gsd-verifier: "API 자동화가 동작하는가?" → 자동 모드에서 입력 후 생성 → 결과 표시 확인
- gsd-security-checker: API 키 미노출 확인 (네트워크 탭에서 프론트엔드 요청에 키 없음)
