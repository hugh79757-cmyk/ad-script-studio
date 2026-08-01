# REQUIREMENTS — AD SCRIPT STUDIO

> 리팩터링 일자: 2026-07-31
> 변경 사유: Phase 3 당위성 엔진 + 설득형 제안서 중심으로 요구사항 재정의. R3 확장, R9 전면 재설계, R10 재구조화, R23~R27 신규 추가.

---

| ID | Category | Description | Phase | 상태 |
|----|----------|-------------|-------|------|
| R1 | UI | 2패널 레이아웃 (좌: 입력, 우: 결과) — 반응형 | P1 | 기존 유지 |
| R2 | UI | 다크테마 (마케터/MD 타겟) | P1 | 기존 유지 |
| R3 | UI | 입력 필드: **10개** — 기존 5개 + 경쟁사/가격/리뷰/신뢰요소/제외키워드 | P1 | **확장** |
| R4 | UI | 결과 영역: 전략 개요/대본/스토리보드 탭 or 카드 | P1 | **수정** |
| R5 | Logic | 템플릿 기반 60초 숏폼 광고 대본 생성 (단축 규칙 적용) | P2 | 기존 유지 |
| R6 | PDF | jsPDF 클라이언트 사이드 PDF 다운로드 | P2 | 기존 유지 |
| R7 | UI | 복사(Copy) / 새로 만들기(New) 버튼 | P2 | 기존 유지 |
| R8 | Skill | 시스템 프롬프트에 shortform-copywriting.md (26원칙) 주입 | P3 | 기존 유지 |
| R9 | Logic | **제품별 맞춤 당위성 근거 생성** — "왜 이 제품에 이 원칙이 필요한가"를 입력값 기반으로 서술 | P3 | **전면 재설계** |
| R10 | PDF | **설득형 제안서 PDF** — 문제진단→전략및근거→크리에이티브→기대효과→원칙부록 순서 | P3 | **전면 재설계** |
| R11 | API | Vercel 서버리스 함수에서 Anthropic Claude API 호출 | P4 | 기존 유지 |
| R12 | Security | API 키 서버 사이드 관리 — 프론트엔드에 절대 노출 금지 | P4 | 기존 유지 |
| R13 | UX | 수동 모드(프롬프트 복붙) ↔ 자동 모드(API) 전환 가능 | P4 | 기존 유지 |
| R14 | UI | 두 번째 탭/도구: 영상 소스 생성기 | P5 | 기존 유지 |
| R15 | Logic | 씬 단위 파싱 (타임라인 0:00-0:03, 장면 묘사 추출) | P5 | 기존 유지 |
| R16 | Logic | EN 이미지 프롬프트 + 모션 프롬프트 + 공통 스타일 접미사 자동 부착 | P5 | 기존 유지 |
| R17 | UX | 상세도 조절 (최소/보통/상세) — 프롬프트 길이 제어 | P5 | 기존 유지 |
| R18 | UI | 프롬프트별 카피(Copy) 버튼 | P5 | 기존 유지 |
| R19 | UX | 탭 전환 (전략 제안서 생성기 ↔ 영상 소스 생성기) | P6 | 기존 유지 |
| R20 | Logic | "2번으로 보내기" — 기획안 결과를 영상 소스 생성기에 자동 전달 | P6 | 기존 유지 |
| R21 | Deploy | Vercel 배포 (serverless functions + static hosting) | P6 | 기존 유지 |
| R22 | QA | 통합 E2E 테스트: 기획안 생성 → 영상 소스 생성 전체 플로우 | P6 | 기존 유지 |
| R23 | UI | **입력 필드 신규: 경쟁 제품명/차이점** (textarea, 선택) | P1 | **신규** |
| R24 | UI | **입력 필드 신규: 가격대/구매 장벽, 핵심 리뷰 발췌(최소 3건), 브랜드 신뢰 요소, 제외 키워드** | P1 | **신규** |
| R25 | PDF | **제안서 PDF: 문제진단 섹션** — 타겟이 겪는 문제를 데이터/리뷰 기반으로 서술 | P3 | **신규** |
| R26 | PDF | **제안서 PDF: 기대효과 서술 섹션** — 수치 보장이 아닌 근거 기반 일반 서술 | P3 | **신규** |
| R27 | Logic | **당위성 근거 자동 생성** — 수동 모드는 정형 문구, 자동 모드는 Claude API 연동 논리 생성 | P3 | **신규** |
| R28 | UI | **벤치마킹 분석기 탭** 표시 + 전환 (기존 2탭과 함께, additive) | P7 | **신규** |
| R29 | API | **Apify 크롤링** — job 생성 + `apify/instagram-reel-scraper` run 시작 + dataset fetch (resultsLimit 30) | P7 | **신규** |
| R30 | Logic | **바이럴 필터 + 개수 상한** — `videoViewCount >= 50,000` 필터, `MAX_ANALYZE_REELS=5` 서버 강제, `videoDuration > 180s` 전사 제외 | P7 | **신규** |
| R31 | API | **Whisper 전사** — `audioUrl` fetch → `whisper-1` multipart (`language=ko`, `verbose_json` segment 타임스탬프) | P7 | **신규** |
| R32 | Logic | **구조 분석 + 재조립** — segment 기반 훅/전개/클로징 해부 + 새 키워드/브랜드 대본 초안 (Claude) | P7 | **신규** |
| R33 | Logic | **job-status 폴링/비용 통제** — KV 스테이지 머신(crawling→transcribing→analyzing→done), GET당 단위 작업, `maxTotalChargeUsd=1`, KV TTL 24h, 폴링 120회 상한 | P7 | **신규** |
| R34 | Config | **env 가이드** — `APIFY_API_TOKEN`/`OPENAI_API_KEY` (vercel.json env 블록 + ENVIRONMENT-GUIDE.md) | P7 | **신규** |
| R35 | UI | **결과 렌더링 + 카피** — (a) 릴스 리스트/조회수 (b) 전사 대본 (c) 구조 해부 (d) 새 대본 + 진행 스테이지 표시 + 카피 버튼 | P7 | **신규** |

---

## R3: 입력 필드 (확장)

**User Story:** 마케터/MD가 광고 기획에 필요한 **모든 원자료**를 한 곳에서 입력할 수 있다.

**Acceptance Criteria:**
- 10개 입력 필드:
  - **기존 5개:** 브랜드명(text, 필수), 상품명(text, 필수), 컨셉(textarea), 타겟(text, 필수), 톤앤매너(select)
  - **신규 5개:**
    - 경쟁 제품명/차이점 (textarea, 선택) — "경쟁사 대비 우리 제품의 차별점"
    - 가격대/구매 장벽 (text, 선택) — "예: 39,000원, 첫 구매 망설임"
    - 핵심 리뷰 발췌 (textarea×3, 선택) — "실제 리뷰에서 반복되는 표현 3건 이상"
    - 브랜드 신뢰 요소 (text, 선택) — "예: 10년 운영, 5만명 구매, 식약처 인증"
    - 제외 키워드 (text, 선택) — "이 광고에서 사용하지 않을 키워드"
- 각 필드 라벨 + placeholder 텍스트 (한국어) + 도움말 문구
- 필수 입력 표시 (브랜드명, 상품명, 타겟 필수)
- 입력값 검증: 필수 필드 미입력 시 경고
- **확장 배경:** Phase 3의 당위성 엔진이 진짜 근거 있는 문장을 만들려면 원자료가 필수. 리뷰에서 반복되는 표현, 경쟁 제품과의 차이, 가격대/구매 장_barrier 등이 있어야 "왜 이 원칙이 필요한가" 논리가 성립

**Dev Notes:**
- 톤앤매너 select 옵션: 진지/유쾌/감성/유머/시크/발랄/몽환/강렬
- 신규 필드는 기존 필드 아래에 구분선(optgroup 스타일)으로 시각적 구분
- 리뷰 발췌 필드: 최소 1건~최대 5건 동적 필드 (추가/삭제 버튼)

---

## R4: 결과 영역 (수정)

**User Story:** 마케터/MD가 생성된 전략 제안서를 다양한 형태로 확인할 수 있다.

**Acceptance Criteria:**
- 탭 또는 카드 형태로 3개 영역 표시: **전략 개요**, 대본, 스토리보드
- **전략 개요 탭 (신규):** 문제 진단 요약 + 전략 근거 + 기대 효과 개요
- 각 영역에 적절한 포맷 (마크다운 렌더링 or 구조화된 HTML)
- 결과가 없을 때 안내 메시지 표시

**Dev Notes:**
- 전략 개요 영역: Phase 3의 당위성 엔진이 생성한 근거 + 문제 진단 + 기대 효과 요약
- 대본 영역: 타임라인 + 대사 + 연출지시 (테이블 or 카드)
- 스토리보드: 장면별 묘사 + 비주얼 노트

---

## R8: 스킬 지침 주입 (유지)

**User Story:** 시스템 프롬프트에 마케팅 스킬 지침이 자동으로 포함되어 제안서 품질이 향상된다.

**Acceptance Criteria:**
- `skills/custom/shortform-copywriting.md` (26원칙)의 내용이 시스템 프롬프트에 주입
- 주입 위치: 시스템 프롬프트의 "지침" 또는 "규칙" 섹션
- 수동 모드: 프롬프트 텍스트에 스킬 지침 포함하여 표시
- 자동 모드(P4): 서버리스 함수에서 파일 읽어 API 요청에 포함

**Dev Notes:**
- 수동 모드: `app.js`에서 `shortform-copywriting.md`를 fetch하여 프롬프트에 삽입
- 자동 모드: Vercel 서버리스 함수에서 `fs.readFileSync`로 읽기
- ⚠️ Vercel 서버리스에서의 파일 접근: 파일을 빌드 시 포함하거나 환경변수로 전달해야 함

---

## R9: 제품별 맞춤 당위성 근거 생성 ⭐ 핵심

**User Story:** 마케터/MD가 **"왜 이 제품에 이 마케팅 원칙이 적용되었는지"**를 입력값 기반으로 확인할 수 있다.

**Acceptance Criteria:**
- 결과 영역 하단에 "당위성 근거" 카드 섹션
- **단순 원칙 나열이 아님:** 각 원칙별로 아래 형태로 서술:
  - 원칙명: "첫 3초 훅 — 호기심 갭"
  - **왜 이 제품에 필요한가 (1~2문장):** 입력값(타겟, 리뷰, 경쟁사 정보)을 근거로 한 논리적 서술
  - 적용 예시: 실제 대본에서 어떻게 구현되었는지 1줄
- **수동 모드:** 정형화된 문구 템플릿으로 대체 (원칙명 + 간단 근거)
- **자동 모드(P4):** Claude API가 입력값과 26개 원칙을 연결해서 논리를 만들어냄 — **이 모드에서 당위성 엔진의 진가 발휘**

**Dev Notes:**
- `rationale-engine.js` — 입력값 + 원칙 매칭 로직
- 수동 모드 템플릿 예시:
  ```
  원칙: "호기심 갭"
  근거: "{타겟}가 자주 겪는 문제({리뷰 발췌})를 언급하되 핵심 해결책은 숨겨 시청을 유지합니다."
  ```
- 자동 모드: Claude API 프롬프트에 입력값 컨텍스트 + 26개 원칙 포함 → 근거 문장 생성 요청
- ⚠️ 수동 모드의 정형 문구는 "감으로 만든 것"처럼 보일 수 있음 — 자동 모드 전환을 유도하는 UX 고려

---

## R10: 설득형 제안서 PDF ⭐ 핵심

**User Story:** 마케터/MD가 클라이언트에게 보낼 **"감이 아니라 논리로 만든 제안서"**를 생성할 수 있다.

**Acceptance Criteria:**
- 제안서 PDF가 아래 순서의 설득 논리를 따름:

| 순서 | 섹션 | 내용 |
|------|------|------|
| 1 | 표지 | 브랜드명 + 날짜 + "광고 기획안" |
| 2 | **문제 진단** | 타겟이 겪는 문제를 리뷰/데이터 기반으로 짚어줌 |
| 3 | **전략 및 근거** | 크리에이티브 전략 + 어떤 심리적 원칙에 근거하는지 설명 |
| 4 | **구현된 크리에이티브** | 대본 + 스토리보드 |
| 5 | **기대 효과** | 수치 보장 불가, "이런 방식이 통상적으로 어떤 효과를 내는지" 일반적 근거 서술 |
| 6 | **부록: 원칙 전체 리스트** | 26개 원칙 + 각각 왜 이 제품에 적용되었는지 근거 |

- 문서 전체가 **"우리는 감이 아니라 논리로 만든다"**는 구조로 설득
- 전문적인 디자인 (로고 영역, 일관된 폰트/레이아웃)
- 한글 폰트 지원 (Noto Sans KR)

**Dev Notes:**
- `proposal-pdf.js` — 설득형 제안서 PDF 템플릿
- 문제진단 섹션: 입력된 리뷰 발췌 + 타겟 정보를 기반으로 자동 구성
- 전략및근거 섹션: R9의 당위성 근거를 그대로 사용
- 기대효과 섹션: 일반적 마케팅 근거 문구 템플릿 (수치 보장 금지)
- 기존 `pdf.js` (일반 PDF)와 별도 템플릿 유지

---

## R23: 입력 필드 — 경쟁 제품명/차이점 (신규)

**User Story:** 마케터/MD가 경쟁 제품과의 차별점을 입력하여 당위성 근거의 정밀도를 높일 수 있다.

**Acceptance Criteria:**
- textarea: "경쟁 제품명과 우리 제품의 차별점" (예: "A사 제품 대비 2배 용량, 반영구 사용")
- 선택 필드 (필수 아님)
- 입력 시 Phase 3 당위성 엔진에서 "경쟁 대비 차별점" 근거로 활용

**Dev Notes:**
- 경쟁 제품 정보가 있으면 당위성 엔진에서 "왜 우리 제품인가" 논리에 활용
- 없으면 해당 근거 섹션은 생략 또는 일반적 문구로 대체

---

## R24: 입력 필드 — 가격대/구매 장벽, 리뷰 발췌, 신뢰 요소, 제외 키워드 (신규)

**User Story:** 마케터/MD가 가격 정보, 실제 리뷰, 브랜드 신뢰 요소를 입력하여 근거 있는 제안서를 만들 수 있다.

**Acceptance Criteria:**
- 가격대/구매 장벽 (text): "예: 39,000원, 첫 구매 시 할인顾虑"
- 핵심 리뷰 발췌 (textarea×3~5): "실제 리뷰에서 반복되는 표현" — 동적 필드 (추가/삭제)
- 브랜드 신뢰 요소 (text): "예: 10년 운영, 5만명 구매, 식약처 인증"
- 제외 키워드 (text): "이 광고에서 사용하지 않을 키워드"

**Dev Notes:**
- 리뷰 발췌는 Phase 3 문제진단 섹션의 핵심 원자료
- 브랜드 신뢰 요소는 제안서 "전략 및 근거" 섹션에서 신뢰 증거로 활용
- 제외 키워드는 대본 생성 시 필터링에 활용
- 모두 선택 필드 (입력하지 않으면 해당 근거 섹션은 생략)

---

## R25: 제안서 PDF — 문제진단 섹션 (신규)

**User Story:** 제안서 첫 번째 본문 섹션이 타겟의 문제를 데이터/리뷰 기반으로 짚어준다.

**Acceptance Criteria:**
- 문제진단 섹션에 아래 내용이 자동 구성됨:
  - 타겟 고객이 겪는 핵심 문제 (입력된 타겟 정보 기반)
  - 반복되는 리뷰 표현 인용 (입력된 리뷰 발췌 활용)
  - 문제의 구체적 수치화 (입력된 가격대/구매 장벽 활용)
  - "이 문제를 해결하지 않았을 때의 비용" 암시
- 수동 모드: 정형 템플릿 + 입력값 삽입
- 자동 모드: Claude API가 리뷰+타겟 정보를 분석하여 문제진단 문장 생성

**Dev Notes:**
- 문제진단은 "왜 이 광고가 필요한가"를 증명하는 첫 단계
- 리뷰 발췌가 없으면 "타겟 고객의 일반적 Pain Point" 템플릿으로 대체

---

## R26: 제안서 PDF — 기대효과 서술 섹션 (신규)

**User Story:** 제안서에서 기대 효과를 수치 보장이 아닌 일반적 근거로 서술한다.

**Acceptance Criteria:**
- 기대효과 섹션에 아래 형태로 서술:
  - "이런 방식이 통상적으로 어떤 효과를 내는지"에 대한 일반적 근거
  - 예: "첫 3초 훅 전략은 숏폼 광고에서 시청 완료율을 평균 2~3배 향상시킵니다"
  - 예: "1인칭 고백 형식은 광고 거부감을 낮춰 주목도를 높입니다"
  - **정확한 수치 보장 금지** — 일반적 근거만 서술
- 26개 원칙 중 이 제안서에 적용된 원칙의 효과 근거를 인용

**Dev Notes:**
- 기대효과는 Phase 3의 당위성 엔진에서 생성된 근거를 재활용
- 수치는 "평균", "일반적으로", "통상적으로" 등 조건부 표현 사용
- 과대 광고 방지를 위한 가이드라인 템플릿 포함

---

## R27: 당위성 근거 자동 생성 — 수동/자동 모드 차별화 (신규)

**User Story:** 수동 모드에서는 정형화된 문구로, 자동 모드에서는 Claude API 연동으로 당위성 근거가 생성된다.

**Acceptance Criteria:**
- 수동 모드: 정형화된 템플릿 문구로 근거 생성
  - 예: "이 원칙은 {타겟}의 {문제}를 해결하기 위해 필요합니다"
  - 한계: 입력값과 원칙의 연결이 기계적, 진정한 논리적 서술이 어려움
- 자동 모드(P4): Claude API가 입력값(타겟, 리뷰, 경쟁사, 가격)과 26개 원칙을 분석하여
  - "왜 이 제품에는 이 원칙이 필요한가"를 한두 문장으로 논리적 서술
  - 예: "{브랜드}의 {제품}은 {가격대}대 제품으로, {리뷰}에서 반복되는 '{문제}'를 해결하는 것이 핵심입니다. 따라서 {원칙}을 적용하여 {근거}를 만드는 것이 효과적입니다."
- 수동↔자동 전환 시 당위성 근거 영역이 자동으로 업데이트됨

**Dev Notes:**
- 수동 모드의 한계를 UX로 명시하여 자동 모드 전환 유도
- 자동 모드 응답 구조: `{ rationale: string, appliedPrinciples: Array<{name, reason, example}> }`
- API 에러 시 수동 모드 템플릿으로 폴백

---

# Phase 7 — 벤치마킹 대본 분석기 (신규)

> 추가 일자: 2026-08-01
> 배경: 시장에서 실제로 터진(바이럴) 숏폼이 어떤 구조를 쓰는지에 대한 1차 데이터가 없어,
> 대본 구조 근거가 사용자 직접 입력에만 의존함. 벤치마킹 분석기는 IG 릴스를 크롤링·전사·해부하여
> **실측 구조 데이터**를 만들어내고, 이를 템플릿으로 삼아 새 대본을 재조립하는 도구.
> Phase 3(전략 제안서)과의 관계: 독립 동작하되, 구조 해부 JSON(`{ hook, development, closing }`)과
> KV 저장 위치(`benchmark:{jobId}`)를 연동 포인트로 열어둠 — 이번 Phase에서 양방향 연동은 구현 안 함.

## R28: 벤치마킹 분석기 탭 (신규)

**User Story:** 사용자가 기존 2개 탭(전략 제안서/영상 소스)과 함께 벤치마킹 분석기 탭을 사용할 수 있다.

**Acceptance Criteria:**
- 탭 바에 "벤치마킹 분석기" 버튼이 기존 탭과 함께 표시됨 (`data-tab="benchmark"`)
- 클릭 시 벤치마킹 도구 컨테이너로 전환, 기존 탭과 왕복 전환 정상
- 기존 proposal/video 탭 동작 무손상 (additive — 신규 추가만, 기존 파일 수정 최소화)
- 한국어 UI

**Dev Notes:**
- `index.html`: 탭 버튼 1개 + `#benchmark-tool` 컨테이너 + `<script src="benchmark-analyzer.js">`
- `state-manager.js`: `tabState.benchmarkResults` 슬롯 + `saveBenchmarkResults()` (연동 포인트 개방)

## R29: Apify 크롤링 (신규)

**User Story:** 사용자가 IG 계정을 입력하면 해당 계정의 릴스가 자동으로 크롤링된다.

**Acceptance Criteria:**
- 입력: IG 계정 URL 또는 아이디 (URL이면 유저네임만 추출)
- `POST /api/benchmark` → job 생성 + 공식 `apify/instagram-reel-scraper` run 시작 (resultsLimit 30) → 즉시 `201 { success, jobId }` 응답
- Apify run 상태 폴링 → SUCCEEDED 시 dataset fetch
- API 키 미설정 시 한국어 오류 500

**Dev Notes:**
- 액터: `apify/instagram-reel-scraper` (공식, 쿠키 불필요 기본), `maxTotalChargeUsd=1`로 비용 상한
- 폴링: `GET /v2/actor-runs/{runId}` → `GET /v2/actor-runs/{runId}/dataset/items`

## R30: 바이럴 필터 + 개수 상한 (신규)

**User Story:** 조회수 기준으로 터진 릴스만 선별되고, 분석 개수에 상한이 적용된다.

**Acceptance Criteria:**
- `videoViewCount >= 50,000` AND `videoDuration <= 180s` 필터 (조회수 내림차순)
- 상위 `MAX_ANALYZE_REELS`(기본 5, UI에서 3~5 선택)개만 전사/분석 대상
- 서버 상수로 클램프 — 사용자가 UI를 우회해 요청해도 초과 불가 (maxReels=10 요청 → 5 저장)
- 바이럴 0건/릴스 0건(비공개·신생 계정) → 한국어 오류 처리

**Dev Notes:**
- 상수: `VIRAL_VIEWS_THRESHOLD = 50000`, `MAX_ANALYZE_REELS = 5`, `APIFY_RESULTS_LIMIT = 30`

## R31: Whisper 전사 (신규)

**User Story:** 선별된 각 릴스의 음성이 텍스트 대본으로 변환된다.

**Acceptance Criteria:**
- `audioUrl`(오디오 전용 mp4) fetch → OpenAI `whisper-1` multipart 업로드 (ffmpeg 불필요)
- `language=ko`, `response_format=verbose_json` (segment 타임스탬프 포함)
- GET 폴링당 최대 2개만 전사 (Vercel 타임아웃 예산), 멱등성(이미 전사된 릴스 재전사 금지)
- 실패 릴스는 `[음성 인식 불가]` 표시로 격리, 429 재시도 (withRetry)

**Dev Notes:**
- 엔드포인트: `POST https://api.openai.com/v1/audio/transcriptions`, Node 내장 fetch/FormData
- 비용: $0.006/분 (5개 릴스 ≈ $0.03)

## R32: 구조 분석 + 재조립 (신규)

**User Story:** 여러 릴스 대본의 공통 구조가 해부되고, 그 구조를 적용한 새 대본 초안이 생성된다.

**Acceptance Criteria:**
- Claude 호출 1회: segment 타임스탬프 기반으로 각 릴스의 훅 오프닝/전개 전환/클로징 구간 추출
- 공통 구조 JSON: `{ hook, development, closing }`
- 사용자 입력 키워드/브랜드 반영한 새 대본 초안 (훅/전개/클로징 + 타임라인 JSON)
- 릴스 캡션/전사 텍스트는 "데이터"로만 취급 (프롬프트 인젝션 방지)

**Dev Notes:**
- `api/generate.js`의 시스템 프롬프트/`withRetry`/`parseApiResponse` 패턴 재사용

## R33: job-status 폴링/비용 통제 (신규)

**User Story:** 긴 파이프라인(크롤~분석)이 Vercel 타임아웃 없이 완료되고, 비용이 통제된다.

**Acceptance Criteria:**
- `POST /api/benchmark`(job 생성 + Apify run 시작, 즉시 응답) + `GET /api/benchmark?id=`(클라이언트 폴링)
- KV 스테이지 머신: `crawling → transcribing → analyzing → done / failed`
- 각 GET이 "완료된 다음 단계의 단위 작업"만 수행 → 단일 호출 300s 이내
- `maxTotalChargeUsd=1`, KV TTL 24h, 폴링 120회 상한 후 `failed(timeout)`
- jobId: `crypto.randomBytes(16)` 22자 base64url (128bit, review.js 패턴)

**Dev Notes:**
- 저장소: Vercel KV (`@vercel/kv` 3.0.0 기존 설치), 키 `benchmark:{jobId}`
- 결과 요약만 저장 (전사 5개 + 분석 ≈ 50KB < KV 1MB)

## R34: env 가이드 (신규)

**User Story:** 새로 필요한 API 키가 환경변수 가이드에 문서화된다.

**Acceptance Criteria:**
- `APIFY_API_TOKEN` (Apify 가입 → Settings → API & Integration)
- `OPENAI_API_KEY` (OpenAI Platform → API keys)
- vercel.json `env` 블록 + ENVIRONMENT-GUIDE.md에 발급 방법/설정 위치/확인 curl 포함
- `vercel.json`에 `functions["api/benchmark.js"].maxDuration = 300` 명시 (Vercel 타임아웃)

**Dev Notes:**
- 기존 KV env 2개(`KV_REST_API_URL`, `KV_REST_API_TOKEN`) 유지 + 신규 2개 추가

## R35: 결과 렌더링 + 카피 (신규)

**User Story:** 사용자가 (a) 릴스 리스트 (b) 전사 대본 (c) 구조 해부 (d) 새 대본을 보고 복사할 수 있다.

**Acceptance Criteria:**
- 진행 스테이지 표시 (크롤링→전사→분석→완료 스테퍼 + 한국어 상태 텍스트)
- done 시 4종 결과 렌더링: (a) 바이럴 릴스 리스트 카드(조회수/좋아요/링크) (b) 전사 대본 (c) 구조 해부 카드 (d) 새 대본 초안
- 각 섹션 카피 버튼 (navigator.clipboard, video-ui.js 패턴)
- failed/timeout → 한국어 오류 + "다시 시도" 버튼, 폴링 중 탭 이탈 시 clearInterval

**Dev Notes:**
- `benchmark-analyzer.js` 한 파일에 UI+폴링+렌더링 응집 (RESEARCH §4-3)
