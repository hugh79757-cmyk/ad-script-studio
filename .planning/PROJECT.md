# PROJECT — AD SCRIPT STUDIO (이커머스 숏폼 광고 대본 생성기)

## Vision

이커머스 마케터/MD가 입력한 브랜드·상품·컨셉 정보를 기반으로 **60초 숏폼 광고 대본**과 **영상 소스 제작 지시서**를 자동 생성하는 웹 기반 도구.

두 가지 핵심 도구:
1. **기획안 생성기 (Plan Generator)** — 광고 대본 + 마케팅 전략 + 스토리보드 생성
2. **영상 소스 생성기 (Video Source Generator)** — 대본을 씬 단위로 파싱하여 카메라 앵글, 무빙, 무드, 연출지시, EN 프롬프트 생성

## Goals

### Validated (이전 세션 완료)
- `skills/custom/shortform-copywriting.md` 추출 완료 — 26개 원칙 (단축 규칙 10, 공식템플릿 5, 해외캠페인 11)
- `skills/marketing/` 디렉토리에 13개 마케팅 스킬 원본 보유

### Active (이 마일스톤)
- [ ] P1: 기획안 생성기 UI 골격 — 2패널 레이아웃, 다크테마, 입력 필드, 결과 영역 (바닐라 JS 단일 HTML)
- [ ] P2: 기획안 생성 로직 + 결과 렌더링 + PDF — 템플릿 기반 생성(수동 복붙 모드), jsPDF, 복사/새로 만들기
- [ ] P3: 스킬 지침 주입 + 마케팅 원칙 표시 — 시스템 프롬프트에 shortform-copywriting.md 주입, "적용된 마케팅 원칙" 카드, 클라이언트용 PDF
- [ ] P4: Claude API 자동화 — 서버사이드 API 연동 (Vercel 서버리스 함수), 수동 모드 → 자동 모드 전환
- [ ] P5: 영상 소스 생성기 — 두 번째 도구, 씬 파싱, EN 이미지/모션 프롬프트, 상세도 조절, 카피 버튼
- [ ] P6: 두 도구 연결 + 배포 — 탭 전환, "2번으로 보내기" 자동 전달, Vercel 배포, 통합 E2E 테스트

## Success Criteria

| 기준 | 측정 방법 |
|------|----------|
| 기획안 생성기가 60초 숏폼 대본을 생성할 수 있다 | 수동 모드에서 프롬프트 출력 + 복사 가능 |
| 스킬 지침이 시스템 프롬프트에 주입되어 대본 품질이 향상된다 | "적용된 마케팅 원칙" 카드에 추출된 원칙 표시 |
| 영상 소스 생성기가 씬별 카메라/무빙/무드/연출지시를 생성한다 | EN 프롬프트 카피 버튼으로 복사 가능 |
| 두 도구가 연결되어 기획안 → 영상 소스로 자동 전달된다 | "2번으로 보내기" 버튼 클릭 시 자동 전달 |
| Vercel에 배포되어 접근 가능하다 | 배포 URL로 접속하여 전체 플로우 동작 확인 |

## Scope

### In Scope
- 기획안 생성기 (Plan Generator)
- 영상 소스 생성기 (Video Source Generator)
- 두 도구 간 탭 전환 및 자동 전달
- 스킬 지침 (단축 규칙, 공식템플릿, 해외캠페인 프레임워크) 시스템 프롬프트 주입
- 클라이언트 제안용 PDF 다운로드 (일반PDF + 제안서PDF)
- Vercel 배포 (서버리스 함수 포함)
- 수동 복붙 모드 → API 자동화 모드 점진적 전환

### Out of Scope
- 영상 편집 도구 연동
- 사용자 인증/로그인
- 결제 시스템
- 데이터베이스 저장 (클라이언트 사이드)
- 모바일 네이티브 앱

## Constraints

- **프론트엔드**: 바닐라 HTML/CSS/JS (React, Next.js 등 프레임워크 사용 안 함)
- **API 키 보안**: Anthropic API 키는 서버 사이드(Vercel 서버리스)에서만 처리, 프론트엔드에 노출 금지
- **배포**: Vercel (serverless functions + static hosting)
- **언어**: 대본 생성은 한국어, 영상 소스 프롬프트는 영어 (EN)
- **스킬 소스**: `skills/custom/shortform-copywriting.md` (26개 원칙) — 런타임에 서버리스 함수가 읽어 시스템 프롬프트에 주입

## Milestones

| # | Milestone | 상태 |
|---|-----------|------|
| 1 | AD SCRIPT STUDIO v1 (Phase 1~6) | 진행 중 |

## Notes

- 이 프로젝트는 mde2(Hugo 퍼블리셔)와 별도 독립 프로젝트
- `skills/marketing/`은 marketingskills 저장소 클론 (coreyhaines31)
- `skills/custom/shortform-copywriting.md`는 이전 세션에서 3개 카테고리(훅, CTA, 심리적 트리거)로 추출 완료
- 원본 스펙의 5단계(기본 빌드) + 6단계(스킬 연동 강화)를 6개 페이즈로 통합
- 각 페이즈는 계획 → 리서치 → 실행 순으로 진행
