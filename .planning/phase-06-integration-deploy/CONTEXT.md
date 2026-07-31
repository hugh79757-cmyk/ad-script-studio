# CONTEXT — Phase 6: 두 도구 연결 + 통합 테스트 + Vercel 배포

> Created: 2026-07-31

---

## Overview

Phase 6은 전략 제안서 생성기(Tool 1)와 영상 소스 생성기(Tool 2)를 연결하고, 전체 플로우를 통합 테스트한 후 Vercel에 배포하는 단계입니다.

---

## Current State

### Completed Phases
- Phase 1: UI 골격 + 입력 필드 확장 ✓
- Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF ✓
- Phase 3: 당위성 엔진 + 설득형 제안서 문서화 ✓
- Phase 4: Claude API 자동화 ✓

### Pending Phases
- Phase 5: 영상 소스 생성기 (내부용 재료 도구) — Planning needed

---

## Key Files

| File | Description |
|------|-------------|
| `app.js` | 메인 애플리케이션 로직 |
| `state-manager.js` | 전역 상태 관리 |
| `index.html` | 메인 HTML |
| `style.css` | 스타일 |
| `api/generate.js` | Claude API 서버리스 함수 |
| `vercel.json` | Vercel 배포 설정 |

---

## Dependencies

- Phase 5 완료 후 Phase 6 실행 가능
- 영상 소스 생성기 UI가 존재해야 "2번으로 보내기" 기능 테스트 가능

---

## Technical Constraints

1. ** 상태 보존:** 탭 전환 시 입력 필드 + 결과 모두 유지 필요
2. **API 의존성:** 자동 모드는 Claude API 키 필요
3. **정적 호스팅:** Vercel은 정적 파일 + 서버리스 함수 지원
4. **한국어 UI:** 모든 텍스트 한국어

---

## Success Metrics

- 전체 E2E 테스트 통과
- Vercel 배포 성공
- 사용자가 두 도구 간 전달 기능 사용 가능
