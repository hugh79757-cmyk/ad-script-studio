# ROADMAP — AD SCRIPT STUDIO

## Phase 1: 기획안 생성기 UI 골격

**Goal:** 2패널 레이아웃, 다크테마, 입력 필드, 결과 영역이 동작하는 클라이언트 사이드 UI 골격 완성

**Requirements:** R1, R2, R3, R4

**Success Criteria:**
- 좌측에 5개 입력 필드(브랜드명, 상품명, 컨셉, 타겟, 톤앤매너)가 표시됨
- 우측에 결과 영역(대본/스토리보드/마케팅전략 탭)이 표시됨
- 다크테마 적용 (배경 #0a0a0a~#1a1a1a, 텍스트 #e0e0e0 이상 대비)
- 768px 이하에서 2패널 → 1패널 스택으로 반응형 전환
- 필수 입력 필드 미입력 시 경고 표시

**Parallelization:**
- Wave 1 (default): index.html, style.css, app.js 작성

**Agent Verification (After):**
- gsd-verifier: Goal-backward — "UI 골격이 동작하는가?" → 브라우저에서 열어 2패널, 다크테마, 입력필드, 결과영역 확인
- gsd-ui-checker: UI-SPEC.md에서 dark mode, responsive, accessibility 스코어 확인

---

## Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF

**Goal:** 템플릿 기반 60초 숏폼 대본 생성, 결과 카드 렌더링, jsPDF PDF 다운로드, 복사/새로 만들기 동작

**Requirements:** R5, R6, R7

**Success Criteria:**
- "생성" 버튼 클릭 시 템플릿 기반 60초 숏폼 대본이 우측 결과 영역에 렌더링됨
- 대본은 타임라인(0:00-0:03 등) + 대사 + 연출지시 포함
- "PDF 다운로드" 버튼 클릭 시 jsPDF로 PDF 파일 생성 및 다운로드
- "복사" 버튼 클릭 시 대본 전체가 클립보드에 복사됨
- "새로 만들기" 버튼 클릭 시 입력/결과 초기화

**Parallelization:**
- Wave 1 (default): template-plan.js (대본 템플릿 + 단축규칙), pdf.js (jsPDF 래퍼), app.js 업데이트

**Agent Verification (After):**
- gsd-verifier: "템플릿 기반 대본 생성이 동작하는가?" → 브라우저에서 입력 후 생성 클릭 → 결과 렌더링 확인
- gsd-ui-checker: 결과 카드 레이아웃, 버튼 동작, PDF 다운로드 확인

---

## Phase 3: 스킬 지침 주입 + 마케팅 원칙 표시 + 제안서 PDF

**Goal:** shortform-copywriting.md의 26개 원칙이 시스템 프롬프트에 주입되고, 결과에 "적용된 마케팅 원칙" 카드와 제안서 PDF가 표시됨

**Requirements:** R8, R9, R10

**Success Criteria:**
- 수동 모드 프롬프트 텍스트에 shortform-copywriting.md 내용이 자동 포함됨
- 결과 영역 하단에 "적용된 마케팅 원칙" 카드 섹션 표시 (원본 원칙명 + 이유 + 예시)
- "제안서 PDF" 버튼으로 클라이언트용 전문 제안서 PDF 생성 (표지, 기획개요, 대본, 스토리보드, 전략, 원칙)

**Parallelization:**
- Wave 1 (default): skill-loader.js (shortform-copyscopy.md fetch + 파싱), proposal-pdf.js (제안서 PDF 템플릿), app.js 업데이트

**Agent Verification (After):**
- gsd-verifier: "스킬 지침이 프롬프트에 주입되는가?" → 수동 모드 프롬프트에 26개 원칙 포함 확인
- gsd-ui-checker: 원칙 카드 레이아웃, 제안서 PDF 출력 확인

---

## Phase 4: Claude API 자동화

**Goal:** Vercel 서버리스 함수에서 Anthropic Claude API를 호출하여 광고 기획안을 자동 생성하고, 수동/자동 모드 전환이 동작함

**Requirements:** R11, R12, R13

**Success Criteria:**
- Vercel 서버리스 함수 `/api/generate`에서 Anthropic API 호출
- API 키가 프론트엔드에 노출되지 않음 (환경변수 관리)
- "생성" 버튼 클릭 시 API 호출 → 로딩 스피너 → 결과 표시
- 수동 모드 ↔ 자동 모드 토글 스위치 동작

**Parallelization:**
- Wave 1 (default): api/generate.js (서버리스 함수), vercel.json 설정
- Wave 2 (after wave 1): app.js에 API 호출 로직, 모드 전환 UI

**Agent Verification (After):**
- gsd-verifier: "API 자동화가 동작하는가?" → 자동 모드에서 입력 후 생성 → 결과 표시 확인
- gsd-security-checker: API 키 미노출 확인 (네트워크 탭에서 프론트엔드 요청에 키 없음)

---

## Phase 5: 영상 소스 생성기

**Goal:** 두 번째 도구(영상 소스 생성기)가 탭으로 전환 가능하고, 씬 파싱, EN 프롬프트 생성, 상세도 조절, 카피 버튼이 동작함

**Requirements:** R14, R15, R16, R17, R18

**Success Criteria:**
- "영상 소스 생성기" 탭 클릭 시 두 번째 도구로 전환
- 60초 대본 입력 → 씬 단위 자동 파싱 (최소 3개, 최대 10개 씬)
- 각 씬별 EN 이미지 프롬프트 + 모션 프롬프트 + 공통 스타일 접미사
- 상세도 조절 (최소/보통/상세) 선택 시 프롬프트 길이 변경
- 각 프롬프트에 카피 버튼 + "전체 복사" 버튼

**Parallelization:**
- Wave 1 (default): template-video.js (씬 파싱 + 프롬프트 생성), video-ui.js (영상 소스 UI)
- Wave 2 (after wave 1): app.js에 탭 전환 로직, 카피 버튼

**Agent Verification (After):**
- gsd-verifier: "영상 소스 생성기가 동작하는가?" → 대본 입력 → 씬 파싱 → EN 프롬프트 생성 확인
- gsd-ui-checker: 탭 전환, 상세도 조절, 카피 버튼 동작 확인

---

## Phase 6: 두 도구 연결 + 통합 테스트 + Vercel 배포

**Goal:** 기획안 생성기와 영상 소스 생성기가 연결되어("2번으로 보내기") 자동 전달되고, 전체 플로우 통합 테스트 후 Vercel에 배포됨

**Requirements:** R19, R20, R21, R22

**Success Criteria:**
- "2번으로 보내기" 버튼 클릭 시 기획안 결과가 영상 소스 생성기에 자동 전달
- 탭 전환 시 기존 입력/결과 유지 (상태 보존)
- Vercel 배포 성공 (정적 + 서버리스 함수)
- 수동 모드 E2E: 입력 → 프롬프트 생성 → 복사 → (수동 Claude) → 결과
- 자동 모드 E2E: 입력 → API 호출 → 결과 → "2번으로 보내기" → 영상 소스 생성
- PDF 다운로드 동작 확인

**Parallelization:**
- Wave 1 (default): state-manager.js (전역 상태 관리 + 탭 간 전달), vercel.json 업데이트
- Wave 2 (after wave 1): 통합 E2E 테스트, 배포 스크립트

**Agent Verification (After):**
- gsd-verifier: "전체 플로우가 동작하는가?" → 기획안 생성 → 2번으로 보내기 → 영상 소스 생성 확인
- gsd-ui-checker: 탭 전환 상태 보존, 배포 URL 접근 확인
