# REQUIREMENTS — AD SCRIPT STUDIO

| ID | Category | Description |
|----|----------|-------------|
| R1 | UI | 2패널 레이아웃 (좌: 입력, 우: 결과) — 반응형 |
| R2 | UI | 다크테마 (마케터/MD 타겟) |
| R3 | UI | 입력 필드: 브랜드명, 상품명, 컨셉, 타겟, 톤앤매너 (각 텍스트 입력) |
| R4 | UI | 결과 영역: 대본/스토리보드/마케팅 전략 탭 or 카드 |
| R5 | Logic | 템플릿 기반 60초 숏폼 광고 대본 생성 (단축 규칙 적용) |
| R6 | PDF | jsPDF 클라이언트 사이드 PDF 다운로드 |
| R7 | UI | 복사(Copy) / 새로 만들기(New) 버튼 |
| R8 | Skill | 시스템 프롬프트에 shortform-copywriting.md (26원칙) 주입 |
| R9 | UI | "적용된 마케팅 원칙" 카드 — 원본 원칙명 + 이유 + 예시 표시 |
| R10 | PDF | 클라이언트 제안서용 PDF (일반PDF + 제안서PDF 분리) |
| R11 | API | Vercel 서버리스 함수에서 Anthropic Claude API 호출 |
| R12 | Security | API 키 서버 사이드 관리 — 프론트엔드에 절대 노출 금지 |
| R13 | UX | 수동 모드(프롬프트 복붙) ↔ 자동 모드(API) 전환 가능 |
| R14 | UI | 두 번째 탭/도구: 영상 소스 생성기 |
| R15 | Logic | 씬 단위 파싱 (타임라인 0:00-0:03, 장면 묘사 추출) |
| R16 | Logic | EN 이미지 프롬프트 + 모션 프롬프트 + 공통 스타일 접미사 자동 부착 |
| R17 | UX | 상세도 조절 (최소/보통/상세) — 프롬프트 길이 제어 |
| R18 | UI | 프롬프트별 카피(Copy) 버튼 |
| R19 | UX | 탭 전환 (기획안 생성기 ↔ 영상 소스 생성기) |
| R20 | Logic | "2번으로 보내기" — 기획안 결과를 영상 소스 생성기에 자동 전달 |
| R21 | Deploy | Vercel 배포 (serverless functions + static hosting) |
| R22 | QA | 통합 E2E 테스트: 기획안 생성 → 영상 소스 생성 전체 플로우 |

---

## R1: 2패널 레이아웃

**User Story:** 마케터/MD가 입력과 결과를 한 화면에서 동시에 보며 작업할 수 있다.

**Acceptance Criteria:**
- 좌측 40~50%: 입력 영역 (브랜드명, 상품명, 컨셉, 타겟, 톤앤매너)
- 우측 50~60%: 결과 영역 (대본, 스토리보드, 마케팅 전략)
- 모바일/태블릿에서 세로 스택 레이아웃으로 자동 전환
- 바닐라 CSS (Flexbox or Grid) — 프레임워크 사용 안 함

**Dev Notes:**
- 단일 HTML 파일 (`index.html`) + CSS (`style.css`) + JS (`app.js`)
- 반응형: `@media (max-width: 768px)` 기준 2패널 → 1패널 스택

---

## R2: 다크테마

**User Story:** 마케터/MD가 장시간 사용 시 눈의 피로 없이 작업할 수 있다.

**Acceptance Criteria:**
- 기본 배경: `#0a0a0a` ~ `#1a1a1a` (다크 그레이 계열)
- 텍스트: `#e0e0e0` 이상의 대비비율 (WCAG AA 이상)
- 입력 필드/버튼: 다크테마와 어울리는 스타일
- CSS 변수로 테마 관리 (추후 라이트 테마 전환 가능)

**Dev Notes:**
- `:root`에 CSS 변수 선언 (`--bg-primary`, `--text-primary`, etc.)

---

## R3: 입력 필드

**User Story:** 마케터/MD가 광고 기획 정보를 입력할 수 있다.

**Acceptance Criteria:**
- 5개 입력 필드: 브랜드명(text), 상품명(text), 컨셉(textarea), 타겟(text), 톤앤매너(select or text)
- 각 필드 라벨 + placeholder 텍스트 (한국어)
- 필수 입력 표시 (브랜드명, 상품명은 필수)
- 입력값 검증: 필수 필드 미입력 시 경고

**Dev Notes:**
- 톤앤매너 select 옵션: 진지/유쾌/감성/유머/시크/발랄/몽환/강렬

---

## R4: 결과 영역

**User Story:** 마케터/MD가 생성된 광고 기획안을 다양한 형태로 확인할 수 있다.

**Acceptance Criteria:**
- 탭 또는 카드 형태로 3개 영역 표시: 대본, 스토리보드, 마케팅 전략
- 각 영역에 적절한 포맷 (마크다운 렌더링 or 구조화된 HTML)
- 결과가 없을 때 안내 메시지 표시

**Dev Notes:**
- 대본 영역: 타임라인 + 대사 + 연출지시 (테이블 or 카드)
- 스토리보드: 장면별 묘사 + 비주얼 노트
- 마케팅 전략: 핵심 메시지, 채널 추천, KPI

---

## R5: 템플릿 기반 60초 숏폼 대본 생성

**User Story:** 마케터/MD가 입력한 정보로 60초 숏폼 광고 대본을 즉시 생성할 수 있다.

**Acceptance Criteria:**
- 60초 분량의 타임라인 (0:00-0:03, 0:03-0:10, 0:10-0:30, 0:30-0:50, 0:50-0:60 등)
- 각 구간별 대사(dialogue) + 연출지시(direction) 포함
- 단축 규칙 적용: 5초 이내 핵심 전달, 반복, 감각 자극, 해시태그/CTA
- 한국어 대본 생성

**Dev Notes:**
- 템플릿 구조: `template-plan.js` — 대본 포맷 + 단축 규칙 체크리스트
- 수동 모드: 완성된 프롬프트를 textarea에 표시 → 사용자가 복사하여 Claude에 붙여넣기
- 자동 모드(P4): API 호출로 자동 생성

---

## R6: PDF 다운로드

**User Story:** 마케터/MD가 생성된 광고 기획안을 PDF로 다운로드하여 공유할 수 있다.

**Acceptance Criteria:**
- jsPDF 사용 (delivr CDN or 번들)
- 한글 폰트 지원 (Noto Sans KR or Malgun Gothic 웹 폰트)
- 클라이언트 사이드에서 생성 (서버 불필요)
- A4 용지 크기, 적절한 여백

**Dev Notes:**
- jsPDF + html2canvas 조합으로 HTML → PDF 변환
- 폰트 파일은 CDN에서 로드 (로컬 번들 불필요)

---

## R7: 복사/새로 만들기 버튼

**User Story:** 마케터/MD가 결과를 빠르게 복사하거나 새 기획안을 시작할 수 있다.

**Acceptance Criteria:**
- "복사" 버튼: 대본 전체를 클립보드에 복사 (navigator.clipboard API)
- "새로 만들기" 버튼: 입력 필드 + 결과 영역 초기화
- 복사 성공 시 토스트 알림 표시

**Dev Notes:**
- Clipboard API 사용 (보안 컨텍스트 필요 — HTTPS or localhost)

---

## R8: 스킬 지침 주입

**User Story:** 시스템 프롬프트에 마케팅 스킬 지침이 자동으로 포함되어 대본 품질이 향상된다.

**Acceptance Criteria:**
- `skills/custom/shortform-copywriting.md` (26원칙)의 내용이 시스템 프롬프트에 주입
- 주입 위치: 시스템 프롬프트의 "지침" 또는 "규칙" 섹션
- 수동 모드: 프롬프트 텍스트에 스킬 지침 포함하여 표시
- 자동 모드(P4): 서버리스 함수에서 파일 읽어 API 요청에 포함

**Dev Notes:**
- 수동 모드: `app.js`에서 `shortform-copywriting.md`를 fetch하여 프롬프트에 삽입
- 자동 모드: Vercel 서버리스 함수에서 `fs.readFileSync`로 읽기 (filesystem access 필요)
- ⚠️ Vercel 서버리스에서의 파일 접근: 서버리스 함수의 CWD가 빌드 타임 디렉토리이므로, 파일을 빌드 시 포함하거나 환경변수로 전달해야 함

---

## R9: 적용된 마케팅 원칙 표시

**User Story:** 마케터/MD가 어떤 마케팅 원칙이 대본에 적용되었는지 확인할 수 있다.

**Acceptance Criteria:**
- 결과 영역 하단에 "적용된 마케팅 원칙" 카드 섹션
- 각 원칙별: 원본 원칙명 + 간단한 이유 + 예시 (1줄)
- 카드 형태로 시각적 구분

**Dev Notes:**
- 대본 생성 시 적용된 원칙 목록을 별도 배열로 반환
- 템플릿에서 원칙별 메타데이터 (이름, 이유, 예시) 포함

---

## R10: 클라이언트 제안서용 PDF

**User Story:** 마케터/MD가 클라이언트에게 보낼 전문적인 제안서 PDF를 생성할 수 있다.

**Acceptance Criteria:**
- 일반 PDF (마케터 내부용)과 제안서 PDF (클라이언트용) 분리
- 제안서 PDF: 표지, 기획 개요, 대본, 스토리보드, 마케팅 전략, 적용 원칙
- 전문적인 디자인 (로고 영역, 일관된 폰트/레이아웃)

**Dev Notes:**
- jsPDF로 별도 템플릿 사용
- 표지: 브랜드명 + 날짜 + "광고 기획안" 타이틀

---

## R11: API 자동화 (서버리스)

**User Story:** 마케터/MD가 "생성" 버튼 하나로 광고 기획안을 자동 생성할 수 있다.

**Acceptance Criteria:**
- Vercel 서버리스 함수 (`/api/generate`)에서 Anthropic Claude API 호출
- 프론트엔드에서 fetch로 서버리스 함수 호출
- API 에러 처리 (rate limit, 네트워크 에러, 응답 시간 초과)
- 수동 모드 ↔ 자동 모드 토글 스위치

**Dev Notes:**
- Vercel API Routes: `api/generate.js` or `api/generate.ts`
- Anthropic SDK: `@anthropic-ai/sdk` npm 패키지
- API 키: Vercel 환경변수 (`ANTHROPIC_API_KEY`)

---

## R12: API 키 보안

**User Story:** API 키가 프론트엔드에 노출되지 않아 보안이 보장된다.

**Acceptance Criteria:**
- Anthropic API 키가 프론트엔드 코드/네트워크 요청에 포함되지 않음
- 서버리스 함수 내에서만 API 키 사용
- `.env.local` 또는 Vercel 대시보드에서 관리

**Dev Notes:**
- 프론트엔드 → Vercel 서버리스 함수 호출 (정적 호스팅과 동일 도메인)
- 서버리스 함수 → Anthropic API 호출 (서버 간 통신)

---

## R13: 수동/자동 모드 전환

**User Story:** 사용자가 수동 복붙 모드와 API 자동 모드를 자유롭게 전환할 수 있다.

**Acceptance Criteria:**
- 토글 스위치 또는 라디오 버튼으로 모드 전환
- 수동 모드: 완성된 프롬프트 텍스트 표시 + 복사 버튼
- 자동 모드: "생성" 버튼 클릭 → API 호출 → 결과 표시
- 현재 모드 상태 표시

**Dev Notes:**
- 상태 관리: `app.js`에서 `mode` 변수로 관리
- 자동 모드 시 로딩 스피너 표시

---

## R14: 영상 소스 생성기 (두 번째 도구)

**User Story:** 마케터/MD가 광고 대본을 기반으로 영상 제작 지시서를 생성할 수 있다.

**Acceptance Criteria:**
- 별도 탭 또는 도구로 전환 가능
- 기획안 결과를 입력으로 받음 (P6에서 자동 전달)
- 씬 단위 카메라 앵글, 무빙, 무드, 연출지시 생성
- EN 프롬프트 (이미지 + 모션) 생성

**Dev Notes:**
- 두 번째 탭: "영상 소스 생성기"
- 기획안 결과를 입력 textarea에 자동 전달 (P6)

---

## R15: 씬 단위 파싱

**User Story:** 60초 대본이 씬 단위로 자동 분할되어 영상 소스가 생성된다.

**Acceptance Criteria:**
- 타임라인 기반 씬 분할 (0:00-0:03, 0:03-0:10, etc.)
- 각 씬별: 장면 묘사 + 타임스탬프
- 씬 수: 최소 3개, 최대 10개

**Dev Notes:**
- 정규식 파싱: `/(\d+:\d+-\d+:\d+)\s*(.*)/` 패턴
- 씬 분할 로직: `template-video.js`

---

## R16: EN 프롬프트 생성

**User Story:** 각 씬별로 영어 이미지 프롬프트와 모션 프롬프트가 자동 생성된다.

**Acceptance Criteria:**
- 각 씬에 대해: EN 이미지 프롬프트 + EN 모션 프롬프트
- 공통 스타일 접미사 자동 부착 (예: "-s 750, --style raw")
- 프롬프트는 영어 (EN)
- 키워드 강조: 감정, 분위기, 색감, 질감

**Dev Notes:**
- 이미지 프롬프트 포맷: `{장면 묘사}, {감정/분위기}, {색감/질감}, {스타일 접미사}`
- 모션 프롬프트 포맷: `{카메라 무ving}, {속도}, {전환 효과}`
- 스타일 접미사: 설정 가능 (기본값: `-s 750, --style raw`)

---

## R17: 상세도 조절

**User Story:** 사용자가 프롬프트의 상세도를 조절할 수 있다.

**Acceptance Criteria:**
- 3단계 선택: 최소(Minimal), 보통(Standard), 상세(Detailed)
- 최소: 핵심 키워드만 (10 단어 이내)
- 보통: 장면 묘사 + 무드 (20-30 단어)
- 상세: 전체 묘사 + 조명 + 렌즈 정보 (50+ 단어)
- 선택 즉시 프롬프트 업데이트

**Dev Notes:**
- 라디오 버튼 또는 셀렉트 박스
- `detailLevel` 상태 변수로 관리

---

## R18: 프롬프트 카피 버튼

**User Story:** 사용자가 생성된 프롬프트를 클립보드에 복사할 수 있다.

**Acceptance Criteria:**
- 각 프롬프트 카드에 "카피" 버튼
- 클릭 시 클립보드 복사 (navigator.clipboard)
- 복사 성공 시 토스트 알림
- "전체 복사" 버튼: 모든 프롬프트를 하나로 복사

**Dev Notes:**
- Clipboard API 사용
- 토스트 알림: 2초 후 사라지는 토스트

---

## R19: 탭 전환

**User Story:** 사용자가 두 도구(기획안 생성기, 영상 소스 생성기)를 탭으로 전환할 수 있다.

**Acceptance Criteria:**
- 상단 탭 바: "기획안 생성기" | "영상 소스 생성기"
- 탭 전환 시 기존 입력/결과 유지 (상태 보존)
- 현재 활성 탭 하이라이트

**Dev Notes:**
- 탭 전환: `display: none/block` 또는 클래스 토글
- 상태는 `sessionStorage` 또는 메모리 유지

---

## R20: "2번으로 보내기" 자동 전달

**User Story:** 기획안 생성 결과를 영상 소스 생성기에 자동으로 전달할 수 있다.

**Acceptance Criteria:**
- 기획안 결과 영역에 "2번으로 보내기" 버튼
- 클릭 시 영상 소스 생성기의 입력 textarea에 기획안 텍스트 자동 전달
- 영상 소스 생성기 탭으로 자동 전환
- 전달 후 토스트 알림

**Dev Notes:**
- 상태 공유: 기획안 결과를 전역 변수 또는 이벤트로 전달
- 탭 전환 + 텍스트 삽입

---

## R21: Vercel 배포

**User Story:** 개발자가 앱을 Vercel에 배포하여 접근할 수 있다.

**Acceptance Criteria:**
- `vercel.json` 설정 파일
- 정적 파일 (HTML/CSS/JS) + 서버리스 함수 (API) 동시 배포
- Vercel 환경변수로 API 키 관리
- `vercel deploy` 또는 Git 연동 자동 배포

**Dev Notes:**
- 프로젝트 구조: `/` (정적) + `/api/` (서버리스)
- `package.json`에 `@anthropic-ai/sdk` 의존성
- `vercel.json`에 rewrite 규칙 (SPA 라우팅)

---

## R22: 통합 E2E 테스트

**User Story:** 전체 플로우(기획안 생성 → 영상 소스 생성)가 정상 동작함을 검증할 수 있다.

**Acceptance Criteria:**
- 수동 모드 E2E: 입력 → 프롬프트 생성 → 복사 → (수동 Claude 붙여넣기) → 결과 확인
- 자동 모드 E2E: 입력 → API 호출 → 결과 표시 → "2번으로 보내기" → 영상 소스 생성
- PDF 다운로드 동작 확인
- 탭 전환 상태 보존 확인

**Dev Notes:**
- 브라우저 콘솔 로그로 확인
- 수동 테스트 체크리스트 (초기 단계)
- 추후 자동화 테스트 프레임워크 도입 가능
