# CONTEXT — Phase 7: 벤치마킹 대본 분석기 (Benchmark Script Analyzer)

> Created: 2026-08-01
> Status: Planning draft — 구현 전 (승인 대기)

---

## Overview

Phase 7은 "벤치마킹 대본 분석기"(가칭)라는 새 도구 탭을 추가하는 단계입니다.
벤치마킹하고 싶은 인스타그램 계정을 입력하면 다음 5단계 파이프라인이 동작합니다:

1. **크롤링:** Apify Instagram Reel Scraper로 해당 계정의 릴스 크롤링
2. **필터링:** 조회수 기준 바이럴(터진) 릴스만 선별
3. **전사:** OpenAI Whisper API로 음성 → 텍스트 대본 변환
4. **분석:** 여러 릴스 대본의 공통 구조(훅 오프닝/전개 전환/클로징)를 AI로 해부
5. **재조립:** 분석된 구조를 템플릿으로 삼아 새 키워드/브랜드로 새 대본 초안 생성

기존 "전략 제안서 생성기" 탭과는 **독립적으로 동작**하되, 분석된 구조 데이터를
나중에 제안서 생성 플로우의 근거 자료로 가져다 쓸 수 있는 연동 포인트(데이터
형식/저장 위치)만 열어둔다. 지금 당장 양방향 연동은 구현하지 않는다.

---

## Current State

### Completed Phases (Milestone v1 완료)
- Phase 1: UI 골격 + 입력 필드 확장 ✓
- Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF ✓
- Phase 3: 당위성 엔진 + 설득형 제안서 문서화 ✓ (핵심 Phase)
- Phase 4: Claude API 자동화 ✓
- Phase 5: 영상 소스 생성기 (내부용 재료 도구) ✓
- Phase 6: 두 도구 연결 + 통합 테스트 + Vercel 배포 ✓

### 기존 탭 구조 (수정 금지 — Phase 7은 추가만)
- `index.html`의 `.tool-tabs`에 2개 탭 존재:
  - `data-tab="proposal"` — 전략 제안서 생성기
  - `data-tab="video"` — 영상 소스 생성기
- `state-manager.js`의 `switchTab()`, `tabState`가 탭 상태 관리 (proposal | video)

---

## Key Files

| File | Description | Phase 7 관계 |
|------|-------------|-------------|
| `index.html` | 메인 HTML — 탭 네비게이션 + 도구 컨테이너 | 벤치마킹 탭 추가 (신규 탭 버튼 + 컨테이너) |
| `app.js` | 메인 애플리케이션 로직 | 벤치마킹 탭 전환/초기화 로직 (추가) |
| `state-manager.js` | 전역 상태 관리 + 탭 상태 | 벤치마킹 탭 상태 추가 (추가) |
| `style.css` | 스타일 | 벤치마킹 UI 스타일 (추가) |
| `api/generate.js` | Claude API 서버리스 함수 | 구조 분석/재조립에서 Claude 재사용 가능성 |
| `api/research.js` | Tavily 자동 조사 | 폴링/job-status 패턴 검토 대상 |
| `api/review.js` | Vercel KV CRUD | job-status 패턴(비동기 작업 상태 저장) 참조 대상 |
| `vercel.json` | Vercel 배포 설정 | 벤치마킹 API 라우팅 추가 |
| `ENVIRONMENT-GUIDE.md` | 환경변수 가이드 | APIFY_API_TOKEN, OPENAI_API_KEY 추가 (계획) |

---

## Dependencies

- Phase 6 완료 후 실행 가능 (기존 탭 구조 위에 추가)
- 신규 외부 서비스 의존성:
  - **Apify API 토큰** (`APIFY_API_TOKEN`) — Instagram Reel Scraper actor 실행
  - **OpenAI API 키** (`OPENAI_API_KEY`) — Whisper 음성 전사 (기존 ANTHROPIC_API_KEY와 별개)
- 기존 탭(proposal/video)의 파일은 **수정하지 않는 것**을 원칙으로 함 (additive)
  - 예외: 탭 바에 신규 탭 버튼 1개 추가 + state-manager 탭 목록 확장은 구조상 불가피

---

## Technical Constraints

1. **Vercel 서버리스 함수 실행 시간 제한** — Hobby 플랜 기본 10초 내외, Pro도 수 분 한계.
   크롤링(Apify run은 원격 비동기지만 수 분 소요) → 전사(Whisper, 오디오 길이에 비례)
   → 분석(Claude 호출)을 하나의 요청으로 처리하면 타임아웃 위험.
   → 단계별 API + job-status 폴링 패턴 설계 필요.
2. **Apify Actor는 비동기 작업** — run 생성 → 상태 폴링 → dataset fetch 구조.
   `api/review.js`의 KV 패턴 + 클라이언트 폴링으로 재사용 가능성 검토.
3. **비용 상한** — Apify 크레딧, Whisper 과금(분당)을 감안해 "분석할 릴스 개수" 상한 정책 필요.
4. **API 키 보안** — 프론트엔드 노출 금지 (기존 규칙 유지, 서버 사이드 전용).
5. **한국어 UI** — 모든 표시 텍스트 한국어 (기존 규칙 유지).
6. **바닐라 HTML/CSS/JS** — 프레임워크 도입 금지 (기존 규칙 유지).

---

## Success Metrics

- "벤치마킹 분석기" 탭이 기존 2개 탭과 함께 표시되고 전환 동작
- IG 계정 URL/아이디 입력 → (a) 바이럴 릴스 리스트(조회수 포함) 출력
- (b) 각 릴스 전사 대본 출력
- (c) 공통 구조 해부 분석(훅/전개/클로징) 출력
- (d) 분석 구조 기반 새 대본 초안 출력
- Apify/Whisper 호출이 Vercel 타임아웃 없이 완료 (단계별 처리)
- "분석할 릴스 개수" 상한이 적용되어 비용이 통제됨

---

## Deliverables (사용자 요청)

1. `.planning/ROADMAP.md`에 Phase 7 항목 초안
2. `.planning/REQUIREMENTS.md`에 신규 요구사항 (기존 R27 다음 번호 R28~)
3. 기능 필요 이유 + Phase 3(전략 제안서)와의 관계 근거 섹션 (1~2문단)
4. 5단계 파이프라인을 Plan 단위로 쪼갠 실행 계획 (파일 범위 + 완료 기준)
5. 리스크 목록 (IG 크롤링 정책 변화, Apify 비용, Whisper 정확도, Vercel 타임아웃 등)
