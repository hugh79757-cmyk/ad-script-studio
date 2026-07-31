# CONTEXT — Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF

## Goal
템플릿 기반 60초 숏폼 대본 생성 및 결과 카드 렌더링 — **대본은 제안서 안에 포함된 하나의 구성요소**로 설계

## Requirements
R5, R6, R7

## User Specification (의뢰자 상세 사항)

### R5: 템플릿 기반 60초 숏폼 광고 대본 생성

**Acceptance Criteria:**
- "생성" 버튼 클릭 시 템플릿 기반 60초 숏폼 대본이 결과 영역에 렌더링됨
- 대본은 타임라인(0:00-0:03 등) + 대사 + 연출지시 포함
- **대본 생성 로직은 축소된 비중으로 유지** — 최종 산출물인 제안서 PDF 내에서 "구현된 크리에이티브" 섹션으로 종속
- 단축 규칙 적용 (예: 60초 → 15초, 30초 변환)

### R6: PDF 다운로드

**Acceptance Criteria:**
- "PDF 다운로드" 버튼 클릭 시 jsPDF로 표준 PDF 생성 및 다운로드
- 클라이언트 사이드에서 PDF 생성 (서버 불필요)
- 한글 폰트 지원 필요 (CDN 방식)

### R7: 복사 / 새로 만들기 버튼

**Acceptance Criteria:**
- "복사" 버튼 클릭 시 대본 전체가 클립보드에 복사됨
- "새로 만들기" 버튼 클릭 시 입력/결과 초기화

## Architecture Decisions (from Phase 1)

- **프레임워크:** 바닐라 HTML/CSS/JS (React, Next.js 등 사용 안 함)
- **단일 HTML:** `index.html` + `style.css` + `app.js` + `state-manager.js`
- **CSS 변수로 테마 관리:** `:root`에 `--bg-primary`, `--text-primary` 등
- **반응형:** `@media (max-width: 768px)` 기준 2패널 → 1패널 스택

## Existing Codebase State

### Files from Phase 1
- `index.html` — 2패널 레이아웃, 10개 입력 필드, 결과 영역 3탭 (전략 개요/대본/스토리보드)
- `style.css` — 다크테마, 반응형
- `app.js` — 입력 바인딩, 태그 입력, 탭 전환, 검증
- `state-manager.js` — 전역 상태 관리 (10개 필드)

### app.js Currently Does
- `initInputBindings()` — `[data-field]` 요소 → state 바인딩
- `initTagInput()` — 신뢰요소 태그 입력 UI
- `initTabSwitching()` — 결과 영역 탭 전환
- `initValidation()` — 필수 필드 검증
- **제출 시 `console.log('Validation passed')` 후 아무것도 안 함** ← Phase 2에서 생성 로직 추가

### index.html Result Area
```html
<div class="result-content" id="script">
  <div class="empty-state">
    대본이 여기에 표시됩니다 (Phase 2)
  </div>
</div>
```

## Scope

### In Scope
- `template-plan.js` — 60초 숏폼 대본 템플릿 + 단축 규칙
- `pdf.js` — jsPDF 래퍼 (클라이언트 사이드 PDF 생성)
- `app.js` 업데이트 — 생성 버튼 연결, 결과 렌더링, 복사/새로 만들기/PDF 다운로드
- 대본 결과 영역 렌더링 (타임라인 + 대사 + 연출지시)
- 스토리보드 결과 영역 렌더링 (장면별 묘사)

### Out of Scope
- 당위성 엔진 (Phase 3)
- 설득형 제안서 PDF (Phase 3)
- API 연동 (Phase 4)
- 영상 소스 생성기 (Phase 5)

## Constraints
- 바닐라 JS only — 프레임워크 사용 금지
- jsPDF CDN 사용 (delivr 방식)
- 한글 폰트: jsPDF 한글 지원 CDN (Noto Sans KR 또는 similar)
- 브라우저에서 바로 동작해야 함 (빌드 스텝 없음)

## Skill File Reference
- `skills/custom/shortform-copywriting.md` — 26개 카피라이팅 원칙 (Phase 3에서 시스템 프롬프트 주입용)
- Phase 2에서는 템플릿 기반 생성만 수행, 원칙 주입은 Phase 3
