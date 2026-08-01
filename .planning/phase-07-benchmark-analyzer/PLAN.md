# PLAN — Phase 7: 벤치마킹 대본 분석기 (Benchmark Script Analyzer)

> Created: 2026-08-01
> Phase: **7** ⚠️ (Phase 번호 정정: 논의 단계에서 "Phase 6"으로 언급된 적이 있으나, **Phase 6(두 도구 연결+배포)은 이미 존재**하므로 본 기능은 Phase 7로 확정)
> Requirements: R28, R29, R30, R31, R32, R33, R34, R35
> Dependencies: Phase 6 완료 후 실행 (기존 2탭 구조 위에 **순수 추가(additive)**)

---

## Goal

**벤치마킹 분석기 탭** — 인스타그램 계정을 입력하면 5단계 파이프라인이 동작한다:

1. **크롤링:** Apify 공식 `apify/instagram-reel-scraper`로 해당 계정의 릴스 크롤링 (resultsLimit 30)
2. **필터링:** 조회수(`videoViewCount >= 50,000`) 기준 바이럴 릴스 상위 최대 5개 선별
3. **전사:** OpenAI Whisper(`whisper-1`, `language=ko`)로 음성 → 대본 변환
4. **분석:** 여러 릴스 대본의 공통 구조(훅 오프닝 / 전개 전환 / 클로징)를 **무료 우선 5단계 폴백(NVIDIA NIM → OpenCode Zen 3종 → 유료 DeepSeek)**으로 해부
5. **재조립:** 분석된 구조를 템플릿으로 삼아 새 키워드/브랜드로 새 대본 초안 생성

아키텍처는 RESEARCH.md의 **Option B**를 채택한다:
`POST /api/benchmark`(job 생성 + Apify run 시작, 즉시 응답) + `GET /api/benchmark?id=`(클라이언트 폴링, **KV 스테이지 머신**) + 서버 강제 비용 상한.

---

## 근거: 왜 이 도구가 필요한가 + Phase 3(전략 제안서)와의 관계

**필요 이유:** 현재 전략 제안서 생성기는 "감이 아니라 논리로 만든다"는 방향이지만, 대본 구조의 근거는 사용자가 직접 입력한 리뷰/경쟁사 정보에만 의존한다. 실제로 시장에서 **터진(바이럴) 숏폼이 어떤 구조를 쓰는지**에 대한 1차 데이터가 없다. 벤치마킹 분석기는 시장에서 이미 검증된 릴스의 음성 대본을 전사·해부하여, "어떤 훅이, 언제, 어떤 전환으로, 어떻게 마무리되는가"라는 **실측 구조 데이터**를 만들어낸다. 이는 광고 대본을 경험·감이 아니라 실전 데이터를 근거로 재조립할 수 있게 해주는 도구다. 추가로, 성공 계정의 대본을 전사해두면 자사 제품에 적용 가능한 구조 패턴을 반복 재사용할 수 있어, 제안서 퀄리티를 계속 높이는 재료 창고가 된다.

**Phase 3(당위성 엔진)과의 관계:** 벤치마킹 분석기와 Phase 3 전략 제안서 생성기는 **독립적으로 동작**하되, 벤치마킹 분석 결과(공통 구조 해부: 훅/전개/클로징 + 전사 대본)는 Phase 3 당위성 엔진이 "왜 이 구조를 쓰는가"의 **원자료(grounding data)** 로 가져다 쓸 수 있는 **연동 포인트**로 설계한다. 구체적으로: 구조 분석 결과는 JSON으로 저장되고(KV 키 `benchmark:{jobId}`), 향후 Phase 3 플로우가 이 데이터 형식(구조 해부 JSON: `{ hook, development, closing }` + 대본 배열)과 저장 위치(KV)를 참조할 수 있게 열어둔다. **이번 Phase에서는 양방향 연동을 구현하지 않는다** — 데이터 형식/저장 위치만 확정해두고, 이후 Phase에서 제안서 생성기의 근거 입력으로 연결한다.

---

## Success Criteria

- [ ] "벤치마킹 분석기" 탭이 기존 2개 탭(proposal/video)과 함께 표시되고 전환 동작
- [ ] IG 계정 URL/아이디 입력 → **(a) 바이럴 릴스 리스트(조회수 포함)** 출력
- [ ] **(b) 각 릴스 전사 대본** 출력
- [ ] **(c) 공통 구조 해부 분석(훅/전개/클로징)** 출력
- [ ] **(d) 분석 구조 기반 새 대본 초안** 출력
- [ ] Apify/Whisper/Claude 호출이 **Vercel 타임아웃 없이** 완료 (job-status 폴링 패턴)
- [ ] "분석할 릴스 개수" 상한(`MAX_ANALYZE_REELS=5`)이 **서버 강제**로 적용되어 비용 통제
- [ ] 기존 proposal/video 탭 무손상 (additive 원칙 — 기존 파일 수정 최소화)

---

## Waves

### Wave 1: Backend — `api/benchmark.js` (KV 스테이지 머신)

**Plan 1: `01-backend-benchmark-api.PLAN.md`**

**파일 범위:**

| 파일 | 상태 | 내용 |
|------|------|------|
| `api/benchmark.js` | **신규** | POST job 생성 + GET 폴링 스테이지 머신 (crawling→transcribing→analyzing→done) |

**Tasks:**

1. **`api/benchmark.js` — 공통 프레임워크 + 서버 상수**
   - `api/review.js` 패턴 재사용: CORS 헤더, `crypto.randomBytes(16).toString('base64url')` 22자 ID, `KV_PREFIX = 'benchmark:'`
   - 서버 상수 (요청값 클램프의 기준 — RESEARCH.md §6):
     - `MAX_ANALYZE_REELS = 5`, `VIRAL_VIEWS_THRESHOLD = 50000`, `APIFY_RESULTS_LIMIT = 30`
     - `MAX_TOTAL_CHARGE_USD = 1` (Apify run 비용 상한), `MAX_REEL_DURATION_SEC = 180` (전사 제외 기준)
     - `KV_TTL_SEC = 86400` (24h), `MAX_POLLS = 120` (15분 × 8s — 초과 시 `failed(timeout)`)
   - job 객체 구조: `{ jobId, instagramId, brandName, keyword, maxReels, stage, status, apifyRunId, datasetId, reels[], transcripts[], result, error, createdAt, updatedAt, pollCount }`
   - API 키 미설정(`APIFY_API_TOKEN` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) 시 한국어 오류 메시지 500 응답

2. **`api/benchmark.js` — POST 핸들러 (job 생성 + Apify run 시작)**
   - 입력 검증: `instagramId` 필수(빈 값/길이 > 100 차단, URL이면 `@`/`instagram.com/` 앞부분 제거 → 유저네임만), `brandName`/`keyword` 선택, `maxReels`는 3~5로 서버 클램프
   - job 생성 → `kv.set(benchmark:{jobId}, job, { ex: KV_TTL_SEC })`
   - Apify run 시작: `POST https://api.apify.com/v2/actors/apify~instagram-reel-scraper/runs` (Bearer APIFY_API_TOKEN)
     - body: `{ username: [유저네임], resultsLimit: 30, skipPinnedPosts: false, includeSharesCount: false, includeTranscript: false, includeDownloadedVideo: false }`
     - query: `maxTotalChargeUsd=1` — 비용 상한 서버 강제
   - 응답의 `data.id`(runId)/`data.defaultDatasetId`(datasetId)를 job에 저장
   - **즉시 응답**: `201 { success: true, jobId }` (Apify run 대기 금지)
   - run 시작 실패 시 job stage=`failed`로 저장하고 오류 메시지 응답

   **▶ 실행 모델 (명시) — "누가, 언제" 파이프라인을 진행시키는가:**
   - **POST는 절대 파이프라인을 실행하지 않는다.** job 생성 + Apify run 시작 요청만 하고 즉시 201을 반환한다 (블로킹 없음).
   - **Apify run은 Vercel 밖(APIFY 서버)에서 비동기 실행**된다. Vercel 함수는 run이 도는 동안 대기하지 않으며, 이후 GET 폴링 호출이 `GET /v2/actor-runs/{runId}`로 상태만 확인한다.
   - **파이프라인(크롤링→전사→분석)의 유일한 구동원은 클라이언트의 GET 폴링이다.** 서버에는 백그라운드 스케줄러/워커가 없다 (Vercel 함수는 응답 반환 즉시 종료). 따라서 **클라이언트가 폴링을 멈추면 파이프라인도 그 지점에서 일시 정지**된다 — 의도된 설계이며, RESEARCH.md §4-2의 "게으른 진행(lazy progression)" 특성.
   - 클라이언트는 setInterval 5~8초로 GET을 반복 호출하고, 15분(MAX_POLLS=120) 초과 시 중단. 각 GET 호출은 "현재 stage에서 완료 가능한 다음 단위 작업 1묶음"만 수행하고 결과를 반환한다.

3. **`api/benchmark.js` — GET 핸들러 (게으른 폴링 스테이지 머신)** — 각 GET이 "완료된 다음 단계의 단위 작업"만 수행 (단일 호출 300s 이내 보장)

   **▶ GET 호출 1회가 stage별로 수행하는 정확한 단위 작업 (명시):**

   | 현재 stage | GET 1회가 하는 일 | GET 1회가 하지 않는 일 |
   |-----------|-------------------|------------------------|
   | `crawling` | Apify run 상태 1회 확인 (`GET /v2/actor-runs/{runId}`) → SUCCEEDED면 dataset fetch + 바이럴 필터 + 상위 5개 선정 → `transcribing`으로 전환 | run을 기다리지 않음 (RUNNING이면 상태만 응답, 다음 GET에 재확인) |
   | `transcribing` | 전사 안 된 릴스 중 **최대 2개**만 Whisper 전사 (audioUrl fetch + 업로드) → transcripts 저장 | 한 GET에서 5개 전부 전사하지 않음 (300s 예산) |
   | `analyzing` | **무료 우선 5단계 폴백 1회 호출** (NVIDIA NIM → OpenCode Zen 3종 → 유료 DeepSeek) → `done`으로 전환 | 분석을 여러 번 재실행하지 않음 |
   | `done` / `failed` | 축적된 결과 응답 | 새 작업 수행 안 함 |

   - 전사 단계에서 "이번 GET이 전사할 릴스 선택"은 job의 `transcripts` 배열 기준: 이미 전사된 릴스는 건너뛰고(멱등성) 아직 전사 안 된 릴스 중 앞에서부터 최대 2개를 선택한다.
   - 한 번의 GET이 300s를 초과하지 않도록, crawling은 run 상태 확인+dataset fetch만, transcribing은 2개 이하, analyzing은 Claude 1회로 각 단계 작업량을 고정한다.

   - `crawling` (R29, R30):
     - `GET /api.apify.com/v2/actor-runs/{runId}` 상태 확인 → `SUCCEEDED`면 `GET /v2/actor-runs/{runId}/dataset/items` (shortcut) fetch
     - 바이럴 필터: `videoViewCount >= 50000` **AND** `videoDuration <= 180` → 조회수 내림차순 → 상위 `MAX_ANALYZE_REELS`개 → reels 저장 → `stage=transcribing`
     - `FAILED`/`ABORTED` → `stage=failed` (한국어 오류 메시지)
     - **CDN 만료 방지: 크롤 완료 즉시(같은 폴링 사이클에서) 전사로 전환**
   - `transcribing` (R31):
      - 전사 안 된 릴스 중 **최대 2개**만 처리 (일괄 전사 폭주 방지 — 300s 예산)
      - `audioUrl`(오디오 전용 mp4) fetch → 실패 시(403/CDN 만료) `videoUrl` 백업
      - **25MB 용량 가드 (명시):** Whisper 업로드 전에 fetch된 오디오 버퍼의 `byteLength`를 검사한다.
        - `byteLength > 25MB` → 해당 릴스는 전사 **제외**하고 `[용량 초과로 전사 제외]`로 transcripts에 기록 후 나머지 릴스 계속 (개별 실패 격리).
        - 참고: 기본 경로인 `audioUrl`(인스타 오디오 전용 mp4, ~64kbps)은 60초 ≈ 500KB, 180초 ≈ 1.4MB로 25MB에 한참 미달. `MAX_REEL_DURATION_SEC = 180`(전사 제외 기준)이 1차 크기 방어선이고, 이 바이트 검사가 2차 하드 가드다. `videoUrl`(풀 영상 mp4) 백업 사용 시에는 이 검사가 더 자주 발동할 수 있음.
      - Whisper: `POST https://api.openai.com/v1/audio/transcriptions` — multipart `FormData` (Node 내장 fetch/Blob, ffmpeg 불필요): `file`, `model=whisper-1`, `language=ko`, `response_format=verbose_json`, `timestamp_granularities=segment`
      - 응답 `{ text, segments:[{start,end,text}] }` 저장 → `generate.js`의 `withRetry` 패턴으로 429/오류 재시도, 개별 실패 릴스는 `[음성 인식 불가]` 표시로 격리
      - **멱등성**: 이미 `transcripts`에 있는 릴스는 재전사 금지 (KV read-modify-write)
      - 전부 완료되면 `stage=analyzing`
- `analyzing` (R32):
      - **무료 우선 5단계 폴백 1회 호출** (NVIDIA NIM `nvidia/nemotron-3-ultra-550b-a55b` → OpenCode Zen `nemotron-3-ultra-free` / `deepseek-v4-flash-free` / `mimo-v2.5-free` → 유료 DeepSeek `deepseek-v4-flash`) — `generate.js` 패턴 재사용 (`withRetry`, `parseApiResponse`)
      - 시스템 프롬프트: 역할 고정(숏폼 구조 분석가), 릴스 캡션/전사 텍스트는 "데이터"로만 취급 (프롬프트 인젝션 방지)
      - **segment 타임스탬프 기반 구조 해부**: 각 릴스의 훅 오프닝(0~3초대)/전개 전환/클로징 구간 추출 → 공통 구조 JSON `{ hook, development, closing }`
      - **새 대본 재조립**: `brandName`/`keyword` 입력값을 반영한 새 대본 초안 (JSON 구조: 훅/전개/클로징 + 타임라인) → `result` 저장 → `stage=done`
   - `done` / `failed`: 응답에 축적 데이터 포함 `{ jobId, status, stage, reels?, transcripts?, result?, error? }`
   - 폴링 상한 초과(15분) → `stage=failed(timeout)`

**완료 기준:**
- [ ] `curl -X POST /api/benchmark -d '{"instagramId":"..."}'` → `201 { success, jobId }` (22자 base64url), Apify run 즉시 시작 (수 초 내 응답) — POST가 파이프라인을 블로킹하지 않음
- [ ] `curl -X POST` 에 유효하지 않은 instagramId/과도한 maxReels → 400 + 서버 클램프 (maxReels=10 요청 → 5 저장)
- [ ] `curl "/api/benchmark?id={jobId}"` 반복 폴링 → `crawling → transcribing → analyzing → done` 스테이지 전이 확인
- [ ] GET 폴링 중단 테스트: 폴링 없이 방치 시 파이프라인이 일시 정지되고(진행 안 됨), 폴링 재개 시 이어서 진행
- [ ] 전사 단위 작업 검증: stage=transcribing에서 GET 1회당 최대 2개 릴스만 전사 (transcripts 배열 2개씩 증가 확인)
- [ ] 25MB 가드: > 25MB 오디오 버퍼(테스트 더미) → 해당 릴스 `[용량 초과로 전사 제외]` 기록 + 나머지 계속
- [ ] 실 API 호출 없이도 오류 경로 검증: 키 미설정 시 한국어 500, 없는 id → 404, OPTIONS/CORS 헤더 정상, Method 405

**Dependencies:** 없음 (첫 Wave). 단, **실 API 흐름(크롤/전사/분석) 검증은 아래 "환경변수/외부 계정 체크포인트" 선행 필요**

---

### [체크포인트] 환경변수/외부 계정 설정 (실 API E2E 검증 전 필수)

**자동화 불가 — 사용자 수동 설정 필요 (checkpoint:human-action)**

| 항목 | 사용자 동작 | 비고 |
|------|------------|------|
| `APIFY_API_TOKEN` | Apify 가입(무료, 월 $5 크레딧) → Settings → API & Integration → 토큰 발급 | 무신용카드. 크레딧 소진 시 다음 주기까지 run 차단 |
| `OPENAI_API_KEY` | OpenAI 플랫폼 → API keys 발급 | Whisper 과금 $0.006/분 (5개 릴스 ≈ $0.03) |
| `ANTHROPIC_API_KEY` | 기존 사용 (변경 없음) | Phase 4에서 설정 완료 |

설정 위치: 로컬 `.env.local` (`vercel env pull` 후 추가) + Vercel 대시보드 Environment Variables (Production/Preview/Development 모두).
**재개 조건:** 두 키가 확인되면 Wave 1 실 API curl E2E + Wave 2 브라우저 E2E 진행. 키 없이는 코드 구현·오류 경로 테스트만 가능.

---

### Wave 2: Frontend — 벤치마킹 탭 (UI + 폴링 + 렌더링)

**Plan 2: `02-frontend-tab.PLAN.md`**

**파일 범위:**

| 파일 | 상태 | 내용 |
|------|------|------|
| `benchmark-analyzer.js` | **신규** | 벤치마킹 탭 UI + POST job 생성 + setInterval 폴링 + 진행 스테이지 표시 + 결과 렌더링 + 카피 버튼 |
| `index.html` | **수정(최소)** | 탭 버튼 1개(`data-tab="benchmark"`) + `#benchmark-tool` tool-content 컨테이너 + `<script src="benchmark-analyzer.js">` 1줄 |
| `state-manager.js` | **수정(최소)** | `tabState`에 `benchmarkResults` 슬롯 + `saveBenchmarkResults()` 추가 (연동 포인트 개방: Phase 3가 데이터 참조 가능) |
| `style.css` | **수정(추가만)** | 벤치마킹 탭 입력 섹션 + 진행 스테이퍼 + 결과 카드 스타일 (기존 다크테마 변수 재사용, 기존 규칙 무변경) |

**Tasks:**

1. **`index.html` + `state-manager.js` — 탭 구조 최소 확장**
   - `.tool-tabs`에 `<button class="tool-tab" data-tab="benchmark">벤치마킹 분석기</button>` 추가 (기존 2개 버튼 무수정)
   - `.tool-contents`에 `<div id="benchmark-tool" class="tool-content"><div id="benchmarkAnalyzerUI"></div></div>` 추가
   - `<script src="benchmark-analyzer.js">` 추가 (기존 스크립트 로드 순서 유지, `app.js` 앞에 로드)
   - `state-manager.js`: `tabState`에 `benchmarkResults: null` 추가 + `saveBenchmarkResults(results)` (sessionStorage `benchmarkResults` — `saveProposalResults` 패턴 미러링, 순수 추가)

2. **`benchmark-analyzer.js` — UI + 폴링 + 렌더링** (전체 로직 한 파일 응집 — RESEARCH §4-3: 프론트 폴링은 신규 모듈로, 기존 파일 무수정)
   - 탭 활성 시 lazy 초기화: `switchTab`는 기존 함수 그대로 재사용하되, 벤치마킹 탭 최초 클릭 시 UI 렌더 (`initToolTabs`는 `app.js` 소유 — 수정 금지 → `benchmark-analyzer.js`가 자체적으로 탭 클릭 이벤트를 위임(delegation)으로 감지해 초기화. 기존 탭 로직과 충돌 없음)
   - 입력 폼: IG 계정 URL/아이디(필수), 브랜드명/새 키워드(선택), 분석할 릴스 수(3~5 select, 기본 5 — 서버가 다시 클램프)
   - "분석 시작" → `POST /api/benchmark` → jobId 수신 → 진행 스테이지 표시 (크롤링→전사→분석→완료 스테퍼 + 단계별 한국어 상태 텍스트)
   - `setInterval` 5~8초 폴링 → `GET /api/benchmark?id=` → 응답 축적 렌더
   - `done`: (a) 바이럴 릴스 리스트 카드(조회수/좋아요/릴스 링크) (b) 전사 대본 섹션 (c) 구조 해부 카드(훅/전개/클로징) (d) 새 대본 초안 + **카피 버튼** (navigator.clipboard, video-ui.js 패턴)
   - `failed`/`timeout`: 한국어 오류 표시 + "다시 시도" 버튼
   - 폴링 중 탭 이탈 시 `clearInterval` (탭 전환·세션 종료 안전)
   - 폴링 15분 초과 시 클라이언트 폴링 중단 + 안내 (서버 `failed(timeout)`과 일치)

3. **`style.css` — 벤치마킹 탭 스타일 (추가만)**
   - `.benchmark-*` 클래스 신규: 입력 섹션, 진행 스테이퍼(단계별 active/complete 상태), 결과 카드(릴스/전사/구조/대본), 카피 버튼 — 기존 CSS 규칙 수정 금지

**완료 기준:**
- [ ] 브라우저에서 3개 탭 표시 + 전환 동작, 기존 proposal/video 탭 무손상 (회귀 확인)
- [ ] 입력 → 분석 시작 → 진행 스테이지 표시 → done 시 4종 결과((a)~(d)) 렌더링
- [ ] 각 결과 섹션 카피 버튼 클릭 → 클립보드 복사
- [ ] 폴링 중 탭 전환 시 오류/콘솔 에러 없음 (clearInterval 확인)
- [ ] 실패 시나리오(비공개 계정/0건 결과) → 한국어 오류 메시지 표시

**Dependencies:** Wave 1(`api/benchmark.js`) 완료 후

---

### Wave 3: Config/문서 — 배포 설정 + 환경변수 가이드

**Plan 3: `03-config-docs.PLAN.md`**

**파일 범위:**

| 파일 | 상태 | 내용 |
|------|------|------|
| `vercel.json` | **수정** | `functions.maxDuration: 300` + `env` 블록에 APIFY_API_TOKEN/OPENAI_API_KEY 추가 |
| `ENVIRONMENT-GUIDE.md` | **수정** | APIFY/OPENAI 환경변수 문서 + 발급 방법 + 확인 curl 추가 |

**Tasks:**

1. **`vercel.json` — 함수 타임아웃 + env 블록**
   - `functions`에 `"api/benchmark.js": { "maxDuration": 300 }` 추가 (RESEARCH §3-1: fluid 여부 무관하게 명시적 설정 — 60s 한도 프로젝트 대비)
   - `env` 블록에 `"APIFY_API_TOKEN": "@apify-api-token"`, `"OPENAI_API_KEY": "@openai-api-key"` 추가 (기존 KV env 2개 유지)
   - JSON 유효성 확인 (`node -e "JSON.parse(...)"` 또는 `vercel build` 스모크)

2. **`ENVIRONMENT-GUIDE.md` — 신규 환경변수 문서**
   - 필수 환경변수 표에 `APIFY_API_TOKEN`(Apify 계정 → Settings → API & Integration), `OPENAI_API_KEY`(OpenAI Platform → API keys) 행 추가
   - 벤치마킹 API 테스트 curl 예시: `POST /api/benchmark` + `GET /api/benchmark?id=`
   - 비용 안내: Apify Free $5/월 크레딧(1회 ≈ $0.08), Whisper $0.006/분, 상한 정책(5개 릴스) 설명
   - API 엔드포인트 표에 `/api/benchmark` 추가

**완료 기준:**
- [ ] `vercel.json` JSON 파싱 성공 + `functions["api/benchmark.js"].maxDuration === 300` + env 4개(KV 2 + 신규 2)
- [ ] `ENVIRONMENT-GUIDE.md`에 APIFY_API_TOKEN/OPENAI_API_KEY 발급 방법 + 설정 위치 + 확인 curl 포함
- [ ] (사용자 키 설정 후) `vercel dev`에서 `api/benchmark.js`가 정상 로드 (env 없이 500 한국어 메시지 확인 가능)

**Dependencies:** Wave 1 완료 후 (vercel.json functions는 `api/benchmark.js` 존재 필요). ENVIRONMENT-GUIDE는 독립적이나 같은 Wave로 묶음.

---

## Requirements Mapping

> 신규 요구사항 R28~R35 — ROADMAP.md(Phase 7 항목)와 REQUIREMENTS.md(R28~R35 상세)에 **반영 완료** (2026-08-01, 승인 후 재검토)

| ID | Category | Description | Wave / Plan |
|----|----------|-------------|-------------|
| R28 | UI | **벤치마킹 분석기 탭** 표시 + 전환 (기존 2탭과 함께) | Wave 2 (Plan 2) |
| R29 | API | **Apify 크롤링** — job 생성 + `apify/instagram-reel-scraper` run 시작 + dataset fetch | Wave 1 (Plan 1) |
| R30 | Logic | **바이럴 필터 + 개수 상한** — `videoViewCount >= 50000` 필터, `MAX_ANALYZE_REELS=5` 서버 강제, `videoDuration > 180s` 전사 제외 | Wave 1 (Plan 1) |
| R31 | API | **Whisper 전사** — `audioUrl` fetch → `whisper-1` multipart (`language=ko`, `verbose_json` segment 타임스탬프) | Wave 1 (Plan 1) |
| R32 | Logic | **구조 분석 + 재조립** — segment 기반 훅/전개/클로징 해부 + 새 키워드/브랜드 대본 초안 (Claude) | Wave 1 (Plan 1) |
| R33 | Logic | **job-status 폴링/비용 통제** — KV 스테이지 머신(crawling→transcribing→analyzing→done), GET당 단위 작업, `maxTotalChargeUsd=1`, KV TTL 24h, 폴링 120회 상한 | Wave 1 (Plan 1) |
| R34 | Config | **env 가이드** — `APIFY_API_TOKEN`/`OPENAI_API_KEY` (vercel.json env 블록 + ENVIRONMENT-GUIDE.md) | Wave 3 (Plan 3) |
| R35 | UI | **결과 렌더링 + 카피** — (a) 릴스 리스트/조회수 (b) 전사 대본 (c) 구조 해부 (d) 새 대본 + 진행 스테이지 표시 + 카피 버튼 | Wave 2 (Plan 2) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **IG 크롤링 정책/안티봇 변화** | 공식 `apify/instagram-reel-scraper` 사용(쿠키 불필요 기본). IG가 로그인 장벽 강화 시 세션 쿠키(`cookiesJson`)/리지덴셜 프록시 옵션 백업(RESEARCH §1-6). 계정 밴 리스크 수반 — 내부 소량 분석 전제로만 사용 |
| **Apify 비용 초과** | `resultsLimit=30` + `maxTotalChargeUsd=1` 요청 시 강제 + 바이럴 상위 5개만 분석. Free $5 크레딧 ≈ 60회/월. 크레딧 소진 시 run 차단(요금 부과 아님) |
| **Whisper 한국어 정확도** | `language=ko` 명시 + `prompt` 어휘 힌트(224토큰). 원본 `audioUrl`(음질 양호) 사용. 배경음악/신조어로 안 들리는 구간은 `[음성 인식 불가]` 표시 후 Claude 분석 면제 처리 |
| **Vercel 타임아웃** | 단일 동기 파이프라인 금지 — **job-status 스테이지 머신 + GET당 단위 작업**(전사는 GET당 1~2개). `vercel.json`에 `maxDuration: 300` 명시 (RESEARCH §3-1 함정 대비) |
| **CDN 링크 만료** | `audioUrl` 만료(403) 대비 **크롤 완료 즉시 전사 시작**(같은 폴링 사이클), `videoUrl` 백업. `includeDownloadedVideo: false` 유지(비용 절감) |
| **Whisper 25MB 용량 초과** | 업로드 전 `byteLength > 25MB` 검사 → 해당 릴스 `[용량 초과로 전사 제외]` 격리 후 나머지 계속. 1차 방어선: `MAX_REEL_DURATION_SEC=180` 전사 제외(≈1.4MB), 2차 하드 가드: 바이트 검사 (RESEARCH §2-2) |
| **비공개/삭제/신생 계정 (0건 결과)** | dataset 0건/바이럴 0건 → "릴스 없음/비공개 계정/바이럴 릴스 없음" 명확한 한국어 오류 메시지 (스테이지 failed 처리) |
| **KV 값 크기/TTL** | 결과 요약만 저장(전사 5개 + 분석 ≈ 50KB < 1MB). `kv.set` TTL 24h 부여. 폴링 120회 상한 후 `failed(timeout)` |
| **전사 중복 실행** | "transcripts에 없는 릴스만 전사" KV read-modify-write 멱등성 (RESEARCH §Common Pitfalls 7) |
| **jobId 무차별 대입** | `crypto.randomBytes(16)` 22자 base64url (128bit, review.js 검증 패턴) |
| **SSRF / 임의 URL fetch** | fetch 대상은 Apify dataset의 `audioUrl`/`videoUrl` 필드 한정 — 사용자 입력 URL 직접 fetch 금지 |
| **프롬프트 인젝션** | 릴스 캡션/전사 텍스트는 "데이터"로만 취급, 시스템 프롬프트에서 역할 고정 (generate.js 검증 패턴) |

---

## Verification Plan

| 검증 대상 | 방법 | 비고 |
|-----------|------|------|
| gsd-verifier | Goal-backward: "벤치마킹 분석기가 동작하는가?" → 탭 표시/전환, (a)~(d) 4종 결과, 타임아웃 없음, 상한 적용 | Phase 종료 시 실행 |
| API 스모크 (curl) | ① `POST /api/benchmark` → 201 jobId ② `GET /api/benchmark?id=` 반복 → stage 전이 ③ 잘못된 입력 → 400/클램프 ④ 없는 id → 404 ⑤ 키 미설정 → 500 한국어 메시지 | TEST-GUIDE.md 관례, 실 API는 체크포인트 후 |
| 상수/비용 검증 | maxReels=10 요청 → 서버 저장값 5 확인 / Apify 요청에 `maxTotalChargeUsd=1` 포함 확인 | 유닛: `node -e` 또는 test-rationale-engine.js 스타일 |
| 브라우저 E2E | test-e2e.js 스타일: 벤치마킹 탭 → 입력 → 분석 시작 → 스테이퍼 진행 → done 결과 4종 + 카피 버튼 | 실 API 키 필요 (체크포인트 후) |
| 기존 탭 회귀 | proposal/video 탭 전환 + 생성 정상 동작 (수동 모드) | additive 무손상 확인 |
| gsd-ui-checker | 탭 전환, 진행 스테이퍼, 결과 카드 레이아웃, 카피 버튼 동작 | UI 스코어 확인 |

---

## 환경변수/외부 계정 체크포인트 (요약)

| 변수 | 발급처 | 설정 위치 | 필수 시점 |
|------|--------|-----------|-----------|
| `APIFY_API_TOKEN` | apify.com 가입(무료 $5/월) → Settings → API & Integration | .env.local + Vercel env | Wave 1 실 API E2E 전 |
| `OPENAI_API_KEY` | platform.openai.com → API keys | .env.local + Vercel env | Wave 1 실 API E2E 전 |
| `ANTHROPIC_API_KEY` | 기존 사용 (Phase 4) | Vercel env | 이미 설정 |

> ⚠️ **실 API 검증(크롤/전사/분석)은 사용자의 키 설정 후에만 가능** — 코드 작성·오류 경로 테스트는 키 없이 선행 가능. Wave 1 완료 후, 실 E2E 진입 전에 사용자 확인 필요.

---

## 산출물

- `PLAN.md` — 본 플랜
- `SUMMARY.md` — Phase 요약 (3~5 bullet)
- `RESEARCH.md` — 기술 리서치 (Apify/Whisper/Vercel/비용 검증)
- `CONTEXT.md` — Phase 컨텍스트
- ✅ `ROADMAP.md` — Phase 7 항목 **추가 완료** (2026-08-01)
- ✅ `REQUIREMENTS.md` — R28~R35 상세 **추가 완료** (2026-08-01)
- ✅ `01-backend-benchmark-api.PLAN.md` — Wave 1 (실행 모델 + 25MB 가드 명시)
- ✅ `02-frontend-tab.PLAN.md` — Wave 2
- ✅ `03-config-docs.PLAN.md` — Wave 3
