# ROADMAP — AD SCRIPT STUDIO v2 원소스 멀티유즈 콘텐츠 시스템

> 마일스톤: v2.0 원소스 멀티유즈 콘텐츠 시스템
> 작성일: 2026-08-09
> 기반: 설계 4개 문서(ARCHITECTURE, FOLDER_STRUCTURE, NICHE_SCHEMA, LEGAL_COMPLIANCE) + 4개 차원 리서치(STACK, FEATURES, ARCHITECTURE, PITFALLS)
> 선행 마일스톤: v1 (전략 제안서 생성기, Phase 1~7 완료)

---

## Phase 1: 콘텐츠 코어 확장 + 파일 저장

**Goal:** v1의 10개 입력 필드 + 당위성 엔진 + mc 깊이단계 개념을 병합한 콘텐츠 코어 YAML 스키마를 정의하고, campaignId 기반 파일 저장/불러오기/목록 조회 기능을 완성한다.

**Requirements:** CORE-01, CORE-02, CORE-03, CORE-04, CORE-05

**Success Criteria:**
- 콘텐츠 코어 YAML 스키마가 7개 그룹(식별·메타 / 제품 / 타겟·목적 / 메시지·당위성 / 근거자료 / 법적고지 / 깊이단계 소구점) 30+ 필드로 정의됨
- `campaignId` 입력 시 `content/campaigns/{campaignId}/core.yaml`이 자동 생성됨
- 저장된 코어 파일을 불러와서 콘텐츠 코어 객체로 파싱할 수 있음
- 캠페인 목록 조회 시 저장된 campaignId 리스트를 볼 수 있음
- v1 `appState`(10개 필드) → 콘텐츠 코어 변환 함수(`fromAppState`/`toAppState`)가 동작함
- `purpose.stage` enum(인지/고려/결정) + `depth.basic/applied/advanced` 소구점 필드가 스키마에 포함됨
- **v1 무손상:** 기존 index.html/app.js/state-manager.js 동작 변화 없음

**Parallelization:**
- Wave 1 (default): core.yaml 스키마 정의, 저장/불러오기/목록 조회 함수, fromAppState/toAppState 변환
- Wave 1: depth.basic/applied/advanced 소구점 필드 + purpose.stage enum

**Plans:**
- [x] 01-content-core.PLAN.md — 콘텐츠 코어 YAML 스키마 정의 + 저장/불러오기/목록 조회 + fromAppState/toAppState 변환 + 통합 검증 (3 tasks 통합)

**Agent Verification (After):**
- gsd-verifier: Goal-backward — "콘텐츠 코어가 저장·불러오기·목록 조회되는가?" → campaignId 지정 후 core.yaml 생성·파싱·목록 확인
- gsd-verifier: "v1 appState → 콘텐츠 코어 변환이 동작하는가?" → v1 상태 값으로 fromAppState 호출 후 필드 매핑 확인
- gsd-plan-checker: Phase 2(쇼츠 렌더러)가 Phase 1의 콘텐츠 코어 스키마를 입력으로 사용할 수 있는지 인터페이스 확인

---

## Phase 2: 쇼츠 렌더러 (대본 ~ 이미지·TTS까지)

**Goal:** 콘텐츠 코어를 입력받아 60초 숏폼 대본 + 씬별 EN 이미지 프롬프트 + 실사 이미지(Pixabay) + AI 이미지(Pollinations.ai) + TTS(edge-tts)까지 생성하고, 실제 영상 렌더링(moviepy)은 "준비 완료" 상태로 출력한다. 렌더링 완성(Phase 5)과 분리하여 먼저 대본·프롬프트·미디어 자산 생성까지 끝낸다.

**Requirements:** SHORTS-01, SHORTS-02, SHORTS-03, SHORTS-04, SHORTS-05, SHORTS-06, SHORTS-07

**Success Criteria:**
- 콘텐츠 코어 입력 → 7장면 60초 대본 생성 (v1 template-plan.js 확장, 15/30초 축약 규칙 유지)
- 대본 → 씬 파싱 → 씬별 EN 이미지 프롬프트 생성 (v1 template-video.js 계승, 최소 3/최대 10씬, 상세도 조절 최소/보통/상세)
- Pixabay API로 장면별 실사 이미지 검색·다운로드 → `content/campaigns/{campaignId}/shorts/images/` 저장 + 출처 로그
- Pollinations.ai(Flux)로 AI 이미지 생성 프롬프트 준비 + 실행 (익명 15초당 1회 제한 인지, API 키 옵션)
- edge-tts로 장면별 한국어 TTS 생성 → `content/campaigns/{campaignId}/shorts/audio/` 저장 (ko-KR-SunHiNeural)
- **렌더링 준비 완료 상태 출력:** 대본 + 씬별 프롬프트 + TTS 파일 경로 + 이미지 경로까지 생성하고, 실제 moviepy 렌더링은 "준비 완료, Phase 5에서 실행"으로 표시
- 쇼츠 결과물 장면별/전체 카피 버튼 동작
- **v1 무손상:** template-plan.js, template-video.js 원본 유지 (확장이지 대체가 아님)

**Parallelization:**
- Wave 1 (default): 대본 생성(SHORTS-01) + 씬 파싱/프롬프트(SHORTS-02) — v1 템플릿 계승
- Wave 1: Pixabay 이미지(SHORTS-03) + Pollinations.ai(SHORTS-04) — 병렬 가능 (서로 독립)
- Wave 2 (after wave 1): edge-tts TTS(SHORTS-05) + 렌더링 준비 완료 출력(SHORTS-06) + 카피 버튼(SHORTS-07)

**Plans:**
- [ ] 02-01-shorts-renderer.PLAN.md — 쇼츠 대본(SHORTS-01) + 씬 파싱/프롬프트(SHORTS-02) + Pixabay 이미지(SHORTS-03) + Pollinations.ai(SHORTS-04) + edge-tts TTS(SHORTS-05) + 렌더링 준비 완료 조립(SHORTS-06) + 카피 버튼(SHORTS-07) (5 tasks)

**Agent Verification (After):**
- gsd-verifier: "콘텐츠 코어 → 쇼츠 대본이 생성되는가?" → 코어 입력 후 대본 출력 확인
- gsd-verifier: "씬별 EN 이미지 프롬프트가 생성되는가?" → 씬 파싱 결과 확인
- gsd-verifier: "Pixabay/Pollinations.ai 이미지 + edge-tts TTS가 생성되는가?" → 파일 존재 확인
- gsd-verifier: "렌더링 준비 완료 상태가 출력되는가?" → Phase 5 이연 표시가 있는지 확인
- gsd-plan-checker: Phase 5(렌더링)가 Phase 2의 출력물을 입력으로 사용할 수 있는지 인터페이스 확인

---

## Phase 3: 카드뉴스 + 인포그래픽 렌더러

**Goal:** 콘텐츠 코어를 입력받아 카드뉴스 슬라이드별 출력(카피+시각지시+EN이미지프롬프트)과 인포그래픽 데이터 출력(비교데이터+시각구성지시)을 생성한다. 마지막 슬라이드/데이터에 제휴 고지를 삽입하고, 수치·비교 주장에 과장 검증 플래그를 표시한다.

**Requirements:** CARDS-01, CARDS-02, INFOGRAPHIC-01, INFOGRAPHIC-02

**Success Criteria:**
- 콘텐츠 코어 입력 → 카드뉴스 슬라이드별 출력 (슬라이드 수 자동 결정, 최소 5장, 각 슬라이드: 한국어 카피 + 시각 지시 + 필요 시 EN 이미지 프롬프트)
- 카드뉴스 마지막 슬라이드에 제휴 고지 삽입 (legal.disclosureText 반영)
- 콘텐츠 코어 입력 → 인포그래픽 데이터 출력 (가격/경쟁사/리뷰 통계 기반 비교 데이터 + 시각 구성 지시)
- 인포그래픽 출력에 수치·비교 주장 과장 검증 플래그 표시 (근거 필드 없는 수치 주장 표시)
- 카드뉴스·인포그래픽 출력물이 `content/campaigns/{campaignId}/cards/` / `infographic/`에 저장됨
- **v1 무손상:** 기존 렌더러 템플릿(template-plan.js 등) 영향 없음

**Parallelization:**
- Wave 1 (default): 카드뉴스 렌더러(CARDS-01, CARDS-02)
- Wave 1: 인포그래픽 렌더러(INFOGRAPHIC-01, INFOGRAPHIC-02) — 카드뉴스와 병렬 가능

**Agent Verification (After):**
- gsd-verifier: "카드뉴스 슬라이드별 출력이 생성되는가?" → 슬라이드 수·카피·시각지시 확인
- gsd-verifier: "마지막 슬라이드에 제휴 고지가 삽입되는가?" → legal.disclosureText 반영 확인
- gsd-verifier: "인포그래픽 비교 데이터가 출력되는가?" → 가격/경쟁사/리뷰 통계 기반 데이터 확인
- gsd-verifier: "과장 검증 플래그가 표시되는가?" → 근거 없는 수치 주장에 플래그 확인

---

## Phase 4: 롱폼 렌더러 + 주제 브릿지

**Goal:** 콘텐츠 코어를 입력받아 mc 깊이단계(기초/응용/고급) 구조를 적용한 롱폼 원고를 생성하고, mc 블로그 체인의 기존 주제(시드 키워드+깊이단계 소제목+니치 태그)를 조회·선택하여 콘텐츠 코어 초안으로 적재하는 주제 브릿지 인터페이스를 완성한다.

**Requirements:** LONGFORM-01, LONGFORM-02, BRIDGE-01, BRIDGE-02, BRIDGE-03

**Success Criteria:**
- 콘텐츠 코어 입력 → 롱폼 원고 생성 (mc 깊이단계 구조: 기초=인지/응용=비교고려/고급=결정구매, 니치 스키마 톤·금기어 반영, 분량 목표 1500~3000자)
- 롱폼 원고 상단에 제휴 고지 삽입 (legal.disclosureText 반영)
- 주제 브릿지 인터페이스: mc 블로그 체인 주제 목록 조회 + 사용자 선택 (시드 키워드 + 깊이단계 소제목 + 니치 태그 표시)
- 선택된 주제 → 콘텐츠 코어 초안 자동 적재 (concept, depth, niche까지. price/competitor/reviews는 "수동 입력 필요"로 명시)
- 주제 브릿지 1단계는 수동 입력/URL 입력으로 시작 (옵션 C). 정적 YAML 카탈로그(옵션 A)는 후속.
- **미결정:** mc 체인 DB 경로/스키마 버전 확인 전까지 BRIDGE-01은 인터페이스 정의 + 목업 데이터로 검증
- **v1 무손상:** 기존 렌더러 영향 없음

**Parallelization:**
- Wave 1 (default): 롱폼 렌더러(LONGFORM-01, LONGFORM-02)
- Wave 1: 주제 브릿지 인터페이스(BRIDGE-01, BRIDGE-02, BRIDGE-03) — 롱폼과 병렬 가능

**Agent Verification (After):**
- gsd-verifier: "롱폼 원고가 깊이단계 구조로 생성되는가?" → 기초/응용/고급 섹션 확인
- gsd-verifier: "롱폼 상단에 제휴 고지가 삽입되는가?" → legal.disclosureText 반영 확인
- gsd-verifier: "주제 브릿지에서 mc 체인 주제를 선택·적재할 수 있는가?" → 인터페이스 동작 확인 (목업 데이터 가능)

---

## Phase 5: 렌더링 파이프라인 완성

**Goal:** Phase 2에서 "준비 완료" 상태로 저장된 쇼츠 자산(대본, 씬별 프롬프트, TTS, 이미지)을 받아 Whisper 자막 생성 → moviepy 렌더링 → 썸네일 생성까지 완성하고, 전체 파이프라인을 Job-status 폴링 패턴으로 관리한다. (v1 benchmark.js의 KV 스테이지 머신 패턴을 재사용)

**Requirements:** RENDER-01, RENDER-02, RENDER-03, RENDER-04

**Success Criteria:**
- Phase 2의 audio/*.mp3 → Whisper small 모델로 장면별 SRT 자막 생성 → `content/campaigns/{campaignId}/shorts/subtitles/*.srt` 저장 (한국어)
- scene별 이미지 + TTS + 자막 → moviepy 렌더링: 12fps/1920x1080/Ken Burns 확대(1.0→1.06)/PIP 실사 인서트(우하단 무레이블 테두리)/2줄 자막/0.5초 크로스디졸브 → `output/vox_content_final.mp4`
- 썸네일 생성: assets/prompts/thumbnail_prompt.md 기반 이미지 + make_thumbnail.py 텍스트 오버레이 (이모지 금지)
- 쇼츠 파이프라인 Job-status 폴링 패턴 적용 (v1 benchmark.js KV 스테이지 머신 패턴 재사용, 전체 3~15분 소요 대비)
- **v1 무손상:** benchmark.js 패턴 재사용이지 수정이 아님. 기존 benchmark 탭 영향 없음
- **미결정:** 렌더링 원격 실행 환경(Render/Fly.io/로컬) 최종 선택 전 — RENDER-02 실제 배포 방식은 환경 결정 후 확정

**Parallelization:**
- Wave 1 (default): Whisper 자막(RENDER-01) + moviepy 렌더링(RENDER-02) — 순차 의존 (자막 → 렌더링)
- Wave 2 (after wave 1): 썸네일(RENDER-03) + Job-status 폴링(RENDER-04)

**Agent Verification (After):**
- gsd-verifier: "Whisper로 한국어 자막이 생성되는가?" → SRT 파일 존재 + 내용 확인
- gsd-verifier: "moviepy 렌더링 결과물이 생성되는가?" → mp4 파일 존재 + 스펙(12fps/1920x1080) 확인
- gsd-verifier: "썸네일이 생성되는가?" → thumbnail 파일 존재 확인
- gsd-verifier: "Job-status 폴링 패턴이 적용되는가?" → benchmark.js 패턴 재사용 확인

---

## Phase 6: 법적 컴플라이언스 + 과장 필터

**Goal:** 4개 포맷 각각에 제휴 고지 위치를 정의하고, 영상 내 고지 자막 최소 3초 표시 규칙을 반영하며, 과장 표현 필터(금기어 검사 + 심각도별 위반 목록 + 제안)를 구현하고, 니치 스키마 기반 금기어/제한 규칙을 적용한다. 제휴 고지문은 하드코딩하지 않고 사용자 직접 입력으로 남긴다.

**Requirements:** LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05

**Success Criteria:**
- 4개 포맷별 제휴 고지 위치 정의 (쇼츠: 영상 자막+설명란 / 카드뉴스: 마지막 슬라이드 / 인포그래픽: 이미지 하단+캡션 / 롱폼: 원고 상단)
- 고지 문구 템플릿이 legal.affiliateType에 따라 자동 선택됨 (템플릿은 안내 역할, 실제 문구는 legal.disclosureText 사용자 입력)
- 영상 내 고지 자막 최소 3초 표시 규칙 적용 (vox-content 자막 2줄 순차 규칙과 정합)
- 과장 표현 필터: 금기어(restrictions.avoidWords) 포함 검사 + 심각도별(critical/warning/info) 위반 목록 + 각 위반별 제안 반환
- 니치 스키마 기반 금기어/제한 규칙 적용 (restrictions.avoidWords, avoidPhrases, claimLimits)
- 제휴 고지문 하드코딩 금지 — legal.disclosureText 사용자 직접 입력 + "최신 약관 확인 필요" 안내
- **미결정:** 실제 다룰 제휴 프로그램(쿠팡파트너스/브랜드커넥스/기타) 확정 전 — LEGAL-01/02/05 상세 문구는 프로그램 확정 후 보완
- **v1 무손상:** 기존 필터/검증 로직 영향 없음 (신규 모듈)

**Parallelization:**
- Wave 1 (default): 고지 위치·문구 템플릿·자막 규칙(LEGAL-01, LEGAL-02, LEGAL-05)
- Wave 1: 과장 필터 + 니치 규칙(LEGAL-03, LEGAL-04)

**Agent Verification (After):**
- gsd-verifier: "4개 포맷별 고지 위치가 정의되는가?" → LEGAL-01 확인
- gsd-verifier: "영상 고지 자막 최소 3초 규칙이 적용되는가?" → LEGAL-02 확인
- gsd-verifier: "과장 필터가 금기어 검사 + 심각도별 목록을 반환하는가?" → LEGAL-03 확인
- gsd-verifier: "니치별 금기어/제한이 적용되는가?" → LEGAL-04 확인
- gsd-verifier: "제휴 고지문이 하드코딩되지 않았는가?" → LEGAL-05 확인

---

## 미결정 (로드맵 범위 밖 — 후속 보완)

- **렌더링 원격 환경 선택:** Render/Fly.io/로컬 중 최종 선택 → Phase 5 RENDER-02 실제 배포 방식
- **제휴 프로그램 확정:** 쿠팡파트너스/브랜드커넥스/기타 → Phase 6 LEGAL-01/02/05 상세 문구
- **Pixabay API 키:** 무료 티어 존재 여부 확인 → Phase 2 SHORTS-03 구현 전
- **mc 체인 DB:** 경로/스키마 버전 확인 → Phase 4 BRIDGE-01 구현 전
- **니치 목록 범위:** 첫 출시 니치 몇 개로 시작? → Phase 4/6 착수 전 결정
- **콘텐츠 코어 저장 방식 확장:** 파일 기반 → 향후 KV/DB 전환 시점

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. 콘텐츠 코어 확장 + 파일 저장 | v2.0 | 1/1 | ✅ Completed | 2026-08-09 |
| 2. 쇼츠 렌더러 | v2.0 | 1/1 | Not started | — |
| 3. 카드뉴스 + 인포그래픽 렌더러 | v2.0 | 0/1 | Not started | — |
| 4. 롱폼 렌더러 + 주제 브릿지 | v2.0 | 0/1 | Not started | — |
| 5. 렌더링 파이프라인 완성 | v2.0 | 0/1 | Not started | — |
| 6. 법적 컴플라이언스 + 과장 필터 | v2.0 | 0/1 | Not started | — |

---

*Roadmap created: 2026-08-09*  
*Last updated: 2026-08-09 after v2.0 milestone start*
