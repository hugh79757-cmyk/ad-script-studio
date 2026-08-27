---
gds_state_version: 1.0
milestone: v2.0
milestone_name: 원소스 멀티유즈 콘텐츠 시스템
status: executing
last_updated: "2026-08-09T16:45:00.000Z"
last_activity: 2026-08-09
progress:
  total_phases: 2
  completed_phases: 1
  total_plans: 2
  completed_plans: 0
  percent: 50
---

# STATE — AD SCRIPT STUDIO

## Current Milestone

| Field | Value |
|-------|-------|
| Version | v2.0 (실행 중) |
| Phases | 6 (Phase 1 완료, Phase 2 진행 중, Phase 3~6 예정) |
| Current Phase | Phase 2 (쇼츠 렌더러) — 진행 중 |
| Status | 🟡 **Phase 2 진행 중 — shorts-renderer.js 구현 완료, 테스트 27/32 통과, 4개 구현 버그 수정 필요** |

## Quick Tasks Completed

| Date | Slug | Deliverable | Status |
|------|------|-------------|--------|
| 2026-08-28 | youtube-transcript-skill | 글로벌 스킬 생성 (`~/.config/opencode/skills/youtube-transcript-extraction/SKILL.md`) — v1.2.4 API gotcha + 트랜스크립트 추출/MD저장 로직 보관 | complete ✓ |

## Milestone v2 Goals

- **비전:** 하나의 콘텐츠 코어(상품/주제 정보 + 당위성 근거)로부터 쇼츠·카드뉴스·인포그래픽·롱폼 4개 포맷을 생성하는 **원소스 멀티유즈 콘텐츠 시스템**
- **핵심 확장:** v1 전략 제안서 생성기 무손상 유지 + Python 파이프라인(vox-content 계승) + 외부 API(Pexels/Pixabay, edge-tts, Pollinations.ai, Whisper) + 제휴 고지 + 과장 필터
- **Requirements:** 27개 (CORE-01~05, SHORTS-01~07, CARDS-01~02, INFOGRAPHIC-01~02, LONGFORM-01~02, BRIDGE-01~03, RENDER-01~04, LEGAL-01~05)

## v1 아카이브 (참고)

- **Vision:** E-commerce **전략 제안서 생성기** (대본 생성기가 아님)
- **Phases:** 7 phases — UI(확장입력), 대본(구성요소), **당위성엔진+제안서(핵심)**, API, 영상소스(내부용), 배포 + Phase 7(벤치마킹 분석기)
- **Requirements:** 27 total (R1-R27)
- **Status:** ✅ **완료 (2026-08-01)** — 프로덕션 배포(https://ad-script-studio.vercel.app) + 수동/자동 모드 E2E + PDF 한글 폰트 최적화(v1.0.1) + Phase 7 UAT 12/12

## Artifact Inventory (v1 검증 완료)

| Artifact | 상태 | 위치 |
|----------|------|------|
| PROJECT.md | [검증됨] | `.planning/PROJECT.md` |
| ROADMAP.md | [갱신 필요] | `.planning/ROADMAP.md` — v2 반영 예정 |
| REQUIREMENTS.md | [검증됨] | `.planning/REQUIREMENTS.md` — v2 27개 요구사항 |
| config.json | [검증됨] | `.planning/config.json` |
| MILESTONE_SUMMARY-v1.md | [검증됨] | `.planning/reports/MILESTONE_SUMMARY-v1.md` |
| shortform-copywriting.md | [검증됨] | `skills/custom/shortform-copywriting.md` (26개 원칙) |
| STATE.md | [갱신 중] | `.planning/STATE.md` |
| research/STACK.md | [검증됨] | `.planning/research/STACK.md` — 스택 리서치 |
| research/FEATURES.md | [검증됨] | `.planning/research/FEATURES.md` — 기능 리서치 |
| research/ARCHITECTURE.md | [검증됨] | `.planning/research/ARCHITECTURE.md` — 아키텍처 리서치 |
| research/PITFALLS.md | [검증됨] | `.planning/research/PITFALLS.md` — 함정 리서치 |

## Next Actions (v2)

1. **ROADMAP.md v2 작성** — 6개 Phase 구조로 갱신 (현재)
2. **Phase 1 플랜 생성** — 콘텐츠 코어 확장 + 파일 저장 (CORE-01~05)
3. **Phase 2~6 순차 플랜·실행** — 쇼츠/카드뉴스+인포그래픽/롱폼+브릿지/렌더링/법적컴플라이언스

## Git History

```
3a2417c fix(7-02): escape non-numeric view counts before innerHTML insert
4952cd8 style(7-02): add .benchmark-result container margin rule
30e6af4 feat(7-02): add benchmark tab styles — .benchmark-* classes (additive)
08fca8d feat(7-02): add benchmark analyzer tab UI + polling + result rendering
156157a feat(7-02): add benchmark tab button/container/script + state-manager benchmark slot
9306ebe docs(7-03): add APIFY/OPENAI env documentation to ENVIRONMENT-GUIDE
cdfe74f chore(7-03): add benchmark maxDuration 300 + APIFY/OPENAI env entries
1dcfc92 feat(7-01): add benchmark API — POST job + GET polling KV stage machine
0e6a6a2 feat(6-02): E2E 테스트 + 배포 스크립트 + 환경변수 가이드
6493f74 docs(06-1): complete state management plan — SUMMARY + STATE update
6334855 feat(06-1): add '2번으로 보내기' button + initTabPersistence to DOMContentLoaded
d69a74f feat(06-1): add tab state management — tabState, transferToVideoGenerator, switchTab, initTabPersistence
e262a34 feat(05-2): add tool tab switching + video generator integration
1f0c625 docs(05-1): complete scene parser plan — SUMMARY + STATE update
de0cc65 feat(05-1): add scene parser + video prompt generator UI
abc99fc docs(5): Phase 5 플랜 생성 — 영상 소스 생성기 (내부용 재료 도구)
f17440f docs(6): Phase 6 플랜 생성 — 두 도구 연결 + 통합 테스트 + 배포
2da0bc9 feat(04-02): 프론트엔드 API 호출 + 모드 전환 UI 구현
667eca3 feat(4-1): add Vercel serverless API + deployment config
dc4852d docs: initialize GSD planning for AD SCRIPT STUDIO
```

## Risk Register

| Risk | Severity | Status |
|------|----------|--------|
| Vercel serverless CWD for skill file access | High | Planned mitigation: bundle file |
| Korean font in jsPDF | Medium | Planned mitigation: CDN font |
| Claude API rate limits | Medium | Planned mitigation: retry logic |
| 당위성 엔진 수동 모드의 공허한 템플릿 문구 | Medium | 자동 모드 전환 유도 UX 고려 |
| 기대효과 섹션의 수치 오해 가능성 | Medium | 조건부 표현("일반적으로") 사용 |

## Version History

| Version | Date | Notes |
|---------|------|-------|
| v2-phase2-task1 | 2026-08-09 | Phase 2 Task1 완료: api/content/shorts-renderer.js (대본 생성, 씬 파싱, 이미지 프롬프트, 축약 함수) + test-shorts-renderer.mjs (Task1~5 테스트). Commit: a7004bf. Task2~5 테스트 수정 중 (27/32 통과). |
| v2-phase1-done | 2026-08-09 | Phase 1 완료: api/content/core.js (CORE_SCHEMA 7그룹·30+필드 + saveCore/loadCore/listCampaigns/validateCore/fromAppState/toAppState), content/campaigns/.gitkeep, test-content-core.mjs (104 assertions). v1 무손상 확인. Commit: 9440ed7. |
| v1-refactor | 2026-07-31 | 리팩터링: 전략 제안서 중심 재정의. Phase 3 핵심 격상. R23-R27 신규. Requirements 22→27. |
| v1-phase2-plan | 2026-07-31 | Phase 2 플랜 생성: template-plan.js, pdf.js, app.js 업데이트. Wave 1 (단일 웨이브). |
| v1-phase2-done | 2026-07-31 | Phase 2 구현 완료: template-plan.js, pdf.js, app.js 업데이트, index.html CDN 추가, style.css UI 스타일 추가. |
| v1-phase3-done | 2026-07-31 | Phase 3 구현 완료: skill-loader.js, rationale-engine.js, proposal-pdf.js, proposal-layout.js, problem-diagnosis-template.js, expected-effects-template.js 생성. Wave 2 템플릿 통합 완료. |
| v1-phase4-wave1 | 2026-07-31 | Phase 4 Wave 1 완료: api/generate.js (Claude API 서버리스 함수 + 26원칙 시스템 프롬프트), vercel.json (배포 설정) 생성. |
| v1-phase4-done | 2026-07-31 | Phase 4 완료: app.js API 호출 로직 + 모드 전환 UI + 로딩 스피너 추가. 수동/자동 모드 전환 동작. |
| v1-phase5-wave1 | 2026-07-31 | Phase 5 Wave 1 완료: template-video.js (씬 파싱 + EN 프롬프트 생성), video-ui.js (영상 소스 생성기 UI) 생성. |
| v1-phase5-done | 2026-07-31 | Phase 5 완료: app.js 탭 전환 로직 추가, index.html 탭 UI + 비디오 컨테이너 추가, style.css 탭+비디오 스타일 추가. 영상 소스 생성기 탭 전환 동작. |
| v1-phase6-wave1 | 2026-07-31 | Phase 6 Wave 1 완료: state-manager.js 탭 상태 관리(tabState, saveProposalResults, transferToVideoGenerator, switchTab, initTabPersistence), app.js "2번으로 보내기" 버튼 추가. 제안서→영상 소스 생성기 연결 완료. |
| v1-phase6-done | 2026-07-31 | Phase 6 완료 (Milestone v1 완료): test-e2e.js (E2E 테스트), package.json (배포 스크립트), deploy.sh (자동화 배포), ENVIRONMENT-GUIDE.md (환경변수 가이드) 생성. 두 도구 연결 + 통합 테스트 + 배포 인프라 구축 완료. |
| v1-phase7-plan | 2026-08-01 | Phase 7 플랜 생성: 벤치마킹 대본 분석기 (R28~R35 신규 추가, ROADMAP 반영). Wave 1(backend API)/Wave 2(frontend 탭)/Wave 3(config/docs) 구성. |
| v1-phase7-wave1 | 2026-08-01 | Phase 7 Wave 1 완료: api/benchmark.js (KV 스테이지 머신 — POST job 생성 + Apify run 시작 / GET 폴링 crawling→transcribing→analyzing→done, 서버 강제 비용 상한). 오프라인 검증 통과 (11 unit groups + 82 inline assertions). 실 API E2E는 사용자 키 체크포인트 후 진행. |
| v1-phase7-wave2 | 2026-08-01 | Phase 7 Wave 2 완료: benchmark-analyzer.js (벤치마킹 탭 UI + POST job + 6s setInterval 폴링 + 진행 스테이퍼 + (a)~(d) 4종 결과 렌더 + 카피 버튼), index.html 탭 버튼/컨테이너/script 1줄, state-manager.js benchmarkResults 슬롯 + saveBenchmarkResults, style.css .benchmark-* 35개 클래스 추가. 오프라인 검증 통과 (62 assertions). 기존 2탭 무손상(additive). 실 브라우저 E2E는 사용자 키 체크포인트 후 진행. |
| v1-phase7-wave3 | 2026-08-01 | Phase 7 Wave 3 완료: vercel.json functions.api/benchmark.js maxDuration 300 + env 블록 APIFY_API_TOKEN/OPENAI_API_KEY(@-sentinel) 추가(기존 KV 2개 보존), ENVIRONMENT-GUIDE.md 신규 환경변수 문서(발급 방법 2섹션·벤치마킹 API curl·비용 안내 \$0.13~0.16·상한 정책·엔드포인트 표 2행) 반영. 오프라인 검증 통과 (node JSON 파싱 + grep). 실 배포 검증은 키 체크포인트 후. |
| v1-phase7-uat | 2026-08-01 | Phase 7 UAT 완료: UAT 12/12 통과 (실제 gymshark 계정 E2E 포함 — POST job → 폴링 stage 전이 → 전사/분석/대본 재조립). 분석 프로바이더 체인 문서 정정. |
| v1-0-1-font | 2026-08-01 | PDF 한글 폰트 최적화: CDN 변수 폰트(10.4MB) fetch 제거 → 로컬 서브셋(1.1MB, KS X 1001 2,350자+224+기호988+자모/라틴) base64 임베딩 + AbortController 10초 타임아웃 + 기본 폰트 폴백. PDF 817KB→316KB (61% 감소), 글리프 누락 0. 프로덕션 배포 + E2E 재검증 완료. |
| v1-final | 2026-08-01 | **v1 전체 실증 검증 완료 (프로덕션 배포 + E2E + PDF 한글 폰트 최적화 포함)**. Phase 1~7 모두 구현/검증 완료. Proposal PDF 라이트 테마 전환 (가독성 이슈 해결 — 흰 배경+어두운 텍스트). v1.1 후보는 BACKLOG.md로 이관. |

## Current Position

Phase: Phase 2 (진행 중)
Plan: 02-01-shorts-renderer (진행 중 — 27/32 테스트 통과)
Status: 구현 버그 수정 필요 — 4개 테스트 실패 (fetchPollinationsImage, fetchImagesForShorts, extractImageKeywords, purpose.stage CTA 차별화)
Last activity: 2026-08-09 — Phase 2 Task1 커밋 완료, Task2~5 테스트 작성 및 수정 중
