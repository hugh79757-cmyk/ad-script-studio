# Requirements: AD SCRIPT STUDIO v2 — 원소스 멀티유즈 콘텐츠 시스템

**Defined:** 2026-08-09  
**Core Value:** 하나의 콘텐츠 코어에서 쇼츠·카드뉴스·인포그래픽·롱폼 4개 포맷을 생성하는 원소스 멀티유즈 시스템. v1의 전략 제안서 생성기를 무손상 유지하며 확장.  
**Research:** 완료 (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md)

---

## v2 Requirements

### CORE — 콘텐츠 코어

- [ ] **CORE-01**: 콘텐츠 코어 YAML 스키마 정의 — 7개 그룹(식별·메타 / 제품 / 타겟·목적 / 메시지·당위성 / 근거자료 / 법적고지 / 깊이단계 소구점) 30+ 필드
- [ ] **CORE-02**: `campaignId` 기반 캠페인 디렉토리 자동 생성 (`content/campaigns/{campaignId}/core.yaml`)
- [ ] **CORE-03**: 콘텐츠 코어 저장·불러오기·목록 조회 (파일 기반, 추후 KV 전환 가능한 인터페이스)
- [ ] **CORE-04**: v1 `appState`(10개 필드) → 콘텐츠 코어 변환 함수 (`fromAppState`/`toAppState`)
- [ ] **CORE-05**: `purpose.stage` enum(인지/고려/결정) + mc 깊이단계(`depth.basic/applied/advanced`) 소구점 필드

### SHORTS — 쇼츠 렌더러

- [ ] **SHORTS-01**: 콘텐츠 코어 기반 60초 숏폼 대본 생성 (v1 template-plan.js 확장, 7장면 템플릿 + 15/30초 축약)
- [ ] **SHORTS-02**: 대본 → 씬 파싱 + EN 이미지 프롬프트 생성 (v1 template-video.js 계승, 최소 3/최대 10씬, 상세도 조절)
- [ ] **SHORTS-03**: Pixabay API 기반 실사 이미지 검색·다운로드 (장면별 키워드 → images/ 저장, 출처 로그)
- [ ] **SHORTS-04**: Pollinations.ai(Flux) 기반 AI 이미지 생성 프롬프트 + 실행 (익명 15초당 1회 제한 인지, API 키 옵션)
- [ ] **SHORTS-05**: edge-tts 기반 장면별 한국어 TTS 생성 (ko-KR-SunHiNeural, audio/ 저장)
- [ ] **SHORTS-06**: 렌더링 준비 완료 상태 출력 — 대본 + 씬별 프롬프트 + TTS + 이미지 경로까지 생성하고, 실제 렌더링(moviepy)은 "준비 완료"로 표시 (Phase 5로 이연)
- [ ] **SHORTS-07**: 쇼츠 결과물 카피 버튼 (장면별 / 전체)

### CARDS + INFOGRAPHIC — 카드뉴스·인포그래픽 렌더러

- [ ] **CARDS-01**: 카드뉴스 슬라이드별 출력 — 한국어 카피 + 시각 지시 + EN 이미지 프롬프트 (슬라이드 수 자동 결정, 최소 5장)
- [ ] **CARDS-02**: 마지막 슬라이드 제휴 고지 삽입 (legal.disclosureText 반영)
- [ ] **INFOGRAPHIC-01**: 인포그래픽 데이터 출력 — 가격/경쟁사/리뷰 통계 기반 비교 데이터 + 시각 구성 지시
- [ ] **INFOGRAPHIC-02**: 수치·비교 주장 과장 검증 플래그 (근거 필드 없는 수치 주장 표시)

### LONGFORM + BRIDGE — 롱폼 렌더러 + 주제 브릿지

- [ ] **LONGFORM-01**: 롱폼 원고 생성 — mc 깊이단계(기초/응용/고급) 구조 적용, 니치 스키마 톤/금기어 반영, 분량 목표 1500~3000자
- [ ] **LONGFORM-02**: 롱폼 제휴 고지 삽입 (원고 상단, legal.disclosureText 반영)
- [ ] **BRIDGE-01**: 주제 브릿지 인터페이스 — mc 블로그 체인 주제(시드 키워드+깊이단계 소제목+니치 태그) 목록 조회 + 사용자 선택
- [ ] **BRIDGE-02**: 선택된 주제 → 콘텐츠 코어 초안 자동 적재 (concept, depth, niche까지. price/competitor/reviews는 수동 입력 필요로 명시)
- [ ] **BRIDGE-03**: 주제 브릿지 1단계는 수동 입력/URL 입력(옵션 C)으로 시작 — 정적 YAML 카탈로그(옵션 A)는 후속

### RENDER — 렌더링 파이프라인 완성

- [ ] **RENDER-01**: Whisper small 모델 기반 장면별 SRT 자막 생성 (로컬 실행, audio/*.mp3 → subtitles/*.srt, 한국어)
- [ ] **RENDER-02**: moviepy 렌더링 — 12fps/1920x1080/Ken Burns/PIP 실사 인서트(우하단 무레이블 테두리)/2줄 자막/0.5초 크로스디졸브/output/vox_content_final.mp4
- [ ] **RENDER-03**: 썸네일 생성 — assets/prompts/thumbnail_prompt.md 기반 이미지 + make_thumbnail.py 텍스트 오버레이 (이모지 금지)
- [ ] **RENDER-04**: 쇼츠 파이프라인 Job-status 폴링 패턴 적용 (v1 benchmark.js 패턴 재사용, 전체 3~15분 소요 대비)

### LEGAL — 법적 컴플라이언스 + 과장 필터

- [ ] **LEGAL-01**: 4개 포맷별 제휴 고지 위치 정의 + 고지 문구 템플릿 (코어 legal.affiliateType에 따라 자동 선택)
- [ ] **LEGAL-02**: 영상 내 고지 자막 최소 3초 표시 규칙 (vox-content 자막 2줄 순차 규칙과 정합)
- [ ] **LEGAL-03**: 과장 표현 필터 — 금기어(restrictions.avoidWords) 포함 검사 + 심각도별(critical/warning/info) 위반 목록 + 제안 반환
- [ ] **LEGAL-04**: 니치 스키마 기반 금기어/제한 규칙 적용 (니치별 restrictions.avoidWords / avoidPhrases / claimLimits)
- [ ] **LEGAL-05**: 제휴 고지문 하드코딩 금지 — legal.disclosureText 사용자 직접 입력 + 최신 약관 확인 안내

---

## 미결정 (요구사항 블록 아님 — 설계 문서 미결정 사항, 후속 보완)

- **제휴 프로그램 확정**: 실제 다룰 프로그램(쿠팡파트너스/브랜드커넥스/기타) 확정 전 → LEGAL-01/02/05 상세 문구는 프로그램 확정 후 보완
- **렌더링 원격 환경 선택**: Render/Fly.io/로컬 중 최종 선택 전 → RENDER-02 실제 배포 방식은 환경 결정 후 확정
- **Pixabay API 키**: 무료 티어 존재 여부 확인 필요 → SHORTS-03 구현 전 확인
- **mc 체인 DB**: 경로/스키마 버전 확인 필요 → BRIDGE-01 구현 전 확인

---

## Out of Scope

| 기능 | 이유 |
|------|------|
| Vercel 서버리스 내 moviepy/Whisper 실행 | Vercel에 ffmpeg 미포함 + 300초 타임아웃으로 불가 (PITFALLS.md #1) |
| v1 전략 제안서 생성기 수정 | 메인 기능 무손상 유지 (제약 조건) |
| v1 template-video.js/video-ui.js 즉시 삭제 | 쇼츠 렌더러 완성 후 별도 phase 정리 대상 |
| YouTube 자동 업로드 (Phase 5 완성 후에도) | OAuth + quota + 업로드 설정 복잡, v2 범위 밖 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Pending |
| CORE-05 | Phase 1 | Pending |
| SHORTS-01 | Phase 2 | Pending |
| SHORTS-02 | Phase 2 | Pending |
| SHORTS-03 | Phase 2 | Pending |
| SHORTS-04 | Phase 2 | Pending |
| SHORTS-05 | Phase 2 | Pending |
| SHORTS-06 | Phase 2 | Pending |
| SHORTS-07 | Phase 2 | Pending |
| CARDS-01 | Phase 3 | Pending |
| CARDS-02 | Phase 3 | Pending |
| INFOGRAPHIC-01 | Phase 3 | Pending |
| INFOGRAPHIC-02 | Phase 3 | Pending |
| LONGFORM-01 | Phase 4 | Pending |
| LONGFORM-02 | Phase 4 | Pending |
| BRIDGE-01 | Phase 4 | Pending |
| BRIDGE-02 | Phase 4 | Pending |
| BRIDGE-03 | Phase 4 | Pending |
| RENDER-01 | Phase 5 | Pending |
| RENDER-02 | Phase 5 | Pending |
| RENDER-03 | Phase 5 | Pending |
| RENDER-04 | Phase 5 | Pending |
| LEGAL-01 | Phase 6 | Pending |
| LEGAL-02 | Phase 6 | Pending |
| LEGAL-03 | Phase 6 | Pending |
| LEGAL-04 | Phase 6 | Pending |
| LEGAL-05 | Phase 6 | Pending |

**Coverage:**
- v2 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---

*Requirements defined: 2026-08-09*  
*Last updated: 2026-08-09 after v2 milestone research*
