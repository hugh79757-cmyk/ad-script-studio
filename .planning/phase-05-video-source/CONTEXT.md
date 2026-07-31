# CONTEXT — Phase 5: 영상 소스 생성기 (내부용 재료 도구)

> Created: 2026-07-31

---

## Overview

Phase 5은 이미지/영상 생성 AI에 바로 넣을 수 있는 텍스트 프롬프트를 생성하는 내부용 도구입니다. 사용자 본인만 보는 도구이므로 UI 완성도보다 기능 정확도가 중요합니다.

---

## Current State

### Completed Phases
- Phase 1: UI 골격 + 입력 필드 확장 ✓
- Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF ✓
- Phase 3: 당위성 엔진 + 설득형 제안서 문서화 ✓
- Phase 4: Claude API 자동화 ✓

---

## Key Files

| File | Description |
|------|-------------|
| `app.js` | 메인 애플리케이션 로직 (탭 전환 추가 예정) |
| `template-plan.js` | 기존 대본 템플릿 (참고용) |
| `video-ui.js` | 영상 소스 생성기 UI (신규) |
| `template-video.js` | 씬 파싱 + 프롬프트 생성 (신규) |

---

## Technical Requirements

1. **씬 파싱:** 60초 대본 텍스트를 씬 단위로 분리
   - 타임라인 패턴: `0:00-0:03`, `[0:00]` 등
   - 최소 3개, 최대 10개 씬

2. **프롬프트 생성:** 각 씬별
   - EN 이미지 프롬프트 (영어)
   - 모션 프롬프트 (영어)
   - 공통 스타일 접미사

3. **상세도 조절:**
   - 최소: 핵심 키워드만
   - 보통: 문장 형태
   - 상세: 구체적 묘사 + 참조

4. **카피 기능:**
   - 개별 프롬프트 카피
   - 전체 복사

---

## UI 간소화 원칙

- 과도한 레이아웃/설명 텍스트 불필요
- 기능만 정확히 동작하면 됨
- 클라이언트향 UI가 아님 (내부용)

---

## Sample Output

```
씬 1 (0:00-0:03)
이미지 프롬프트: "A young woman in her 20s looking surprised, holding a product, bright lighting, clean background"
모션 프롬프트: "Quick zoom-in on face, slight camera shake for emphasis"
스타일 접미사: "--style raw --ar 9:16"

씬 2 (0:03-0:06)
이미지 프롬프트: "Close-up of product with sparkling effects, floating particles"
모션 프롬프트: "Smooth pan across product, soft focus transition"
스타일 접미사: "--style raw --ar 9:16"
```
