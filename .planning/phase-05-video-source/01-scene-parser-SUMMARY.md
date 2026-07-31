# Phase 5 Plan 1: Scene Parser + Video Prompt Generator Summary

> Phase: 5 (영상 소스 생성기 — 내부용 재료 도구)
> Wave: 1
> Requirements: R15, R16, R17

---

## One-liner

씬 단위 대본 파싱 + EN 이미지/모션 프롬프트 생성 모듈 및 내부용 UI 구현

## What Was Built

### template-video.js (신규)
- `parseScriptToScenes(scriptText)` — 60초 대본을 타임라인 패턴으로 씬 단위 파싱 (최소 3개, 최대 10개)
- `splitScenesEqually(scriptText, targetCount)` — 씬 부족 시 균등 분할 fallback
- `generateImagePrompt(scene, detailLevel)` — 씬별 EN 이미지 프롬프트 생성 (최소/보통/상세)
- `generateMotionPrompt(scene, detailLevel)` — 씬별 모션 프롬프트 생성 (한국어 키워드→영어 모션 매핑)
- `extractVisualElements(text)` — 한국어 텍스트에서 인물/제품/감정/배경 시각 요소 추출
- `getStyleSuffix()` — 공통 스타일 접미사 (`--style raw --ar 9:16`)
- `generateAllPrompts(scriptText, detailLevel)` — 전체 프롬프트 생성 오케스트레이터

### video-ui.js (신규)
- `initVideoUI()` — `#videoGeneratorUI`에 영상 소스 생성기 UI 렌더링
- `bindVideoEvents()` — 상세도 선택 버튼 + 프롬프트 생성 버튼 이벤트 바인딩
- `renderVideoResults(prompts)` — 프롬프트 카드 렌더링 (이미지/모션/스타일)
- `bindCopyButtons(prompts)` — 개별/전체 클립보드 복사 버튼 바인딩

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `escapeHtml()`는 app.js에서 재사용 (video-ui.js에서 재정의 안 함) | DRY 원칙, 기존 함수 존재 확인 |
| 씬 수 제한: 최소 3개, 최대 10개 | 내부용 도구이므로 과도한 씬 분할 방지 |
| 모션 프롬프트: 한국어 키워드→영어 매핑 방식 | 한국어 대본 직접 분석보다 안정적 |
| 상세도 3단계 (최소/보통/상세) | 내부 사용 목적에 충분한 유연성 |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions are fully implemented with working logic.

## Metrics

| Metric | Value |
|--------|-------|
| Files created | 2 |
| Lines added | 342 |
| Functions implemented | 11 (7 in template-video.js + 4 in video-ui.js) |
| Commits | 1 |
| Duration | ~2 min |

## Self-Check: PASSED

- [✅] `template-video.js` 존재, 문법 검증 통과
- [✅] `video-ui.js` 존재, 문법 검증 통과
- [✅] `parseScriptToScenes()` 함수 존재 — `node -e` 테스트 통과
- [✅] `generateImagePrompt()` 함수 존재
- [✅] `generateMotionPrompt()` 함수 존재
- [✅] `generateAllPrompts()` 함수 존재 — 3개 씬 생성 확인
- [✅] `initVideoUI()` 함수 존재
- [✅] `bindVideoEvents()` 함수 존재
- [✅] `renderVideoResults()` 함수 존재
- [✅] `bindCopyButtons()` 함수 존재
- [✅] 커밋 `de0cc65` 존재 확인
