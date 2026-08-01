---
phase: 7
plan: 2
subsystem: frontend-tab
tags: [benchmark, tab-ui, polling, stepper, clipboard, vanilla-js, additive]
requires: [R28, R35]
provides: [R28, R35]
affects: [Wave 3 (03-config-docs), Phase 3 연동 포인트 (saveBenchmarkResults)]
tech-stack:
  added: [benchmark-analyzer.js — 바닐라 JS 단일 모듈 (신규 의존성 0건)]
  patterns: [video-ui.js copy 버튼(navigator.clipboard), app.js escapeHtml, state-manager.js saveProposalResults 패턴, 이벤트 위임으로 app.js 소유 initToolTabs 무수정]
key-files:
  created: [benchmark-analyzer.js]
  modified: [index.html, state-manager.js, style.css]
decisions:
  - "탭 초기화는 이벤트 위임(delegation) — app.js 소유 initToolTabs/switchTab를 건드리지 않고, 벤치마킹 탭 최초 클릭 시 document 클릭 리스너가 window.__benchmarkInit 가드로 renderBenchmarkUI() 1회 호출"
  - "폴링 6초 고정(BM_POLL_INTERVAL=6000, 5~8초 권장 구간 내) + 15분 클라이언트 중단(BM_MAX_WAIT_MS) — 서버 MAX_POLLS=120과 정합"
  - "탭 이탈(다른 .tool-tab 클릭)·pagehide(세션 종료) 시 clearInterval — 폴링 중단 시 서버 lazy progression도 함께 일시 정지되는 설계와 정합"
  - "폴링 중 비OK 응답 중 파싱 가능한 오류 메시지(예: 키 미설정 500)는 즉시 종료, 파싱 불가(네트워크/HTML 5xx)는 일시 오류로 간주해 15분 상한까지 계속 폴링"
  - "done 시 saveBenchmarkResults(data) 호출 — state-manager 슬롯·sessionStorage 'benchmarkResults'로 Phase 3 연동 포인트 개방 (이번 Phase에서 소비는 안 함)"
  - "likesCount 방어적 렌더 — 백엔드 selectViralReels가 likesCount를 미전송하므로 필드 존재 시에만 표시 (백엔드 추가 시 자동 노출)"
metrics:
  duration_minutes: 25
  completed: 2026-08-01
  tests: 62 offline assertions (DOM/fetch 스텁 기반, 상세는 Verification 섹션)
---

# Phase 7 Plan 2: Frontend — 벤치마킹 탭 (UI + 폴링 + 렌더링) Summary

## One-liner

기존 2탭(proposal/video)을 무수정으로 유지한 채 벤치마킹 분석기 탭을 추가하고, `benchmark-analyzer.js` 단일 모듈에 IG 입력 폼 → POST job 생성 → 6초 setInterval 폴링 → 진행 스테이퍼 → (a)바이럴 릴스 (b)전사 대본 (c)구조 해부 (d)새 대본 초안 4종 결과 렌더 + 카피 버튼을 응집 구현한 Wave 2

## What Was Built

**`benchmark-analyzer.js` (신규, 단일 파일 500줄)**

1. **탭 lazy 초기화 (app.js 무수정)** — `document` 클릭 위임으로 `data-tab="benchmark"` 최초 클릭 시 `window.__benchmarkInit` 가드 후 `renderBenchmarkUI()` 1회 호출. 기존 `initToolTabs`(app.js 소유)가 탭 전환 클래스를 계속 담당하므로 충돌 없음
2. **입력 폼** — IG 계정 URL/아이디(필수, 빈 값 alert + 100자 초과 alert), 브랜드명/키워드(선택), maxReels select 3/4/5(기본 5 — 서버가 3~5로 재클램프) → `POST /api/benchmark` → jobId 수신
3. **폴링** — `setInterval(6000ms)`로 `GET /api/benchmark?id=` 반복. 15분 초과 시 클라이언트 중단(서버 `failed(timeout)`과 정합). done → clearInterval + `renderResult` + `saveBenchmarkResults(data)`. failed → clearInterval + 한국어 오류. 비OK+오류 메시지 → 즉시 종료, 일시 오류 → 15분 상한까지 재시도. 탭 이탈(다른 탭 클릭)/`pagehide` → clearInterval
4. **진행 스테이퍼** — 크롤링→전사→분석→완료 4스텝(active/complete 상태) + 단계별 한국어 상태 텍스트 + 진행 중 축적 렌더(릴스/전사 도착 시 점진 표시)
5. **done 결과 4종** — (a) 바이럴 릴스 카드(조회수 천단위 포맷/좋아요 방어적/릴스 링크 `rel="noopener noreferrer"`/캡션) (b) 전사 대본 카드(`[음성 인식 불가]`/`[용량 초과로 전사 제외]` 배지 + 세그먼트 타임스탬프 m:ss) (c) 공통 구조 해부(훅/전개/클로징) (d) 새 대본 초안(권장 길이 + 타임라인) — 각 섹션 카피 버튼(`navigator.clipboard`, video-ui.js 패턴)
6. **오류/보안** — 실패/타임아웃 → 한국어 오류 + "다시 시도" 버튼(현재 입력값으로 재시작). 모든 서버 데이터 렌더 경로 `bmEscapeHtml` 이스케이프(캡션/전사/구조/대본/오류 메시지/URL) + 비수치 카운트 폴백 이스케이프

**`index.html` (수정 — 추가만 11줄)**
- `.tool-tabs`에 `<button class="tool-tab" data-tab="benchmark">벤치마킹 분석기</button>` 1개
- `.tool-contents`에 `<div id="benchmark-tool" class="tool-content"><div id="benchmarkAnalyzerUI"></div></div>` 1개
- `<script src="benchmark-analyzer.js"></script>` 1줄 (기존 로드 순서 유지, app.js 앞)

**`state-manager.js` (수정 — 최소)**
- `tabState.benchmarkResults: null` 슬롯 + `saveBenchmarkResults(results)` (sessionStorage `benchmarkResults`, saveProposalResults 패턴 미러링 — Phase 3 연동 포인트)

**`style.css` (수정 — 추가만 357줄)**
- `.benchmark-*` 35개 클래스: 입력 섹션/시작 버튼/진행 스테이퍼(active/complete/arrow)/결과 카드 4종/카피 버튼/오류 박스/다시 시도. 기존 다크테마 변수(`--text-primary`/`--bg-secondary`/`--border-color`/`--accent-color`/`--success-color`) 재사용, 기존 규칙 0건 수정

## Verification

### [검증됨] — 오프라인 검증 (브라우저 E2E 0회, DOM/fetch 스텁 기반)

| 항목 | 근거 |
|------|------|
| `node --check benchmark-analyzer.js` | 실행 결과 "SYNTAX OK" (최종 수정 후 재실행 포함) |
| `node --check state-manager.js` | 실행 결과 "SYNTAX OK" (기존 함수 무수정 확인) |
| 오프라인 기능 테스트 62개 단언 | `/var/folders/.../opencode/benchmark-frontend-offline-test.mjs` 실행 — `62 passed, 0 failed`. 순수 헬퍼 8(bmEscapeHtml/bmFormatCount/bmFormatSeconds), 스테이퍼 11(crawling→transcribing→done→failed 상태 전이), 카피 텍스트 빌드 6(구조/대본/전사/세그먼트/인덱스 초과), 결과 렌더 17((a)~(d) 4종 + XSS 이스케이프 + likesCount 방어), 오류 렌더 2, **폴링 플로우 12(스텁 fetch로 crawling→transcribing→analyzing→done 4틱: clearInterval/saveBenchmarkResults 호출 확인)**, failed 플로우 3, 오류 응답 2, 15분 타임아웃 2(Date.now 조작), clearBenchmarkPolling 2 |
| additive diff 검증 | `git diff` — index.html 11줄/state-manager.js 9줄/style.css 357줄 **모두 추가만**. 삭제된 기존 줄은 state-manager.js `videoResults` 줄의 trailing comma 1곳뿐(3번째 속성 추가를 위한 JS 문법 필수 — 플랜 스케치와 동일, 동작 변화 없음) |
| app.js 무수정 | `git status --short`에 app.js 미등장 (변경 0건) |
| grep 확인 | 탭 버튼(index.html:123), 컨테이너(index.html:164-165), script 태그(index.html:184, app.js:185 앞), `saveBenchmarkResults`(state-manager.js:133) + `benchmarkResults` 슬롯(:116), `.benchmark-*` CSS 클래스 35개 |
| JS-발생 클래스 vs CSS 커버리지 | `comm` 교차 검증 — JS가 emit하는 `.benchmark-*` 37종 중 CSS 규칙 없는 것은 `benchmark-reel-likes`/`benchmark-reel-duration` 2종뿐(모두 `.benchmark-reel-meta` 플렉스 컨테이너 내부 스팬으로 의도적 무스타일, 상속 스타일 적용됨) |

### [부분검증] — 스텁 기반으로 확인했으나 실 DOM/브라우저와 차이 가능성

| 항목 | 제한 사유 |
|------|-----------|
| 브라우저 실렌더 (3탭 표시/전환/스테이퍼 레이아웃/카피 클립보드) | DOM을 최소 스텁으로 대체 — 실제 레이아웃/클립보드 권한/이벤트 순서(app.js initToolTabs와 위임 리스너의 버블 순서)는 브라우저에서만 확인 가능. 계획대로 사용자 키 체크포인트 후 브라우저 E2E로 연기 |
| 탭 이탈 clearInterval (실제 클릭 경유) | 위임 핸들러는 `document` 클릭 이벤트 경유 — 테스트에서는 `clearBenchmarkPolling()` 직접 호출로 동작만 검증. 실제 탭 전환 클릭 시 버블 순서는 브라우저 E2E에서 확인 |

### [검증불가] — 실 API 연동 (의도적 연기)

| 항목 | 복구 계획 |
|------|-----------|
| 실 폴링 vs 실 `api/benchmark.js` (Apify 크롤→Whisper 전사→Claude 분석) | 사용자 키 체크포인트(`APIFY_API_TOKEN`/`OPENAI_API_KEY` 설정, `ANTHROPIC_API_KEY`는 기존) 후 `vercel dev` 또는 배포 환경에서 브라우저 E2E — 벤치마킹 탭 → 입력 → 분석 시작 → 스테이퍼 → done 4종 결과 + 카피 버튼 |
| 폴링 중 탭 전환 콘솔 에러 없음 (실제 이벤트) | 브라우저 E2E에서 proposal/video 탭 전환 + `clearInterval` 로그 확인 |
| 실패 시나리오 실화면 (비공개 계정/0건/키 미설정 500) | 브라우저 E2E에서 오류 박스 + "다시 시도" 버튼 동작 확인 |

## Deviations from Plan

### Auto-fixed Issues (Rules 1-3)

1. **[Rule 3 - Syntax] state-manager.js `videoResults` 줄 trailing comma 수정** — `tabState`에 3번째 속성(`benchmarkResults`) 추가는 JS 문법상 이전 줄의 comma가 필수. 기존 줄 1줄이 comma 추가로 변경됨(기능·주석 내용 무변경, 삭제 아님). 플랜 스케치 코드와 동일한 형태
2. **[Rule 3 - Variable] 플랜 스케치의 `--accent` CSS 변수 미존재 → 실제 변수 사용** — 스케치(`var(--accent, #4caf50)`)의 `--accent`는 프로젝트에 없음. 실제 다크테마 변수 `--accent-color`(active)와 `--success-color, #4caf50`(complete)로 대체
3. **[Rule 2 - Completeness] `.benchmark-result` CSS 규칙 추가** — JS가 `#bmResult`에 `class="benchmark-result"`를 emit하나 Task 3 목록에 규칙 누락 → `margin-top: 8px` 규칙 추가 (커밋 4952cd8)
4. **[Rule 2 - Security] 비수치 카운트 폴백 이스케이프** — `bmFormatCount`의 비수치 폴백(`String(value ?? '-')`)이 서버 문자열을 innerHTML에 원문 삽입하던 경로를 `bmEscapeHtml`로 감쌈 (커밋 3a2417c). 나머지 모든 서버 데이터(캡션/전사/구조/대본/오류/URL)는 최초 구현부터 이스케이프
5. **[Rule 3 - Robustness] 폴링 비OK 응답 2분기 처리** — 플랜 스케치는 비OK 처리가 미명시. 파싱 가능한 오류(키 미설정 500 등)는 즉시 종료 + 오류 표시, 파싱 불가(네트워크/HTML 5xx)는 일시 오류로 간주해 15분 상한까지 계속 폴링 (과도한 조기 종료 방지)

### 의도적 구현 선택 (플랜 스케치 보강)

- **maxReels select에 4 추가** — 스케치는 3/5만 있으나 서버 클램프(3~5) 범위와 정합하도록 3/4/5 제공
- **likesCount 방어적 렌더** — 백엔드 `selectViralReels`가 `likesCount`를 매핑하지 않아 미전송 상태. 프론트는 필드 존재 시에만 "좋아요" 표시(백엔드 추가 시 자동 노출). 백엔드 파일은 이번 Wave 범위 외라 수정하지 않음
- **`escapeHtml` 자체 보유** — video-ui.js는 app.js의 전역 `escapeHtml`에 의존하나, benchmark-analyzer.js는 app.js보다 먼저 로드되므로 동일 로직의 `bmEscapeHtml`을 파일 내 자체 보유 (로드 순서 비의존)
- **`initTabPersistence` 미연결 확인** — state-manager.js에 정의만 있고 호출처가 없어(전역 grep 1건 = 정의부) "복원된 activeTab=benchmark로 빈 컨테이너" 엣지 케이스가 실존하지 않음 → 추가 조치 불필요 (기존 video 탭과 동일한 동작)

### 환경 제약

- **gsd-sdk 미설치** — `state.advance-plan`/`roadmap update-plan-progress`/`requirements mark-complete` SDK 호출 불가. STATE.md는 Wave 1과 동일하게 수동 편집으로 갱신 (아래 "State Updates" 참조)

## Known Stubs

없음 — 벤치마킹 탭 UI에 하드코딩 빈 값/플레이스홀더(렌더링용 더미) 없음. 오류/빈 상태(바이럴 0건, 전사 불가 등)는 서버 오류 메시지를 그대로 한국어로 표시. 단, 실 API 미검증 상태이므로 "구현은 완전하나 실데이터 검증은 미완"이며 이는 [검증불가]로 분류됨.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: client_fetch_surface | benchmark-analyzer.js | 브라우저에서 기존 `/api/benchmark` POST/GET 호출 (플랜 R28/R35 범위, 신규 엔드포인트 아님 — 서버 측 인증은 22자 jobId + 서버 키 검증, 기존 위협 모델 내) |
| threat_flag: xss_render_surface | benchmark-analyzer.js | 서버 데이터(캡션/전사/구조/대본/오류/URL) innerHTML 삽입 — 전 경로 `bmEscapeHtml` 이스케이프 적용 확인, 비수치 카운트 폴백도 이스케이프 (커밋 3a2417c) |

## State Updates

- **STATE.md**: Version History에 `v1-phase7-wave2` 항목 추가, Next Actions 갱신 (Wave 2 완료 반영, 실 API E2E는 키 체크포인트 대기 유지), Git History 추가 (gsd-sdk 미설치로 수동 편집)
- **REQUIREMENTS.md**: R28/R35 구현됨(코드) — 단, 실 브라우저 E2E 미검증이므로 완료 체크 표시 없음 (Wave 1과 동일 정책, 실 E2E 후 확정)
- **ROADMAP.md**: 수정 없음

## Self-Check: PASSED

- [✅] `benchmark-analyzer.js` 존재 — 근거: `ls benchmark-analyzer.js` 결과 존재, `git ls-files` 추적됨
- [✅] 커밋 4건 존재 — 근거: `git log --oneline`에서 `156157a`(feat html+state), `08fca8d`(feat js), `30e6af4`(feat style), `4952cd8`(style .benchmark-result), `3a2417c`(fix escape) 확인 (5건 — 자동 수정 2건 포함)
- [✅] `node --check benchmark-analyzer.js` + `state-manager.js` — 실행 출력 "SYNTAX OK" (최종 상태 재실행)
- [✅] 오프라인 테스트 — 실행 출력 `62 passed, 0 failed` (최종 상태 재실행)
- [✅] app.js 무수정 — 근거: `git status --short` 및 `git diff --name-only app.js` 결과 변경 0건
- [✅] additive diff — 근거: `git diff HEAD~4 HEAD -- index.html style.css` 삭제 줄 0건, state-manager.js는 trailing comma 1줄만(문법 필수, 문서화됨)
- [✅] grep 확인 5종 — 탭 버튼/컨테이너/script 순서/saveBenchmarkResults/.benchmark-* CSS 모두 존재
- [✅] 작업 트리 클린 — 근거: 최종 `git status --short` 출력 없음 (변경 파일 0건, 테스트는 저장소 외부에 존재)
- [✅] 테스트 파일 비커밋 — 근거: `/var/folders/.../opencode/benchmark-frontend-offline-test.mjs`(저장소 외부), `git status`에 나타나지 않음

## 잔존 위험

1. **브라우저 실렌더 미검증** — 스텁 DOM 기반 검증이라 실제 레이아웃(스테이퍼/카드), 클립보드 권한, app.js `initToolTabs`와 위임 리스너의 이벤트 순서 충돌 여부는 브라우저에서만 확인 가능. 완화: 위임 리스너는 클릭 버블 순서상 app.js 핸들러 이후 실행되도록 설계(기존 탭 로직과 독립). 사용자 키 체크포인트 후 브라우저 E2E에서 확정
2. **실 폴링-서버 정합성** — 서버 응답 필드명이 Wave 1 모킹 검증과 다르면(예: `data.result` 구조) 렌더가 빈 섹션으로 빠질 수 있음. 완화: `renderResult`는 섹션별 null-safe(구조/대본 부재 시 해당 카드 미렌더), 오류 메시지는 서버 `error` 필드 그대로 표시. 실 E2E에서 확정
3. **카피 버튼 클립보드 API 제약** — `navigator.clipboard`는 비보안 컨텍스트(HTTP) 또는 iframe에서 거부될 수 있음. video-ui.js/app.js와 동일한 패턴이라 기존 동작과 일관되나, 실패 시 콘솔 오류 + "복사 실패" 텍스트만 표시(폴백 없음). 완화: Vercel 배포(HTTPS)에서는 정상 동작 예상
4. **IG 계정 입력 검증 분산** — 프론트는 빈 값/100자만 검사, URL/`@` 정규화는 서버 전담. 잘못된 형식은 400 응답으로 오류 표시됨 (클라이언트-서버 검증 분리 — 의도된 설계, 서버가 단일 진실원)
5. **세션 종료 시 진행 중 job 방치** — `pagehide`로 폴링을 중단하므로 진행 중 job은 KV TTL(24h)까지 서버에 잔존(파이프라인 일시 정지, 비용 발생 안 함). 재분석 시 새 job 생성으로 정상 동작. 비용 관점에서 문제 없음(게으른 진행 설계와 정합)
