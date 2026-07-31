# PLAN — Phase 6: 두 도구 연결 + 통합 테스트 + Vercel 배포

> Created: 2026-07-31
> Phase: 6
> Requirements: R19, R20, R21, R22
> Dependencies: Phase 5 (영상 소스 생성기) 완료 후 실행

---

## Goal

전략 제안서 생성기와 영상 소스 생성기가 연결되어("2번으로 보내기") 자동 전달되고, 전체 플로우 통합 테스트 후 Vercel에 배포됨

---

## Success Criteria

- [ ] "2번으로 보내기" 버튼 클릭 시 기획안 결과가 영상 소스 생성기에 자동 전달
- [ ] 탭 전환 시 기존 입력/결과 유지 (상태 보존)
- [ ] Vercel 배포 성공 (정적 + 서버리스 함수)
- [ ] 수동 모드 E2E: 입력 → 프롬프트 생성 → 복사 → (수동 Claude) → 결과
- [ ] 자동 모드 E2E: 입력 → API 호출 → 결과 → "2번으로 보내기" → 영상 소스 생성
- [ ] PDF 다운로드 동작 확인 (일반 PDF + 제안서 PDF)

---

## Waves

### Wave 1: 전역 상태 관리 + 탭 간 전달

**Plan文件:** `01-state-management.PLAN.md`

**Tasks:**
1. `state-manager.js` 업데이트 — 탭 간 상태 전달 로직
   - `transferToVideoGenerator()` 함수: 제안서 결과를 영상 소스 생성기에 전달
   - 탭 전환 시 상태 유지 (input fields + results)
   - 상태 복원 로직

2. `app.js` 업데이트 — "2번으로 보내기" 버튼
   - 제안서 결과 영역에 "2번으로 보내기" 버튼 추가
   - 클릭 시 `transferToVideoGenerator()` 호출
   - 탭 자동 전환

3. `index.html` 업데이트 — 탭 구조 개선
   - 두 도구 간 전달 버튼 위치
   - 탭 상태 표시

**Dependencies:** None (first wave)

---

### Wave 2: 통합 E2E 테스트 + 배포

**Plan文件:** `02-e2e-deploy.PLAN.md`

**Tasks:**
1. 통합 E2E 테스트 시나리오
   - 수동 모드 전체 플로우 테스트
   - 자동 모드 전체 플로우 테스트
   - 탭 전환 상태 보존 테스트
   - PDF 다운로드 테스트

2. Vercel 배포 스크립트
   - `package.json`에 배포 스크립트 추가
   - 환경변수 설정 가이드
   - 배포 검증 체크리스트

**Dependencies:** Wave 1 완료 후

---

## Requirements Mapping

| Requirement | Task | Wave |
|-------------|------|------|
| R19: 탭 전환 (전략 제안서 생성기 ↔ 영상 소스 생성기) | state-manager.js | 1 |
| R20: "2번으로 보내기" — 기획안 결과를 영상 소스 생성기에 자동 전달 | app.js | 1 |
| R21: Vercel 배포 (serverless functions + static hosting) | vercel.json + 배포 스크립트 | 2 |
| R22: 통합 E2E 테스트: 기획안 생성 → 영상 소스 생성 전체 플로우 | 테스트 시나리오 | 2 |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 탭 전환 시 상태 유실 | sessionStorage에 상태 저장 + 복원 |
| Vercel 빌드 실패 | 로컬 빌드 테스트 후 배포 |
| API 호출 실패 시 폴백 | 수동 모드 자동 전환 + 에러 메시지 |

---

## Verification Plan

- gsd-verifier: "전체 플로우가 동작하는가?" → 기획안 생성 → 2번으로 보내기 → 영상 소스 생성 확인
- gsd-ui-checker: 탭 전환 상태 보존, 배포 URL 접근 확인
