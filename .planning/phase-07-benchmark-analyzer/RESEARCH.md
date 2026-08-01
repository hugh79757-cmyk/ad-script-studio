# Phase 7: 벤치마킹 대본 분석기 (Benchmark Script Analyzer) — Research

**Researched:** 2026-08-01
**Domain:** Instagram Reel 크롤링(Apify) → 음성 전사(OpenAI Whisper) → AI 구조 분석/재조립(Claude) 파이프라인 (Vercel Serverless + KV)
**Confidence:** HIGH (외부 API 공식 문서 직접 확인 — [검증됨] 다수)

---

## Summary

Phase 7은 "IG 계정 입력 → 바이럴 릴스 크롤링 → Whisper 전사 → 구조 분석 → 새 대본 초안" 5단계
파이프라인을 기존 바닐라 JS + Vercel 서버리스 구조 위에 추가하는 단계입니다.

핵심 발견 3가지:

1. **Apify 공식 액터 `apify/instagram-reel-scraper`는 조회수(`videoViewCount`)와 직접 다운로드 가능한
   `videoUrl`(mp4) 및 **`audioUrl`(mp4 오디오 전용)**을 모두 제공**합니다. `audioUrl` 덕분에
   서버가 별도 ffmpeg 변환 없이 오디오를 받아 Whisper에 바로 업로드할 수 있습니다
   (Whisper는 mp4를 공식 지원). 단, CDN 링크가 빠르게 만료되므로 크롤 완료 직후 같은 job 안에서
   전사해야 합니다.
2. **단일 동기 요청으로 파이프라인 전체를 처리하는 것은 Vercel 타임아웃으로 실패**합니다.
   Apify run 자체가 수 분(2~10분) 걸리고 전사(릴스당 ~10~30초)와 Claude 호출이 추가되므로,
   Hobby 플랜 최대 300초(fluid compute 기준, 구버전은 60초)를 확정적으로 초과합니다.
   → **"job 생성 + 클라이언트 폴링 + KV 상태 저장" 패턴이 정답**이며, 이는 `api/review.js`의
   KV CRUD 패턴을 그대로 확장해 구현할 수 있습니다.
3. **비용이 매우 저렴합니다.** Apify Free 플랜 월 $5 크레딧(1회 분석 약 $0.08), Whisper
   $0.006/분(5개 릴스 약 $0.03), Claude 1회 호출(수 센트). 릴스당 결과 가격이 $0.0026이므로
   "크롤 30개 중 바이럴 상위 5개만 분석" 정책으로 통제하면 월 수십 회 실행이 무료 크레딧 범위 안에
   들어옵니다.

**Primary recommendation:** **Option B — 단계별 엔드포인트 + 클라이언트 폴링** (KV 스테이지 머신).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

CONTEXT.md에 "## Decisions" 섹션은 없으나, 아래 항목이 Phase 7의 확정 제약으로 기록되어 있습니다:

### Locked Decisions (CONTEXT.md에서 발췌 — 준수 필수)
- **독립 탭 추가**: 벤치마킹 분석기는 기존 proposal/video 탭과 독립적으로 동작. 양방향 연동은
  지금 구현하지 않음(데이터 형식/저장 위치만 열어둠)
- **Additive 원칙**: 기존 탭 파일(proposal/video) 수정 금지 — 예외: 탭 바 버튼 1개 +
  `state-manager.js` 탭 목록 확장만 구조상 허용
- **바닐라 HTML/CSS/JS**: 프레임워크 도입 금지
- **한국어 UI**: 모든 표시 텍스트 한국어
- **API 키 보안**: 프론트엔드 노출 금지, 서버 사이드 전용 (기존 규칙 유지)
- **단계별 API + job-status 폴링 패턴** 설계 필요 (타임아웃 회피)
- **비용 상한 정책** 필요 ("분석할 릴스 개수" 상한)
- 신규 환경변수: `APIFY_API_TOKEN`, `OPENAI_API_KEY` (ENVIRONMENT-GUIDE.md에 추가 예정)
- 기존 의존성 유지: `@vercel/kv` ^3.0.0 (이미 설치됨)

### the agent's Discretion
- 액터 선택(공식 vs 서드파티), 폴링 간격, 바이럴 기준값, 상한 개수 등 구체 수치는 이 리서치에서 결정

### Deferred Ideas (OUT OF SCOPE)
- 제안서 생성 플로우와의 실제 양방향 연동 (나중 단계)
</user_constraints>

---

## 1. Apify Instagram Reel Scraper

### 1-1. 표준 액터

| 항목 | 값 | 비고 |
|------|-----|------|
| 액터 slug | `apify/instagram-reel-scraper` | Apify 공식 액터 [검증됨: apify.com/apify/instagram-reel-scraper] |
| (동일 계열) | `website-scraper/instagram-reel-scraper` | 공식, 입력 스키마 openapi로 확인 [검증됨: apify.com/website-scraper/instagram-reel-scraper/api/openapi] |
| 콘솔 액터 ID | `dSCLg0C3YEZ83HzYX` | README의 콘솔 링크에서 확인 [검증됨] |
| 통계 | 총 126,810 사용자, 월 10,526 사용자, 99.9% run 성공률 | [검증됨: actor 페이지] |
| 로그인/쿠키 | **기본적으로 필요 없음(공개 프로필 익명 접근).** 입력에 `skipPreflightAuthCheck`(사전 인증 체크 스킵) 옵션이 존재하며, 문제 발생 시 세션 쿠키(`cookiesJson`)/리지덴셜 프록시 투입 가능(서드파티 래퍼 문서에서 확인) | [부분검증] — 공식 문서의 "공개 릴스 추출" 문구 + 래퍼 액터의 쿠키 옵션. 비공개 프로필은 원천 불가 |
| 서드파티 대안 | `sovanza.inc/instagram-reel-scraper`, `insta_scrapper/instagram-reels-scraper` | **사용 금지 권장** — 유료 래퍼/품질 불확실. 공식 액터 사용 |

### 1-2. REST API로 run 시작

```http
POST https://api.apify.com/v2/actors/apify~instagram-reel-scraper/runs
Authorization: Bearer {APIFY_API_TOKEN}
Content-Type: application/json

{
  "username": ["계정명"],        // 배열: 유저네임/프로필 URL/릴스 URL 직접 입력 가능
  "resultsLimit": 30,           // 프로필당 최대 릴스 수 (기본 27)
  "skipPinnedPosts": false,
  "includeSharesCount": false,  // 유료 기능 — 불필요
  "includeTranscript": false,   // 유료 기능 — Whisper로 대체하므로 불필요
  "includeDownloadedVideo": false // 유료(Apify에 3일 저장) — CDN 만료 전에 전사하므로 false 유지
}
```

- 액터 ID 대신 이름 기반 slug(`apify~instagram-reel-scraper`) 사용 가능 [검증됨: docs.apify.com/api/v2]
- `/v2/acts/` 프리픽스는 deprecated지만 동작함 — 신규 코드는 `/v2/actors/` 사용 [검증됨]
- **즉시 응답**: run 객체가 바로 반환되며 `data.defaultDatasetId`(결과 dataset ID)와
  `data.id`(run ID) 포함 [검증됨: docs.apify.com/api/v2/act-runs-post.md]
- **비용 상한 옵션**: 요청 body/query에 `maxTotalChargeUsd: 1` 등으로 단일 run 비용 상한 설정 가능
  [검증됨: act-runs-post API 문서 — `ACTOR_MAX_TOTAL_CHARGE_USD`] → 비용 통제에 활용

### 1-3. run 상태 폴링 + 결과 조회

```http
# 상태 폴링 (검증됨)
GET https://api.apify.com/v2/actor-runs/{runId}
# 응답 data.status 값: READY | RUNNING | SUCCEEDED | FAILED | TIMING-OUT | TIMED-OUT | ABORTING | ABORTED
# 선택 파라미터: ?waitForFinish=60 (최대 60초 블록 대기, 폴링 횟수 절약)

# 결과 조회 (검증됨)
GET https://api.apify.com/v2/datasets/{defaultDatasetId}/items   # format=json 기본
# 또는 shortcut:
GET https://api.apify.com/v2/actor-runs/{runId}/dataset/items
```

- 폴링 대안: run 생성 시 `webhooks` 파라미터로 완료 통지 수신 가능(선택 사항, KV 폴링으로 충분) [검증됨]

### 1-4. dataset 항목 필드 (Whisper 연동 핵심)

실제 출력 샘플 JSON에서 확인된 필드 [검증됨: apify.com/apify/instagram-reel-scraper 출력 샘플]:

| 필드 | 의미 | 파이프라인 사용 |
|------|------|-----------------|
| `url` / `shortCode` | 릴스 URL | 결과 링크 표시 |
| `caption` | 캡션 텍스트 | 분석 컨텍스트 |
| `videoViewCount` | 조회수 | **바이럴 필터 기준** |
| `videoPlayCount` | 재생수 | 참고 |
| `likesCount` / `commentsCount` | 좋아요/댓글 | 참고 |
| `videoDuration` | 초 단위 길이 (예: 51.151) | 비용 예측/구조 분석 |
| **`videoUrl`** | 직접 mp4 CDN 링크 | (백업) Whisper 업로드용 |
| **`audioUrl`** | **오디오 전용 mp4 CDN 링크** | **Whisper 업로드 기본 소스 — ffmpeg 불필요** |
| `timestamp` | 게시 시각 | 필터 |
| `hashtags`, `mentions`, `musicInfo`, `ownerUsername` | 메타 | 분석 컨텍스트 |

⚠️ **CDN 링크 만료**: 액터 README가 "CDN links to Instagram expire quickly"라고 명시
[검증됨] → **크롤 완료 → 즉시(같은 job 안에서) 전사**해야 함. `includeDownloadedVideo`는
Apify에 3일 보관하는 유료 옵션이지만 비용 절감상 기본 false 권장.

### 1-5. 비용 / 무료 크레딧 / 한도

| 항목 | 값 | 출처 |
|------|-----|------|
| 과금 모델 | **Pay-per-event (PPE)**: 결과 1,000개당 $2.60 (Free 플랜 기준) → **개당 $0.0026** | [검증됨: actor README] |
| Starter 플랜 | $2.30/1,000개 ($0.0026 미만) | [검증됨] |
| Apify Free 플랜 | **월 $5 크레딧 (이월 없음)**, 소진 시 다음 주기까지 run 차단 | [검증됨: apify.com/pricing] |
| $5 크레딧으로 가능한 분석량 | ≈ 1,900개 결과 → resultsLimit 30짜리 분석 **약 60회/월** | 산출 [검증됨 근거] |
| 플랫폼 CU | $0.20/CU (Free) — PPE 액터는 이벤트 단가만 과금 | [검증됨: apify.com/pricing] |

### 1-6. 알려진 리스크

- **인스타그램 안티봇/정책 변화**: 공개 프로필 기준으로 동작하나, IG 측이 로그인 장벽을 강화하면
  세션 쿠키 필요해질 수 있음 → 세션 쿠키 도입은 계정 밴 위험 수반 [부분검증]
- **비공개 프로필/삭제된 계정**: 크롤 불가 — 오류 처리 필요
- **ToS**: 공개 데이터 스크래핑은 Apify 운영 모델의 근간이나, 사업적 재판매/대량 수집은 IG 약관
  위반 소지 → 내부 분석용 소량 사용 전제 [부분검증]
- 결과 수가 적거나 0건인 계정(신생 계정) → "바이럴 릴스 없음" 처리 필요

---

## 2. OpenAI Whisper API (음성 전사)

### 2-1. 엔드포인트/요청 형식

```http
POST https://api.openai.com/v1/audio/transcriptions
Authorization: Bearer {OPENAI_API_KEY}
Content-Type: multipart/form-data

-F file=@audio.mp4          # 파일 업로드 필수 (URL 전달 불가)
-F model=whisper-1
-F response_format=json     # json | text | srt | verbose_json | vtt
-F language=ko              # ISO-639-1 — 한국어 명시로 정확도/지연 개선
-F timestamp_granularities=segment   # verbose_json일 때 타임스탬프
```

[검증됨: developers.openai.com/api/reference/resources/audio/transcriptions + speech-to-text 가이드]

- **URL 직접 전달 불가** → 서버가 `audioUrl`을 `fetch`로 다운로드한 뒤 multipart로 업로드해야 함.
  Node 18+ 내장 `fetch`/`FormData`/`Blob`으로 충분 (신규 의존성 불필요) [검증됨: OpenAI API 형식]
- 응답 형식: `json` → `{ text }`; `verbose_json` → `{ text, segments:[{start,end,text}] }`
  — **구조 분석(훅/전개/클로징)에는 verbose_json의 segment 타임스탬프가 유용** [검증됨]

### 2-2. 파일 크기/포맷 — ffmpeg 필요 없음

- **25MB 제한**, 지원 포맷: `flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm` → **mp4 직접 지원**
  [검증됨: speech-to-text 가이드]
- 인스타 `audioUrl`(오디오 전용 mp4, ~64kbps, 60초 ≈ 500KB)은 25MB에 한참 미달 → **ffmpeg 불필요**
- (로컬 디버깅용 ffmpeg은 설치돼 있으나 Vercel 서버리스에는 없음 — 아키텍처가 ffmpeg에 의존하면 안 됨)

### 2-3. 비용

| 항목 | 값 | 출처 |
|------|-----|------|
| whisper-1 과금 | **$0.006/분** | [검증됨: developers.openai.com/api/docs/models/whisper-1 — "Cost / minute $0.006"] |
| 60초 릴스 1개 | $0.006 | 산출 |
| 5개 분석(평균 60초) | **$0.03** | 산출 |
| Free 티어 rate limit | 3 RPM / 200 RPD (Tier 1: 500 RPM) | [검증됨] — 5개 순차 전사는 제한에 여유 |

### 2-4. 한국어 숏폼 정확도 고려

- `language=ko` 명시 + `prompt`로 어휘 힌트 제공 가능 (whisper-1 prompt는 224토큰 제한) [검증됨]
- 배경음악/빠른 발화/신조어·영어 혼용은 일반적 오차 요인 — 원본 `audioUrl`(음질 양호) 사용이
  최선. 도저히 안 들리는 구간은 `[음성 인식 불가]` 표시 후 Claude 분석에서 면제 처리 권장 [부분검증]
- 2025년 이후 신모델(`gpt-4o-transcribe` 등)이 존재하나 한국어+타임스탬프+저비용 요구에
  whisper-1이 적합. `gpt-4o-transcribe`는 `json` 외 response_format 미지원이라 구조 분석에 불리 [검증됨]

### 2-5. 타임아웃/지연 특성

- **동기식**: 파일 업로드 후 응답까지 블로킹. 지연은 오디오 길이에 대략 비례
  (60초 → 대략 10~30초) [부분검증 — 공식 문서에 지연 명시 없음, 커뮤니티 관측]
- 전사 실패(429/오류) 시 `api/generate.js`의 `withRetry` 패턴 재사용 [검증됨: 코드 리딩]

---

## 3. Vercel 서버리스 함수 타임아웃 한계

### 3-1. 현재(2026-07 문서 기준) 한도

| 플랜 | 기본 | 최대 | 확장(베타) | 출처 |
|------|------|------|-----------|------|
| **Hobby** | 300s (5분) | **300s (5분)** | — | [검증됨: vercel.com/docs/functions/limitations, 2026-07-01] |
| Pro | 300s | 800s | 1800s (30분) | [검증됨] |
| Enterprise | 300s | 800s | 1800s (30분) | [검증됨] |

- 위 표는 **Fluid compute 기본 활성** 기준(신규 프로젝트 기본값). 
- ⚠️ **2025-04-23 이전 배포·non-fluid 프로젝트는 구버전 한도**: Hobby 기본 10s/최대 60s,
  Pro 기본 15s/최대 300s [검증됨: vercel.com/docs/limits] — CONTEXT.md의 "10초"는 이 구버전 수치.
  이 프로젝트의 fluid 여부를 확정할 수 없으므로 **vercel.json에 명시적 `maxDuration` 설정을 필수**로 한다.
- 설정 방법: `vercel.json`의 `functions` 객체에 경로별 `maxDuration`, 또는 코드에
  `export const maxDuration = 300` [검증됨: vercel.com/docs/functions/configuring-functions/duration]

```json
{
  "functions": {
    "api/benchmark.js": { "maxDuration": 300 }
  }
}
```

### 3-2. 파이프라인 시간 예산 (왜 단일 요청이 실패하는가)

| 단계 | 소요 | 방식 |
|------|------|------|
| Apify run (30개 릴스) | **2~10분** | 원격 비동기 — 서버 함수가 대기하면 타임아웃 |
| 릴스 다운로드 + Whisper 전사 (5개) | 5 × (다운 1~3s + 전사 10~30s) ≈ 1~3분 | 동기 fetch |
| Claude 구조 분석 | 20~60s | 동기 fetch |
| **합계** | **4~15분** | Hobby 최대 300s 초과 확정 |

### 3-3. Vercel KV (이미 사용 중) — job 상태 저장 적합성

| 항목 | 값 | 출처 |
|------|-----|------|
| Hobby 무료 한도 | **30,000 requests/월**, 256MB 스토리지, 256MB 전송 | [검증됨: vercel.com/changelog/vercel-kv-is-now-generally-available] |
| Pro | 150,000 requests/월, 512MB | [검증됨] |
| 값 크기 제한 | Upstash Redis 값 최대 1MB (전사 5개 + 분석 결과 ≈ 50KB 미만 — 여유) | [부분검증: Upstash 제약] |
| 폴링 비용 추정 | job당 GET 폴링 ~60~120회 = KV read ~120회 → **월 수백 job까지 무료 범위** | 산출 |
| 함정 | (a) 값 크기 초과 시 오류 → 분석 결과 요약만 저장, (b) KV TTL(`kv.set(key, val, {ex: 86400})`)로 만료 관리 필요, (c) 무료 한도 초과 시 기능 차단(요금 부과 아님) | [검증됨: @vercel/kv 사용] |

### 3-4. 대안 서비스 (QStash/Inngest/Temporal)

존재하나 **이 프로젝트에는 과함** — 기존 `@vercel/kv`(설치 완료) + 클라이언트 폴링으로 충분.
새 인프라 의존성은 "바닐라/심플 유지" 제약과 배치됨. [부분검증 — 경험적 판단]

---

## 4. 기존 패턴 재사용 평가

### 4-1. `api/research.js` — 폴링/job-status 패턴?

**없음 [검증됨 — 파일 리딩 완료]**. 4개 Tavily 쿼리를 `for...of`로 **동기 순차 fetch**하고
최종 응답을 한 번에 반환합니다. 비동기 job 상태 개념이 없습니다.

- 재사용 가능한 부분: (a) API 키 부재 시 500 응답, (b) 쿼리별 실패 격리(try/catch → 빈 값),
  (c) CORS 헤더, (d) 파서 함수 분리 구조
- 비동기 job 처리로 확장하려면: 응답을 지연 반환하고 → KV에 job 객체 저장 → 상태 스테이지
  머신으로 재구성해야 함 (구조 변경이므로 신규 파일로 작성하는 것이 맞음)

### 4-2. `api/review.js` — KV 패턴 재사용

**완벽한 기반 [검증됨 — 파일 리딩 완료]**:
- `crypto.randomBytes(16).toString('base64url')` → 22자 추측 불가 ID (기존 검증된 보안 패턴)
- `kv.set(key, data)` / `kv.get(key)` 패턴, `KV_PREFIX` 상수
- GET(id 조회) / POST(생성) / PATCH(상태 갱신) 메서드 분기

**제안: job-status 엔드포인트 설계** (`api/benchmark.js` 1개 파일, review.js 구조 복제):

```
POST /api/benchmark          — job 생성
  body: { instagramId, brandName, keyword, maxReels? }
  → { success, jobId }
  서버: job 객체를 KV에 저장 (benchmark:{jobId})
        Apify run 시작 → apifyRunId 저장 → 즉시 응답 (수 초 내)

GET  /api/benchmark?id={jobId}  — 상태 폴링 (스테이지 머신 "게으른 진행")
  서버가 현재 스테이지를 확인하고, 완료된 이전 스테이지가 있으면 다음 작업 수행:
  - crawling   : Apify run 상태 확인 → SUCCEEDED면 dataset fetch → 바이럴 필터
                 → reels 저장, transcribing으로 전환
  - transcribing: 전사 안 된 릴스 최대 N개 Whisper 호출 → transcripts 저장
                 (전부 완료되면 analyzing으로)
  - analyzing  : Claude 1회 호출 → 구조 분석 + 새 대본 → done
  - done / failed
  응답: { jobId, status, stage, reels?, transcripts?, result? }
```

- 각 GET 호출이 "가능한 다음 단위 작업만" 수행 → **단일 호출 시간을 안전 범위(< 300s)로 유지**
- 폴링이 없으면 진행이 멈추는 특성(서버는 스케줄러 없음) — 폴링 간격 5~8초, 최대 대기 15분
  클라이언트에서 관리. 단순하고 예측 가능 [부분검증 — 설계 판단]

### 4-3. 프론트엔드 폴링 코드

**없음 [검증됨 — `grep -n "setInterval|setTimeout" app.js video-ui.js` 결과: setInterval 0건,
setTimeout은 전부 복사 버튼 토스트/UI 피드백 전용]**. 벤치마킹 탭에 신규 폴링 루프(setInterval
기반)를 추가해야 합니다 — 기존 파일 수정 없이 신규 탭 코드로 (additive).

### 4-4. `api/generate.js` — 재사용

`withRetry`(429 지수 백오프), JSON 파싱(`parseApiResponse`), 시스템 프롬프트 구성 패턴이
Claude 구조 분석/재조립 호출에 그대로 재사용 가능 [검증됨 — 파일 리딩 완료].

---

## 5. 권장 아키텍처 (옵션 비교)

### Option A: 단일 동기 요청 — ❌ 실패

크롤+전사+분석을 한 핸들러에서 `await`로 처리 → Apify run 대기(2~10분) 중
`FUNCTION_INVOCATION_TIMEOUT`(504). Hobby 300s(최악 60s)로는 불가능. **기각.**

### Option B: 단계별 엔드포인트 + 클라이언트 폴링 — ✅ 권장

```
[브라우저] POST /api/benchmark ──> [KV] job 생성 + Apify run 시작 (즉시 응답 jobId)
[브라우저] setInterval(5~8s) GET /api/benchmark?id= ──> [KV] 상태 조회
                                                          └─ 스테이지 머신:
                                                             crawling ─> transcribing ─> analyzing ─> done
                                                             (각 GET이 다음 단위 작업 수행, 300s 이내)
[브라우저] stage=done → 결과 렌더링 (릴스 리스트/전사/구조 분석/새 대본)
```

**타임아웃 안전**: 어떤 개별 작업도 300s 이내. **비용 안전**: job별 상한 상수 + Apify
`maxTotalChargeUsd`. **인프라**: 추가 서비스 0건 (KV는 기존 설치분). **패턴 일치**: review.js
복제.

### Option C: 프론트엔드가 각 단계 직접 호출 — ❌ 불가

- Apify API: `?token=`/Bearer 인증 필요 → **브라우저에 토큰 노출** + 액터 실행은 API 토큰
  기반이라 CORS 허용 없음 [검증됨: docs.apify.com/api/v2 — "If the Actor is not runnable
  anonymously... add your secret API token"]
- OpenAI Whisper: API 키를 브라우저에 넣으면 탈취 위험 + OpenAI는 브라우저 직접 호출을
  금지 취급 [부분검증]
- **기각 확정** — 프로젝트의 "API 키 서버 사이드 전용" 규칙과 정면 충돌.

### 결정: **Option B**

이유: (1) Hobby 300s 제약을 단일 호출로는 해결 불가, (2) KV + random ID 패턴이 이미 검증되어
재사용 가능, (3) 신규 인프라 부재로 배포/운영 부담 최소, (4) 성공 메트릭("타임아웃 없이 완료",
"상한 적용")을 직접 충족.

---

## 6. 비용 통제 정책 (구체 수치)

| 정책 | 값 | 근거/산출 |
|------|-----|-----------|
| **크롤 결과 수 (resultsLimit)** | **30개** | 최신 릴스 풀 확보용. Apify 비용 30 × $0.0026 = $0.078 |
| **바이럴 필터 기준** | `videoViewCount >= 50,000` (설정 상수) | 계정 규모에 따라 조정 가능. 하한 미달 시 "바이럴 릴스 없음" 안내 |
| **분석할 릴스 수 (MAX_ANALYZE_REELS)** | **5개** (기본, UI에서 3~5 선택) | Whisper 5회 ≈ $0.03, Claude 1회 ≈ $0.02~0.05 |
| **Apify run 비용 상한** | `maxTotalChargeUsd: 1` | 요청 시 강제 — 예상치 초과 방지 |
| **job당 총 비용** | **약 $0.13~0.16** | Apify $0.078 + Whisper $0.03 + Claude ~$0.05 |
| **월 실행 횟수 (Free 크레딧)** | **약 60회** (Apify $5 크레딧 기준) | Whisper는 별도 소액 과금(1회 $0.03 → 100회 $3) |
| KV 폴링 상한 | job당 폴링 최대 120회 (15분 × 8s), 이후 `failed(timeout)` | 30K/월 무료 한도 대비 여유 |
| 오디오 길이 캡 | `videoDuration > 180s` 릴스는 전사 제외 | BGM 위주 장편 제외로 비용/품질 방어 |

**서버 강제(프론트 제어 아님)**: `api/benchmark.js`가 위 상수를 코드 상수로 보유하고
요청값을 클램프 — 사용자가 UI를 우회해도 초과 불가. [설계 권장]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Apify run 시작/폴링/결과 fetch | API (serverless) | — | API 키 보안 + 타임아웃 회피(비동기) |
| 바이럴 필터 | API | — | dataset 필드 처리 로직 서버 소유 |
| Whisper 전사 | API | — | OPENAI_API_KEY 서버 전용 |
| Claude 구조 분석/재조립 | API | — | ANTHROPIC_API_KEY 서버 전용 (generate.js 패턴) |
| job 상태 저장 | Database/Storage (KV) | — | Vercel KV (기존 설치) |
| 폴링 루프/진행 UI/결과 렌더링 | Browser | — | 신규 벤치마킹 탭 (additive) |

---

## Common Pitfalls

1. **CDN 링크 만료**: 크롤 완료 후 오래 방치하면 `audioUrl` 403 → 전사 실패.
   → "crawling 완료 즉시(같은 폴링 사이클에서) 전사 시작" 구조 필수.
2. **Hobby 타임아웃 잘못된 가정**: fluid 미활성 프로젝트면 60s 한도 — `vercel.json`에
   `maxDuration: 300` 명시하지 않으면 간헐 504. → config 선언 필수.
3. **일괄 전사 폭주**: 5개를 한 GET에서 전부 전사하면 300s 초과 위험 → GET당 1~2개씩.
4. **KV 값 크기/무한 저장**: 분석 결과 전체 + 원문 캡션 보관 시 값 1MB 접근 → 요약만 저장 +
   `kv.set`에 TTL(24h) 부여.
5. **비공개/신생 계정 0건 결과**: "릴스 없음/비공개 계정" 명확한 한국어 오류 메시지 처리.
6. **레이어 혼동**: 폴링 로직을 프론트 여러 파일에 분산하지 말 것 — 신규
   `benchmark-analyzer.js`(또는 동급) 한 곳에 응집.
7. **재시도/멱등성**: 같은 GET 폴링이 전사를 중복 실행하지 않도록 "transcripts에 없는 릴스만
   전사" 조건 필수 (KV read-modify-write).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js (로컬) | `vercel dev` 로컬 개발 | ✓ | v25.2.1 | — |
| npm | 패키지 관리 | ✓ | 11.6.2 | — |
| @vercel/kv | job 상태 저장 | ✓ | 3.0.0 (설치 완료) | — |
| ffmpeg (로컬) | (선택) 로컬 오디오 디버깅 | ✓ | 8.1.1 | 서버에는 불필요(Whisper mp4 지원) |
| APIFY_API_TOKEN | Apify run 시작 | ⚠️ 미확인 | — | .env.local에 수동 추가 (ENVIRONMENT-GUIDE.md 갱신) |
| OPENAI_API_KEY | Whisper 전사 | ⚠️ 미확인 | — | .env.local에 수동 추가 |
| ANTHROPIC_API_KEY | Claude 분석 | ✓ (기존 사용) | — | — |

**Missing with fallback:** `APIFY_API_TOKEN`, `OPENAI_API_KEY` — 플랜에서 환경변수로 추가하면 됨
(코드 차단 없음). Apify 계정은 무료 가입($5 월 크레딧) 필요.

---

## Package Legitimacy Audit

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| @vercel/kv | npm | 기존 설치 (^3.0.0) | Approved — 변경 없음 |

**신규 npm 패키지 0개.** Apify/OpenAI/Claude 호출은 Node 내장 `fetch`+`FormData`로 수행
(의존성 추가 불필요). `slopcheck` 실행 불필요 — 신규 설치 없음.

---

## Validation Architecture

> config.json: `nyquist_validation: true` → 섹션 포함.

프로젝트는 정형 테스트 프레임워크가 없고 **수동 curl + 브라우저 E2E(TEST-GUIDE.md 관례)**를
사용합니다. 이 관례를 따릅니다.

### Phase Requirements → Test Map (계획 시 확정 예정)

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| (R28~) | POST /api/benchmark가 jobId 반환 + KV 저장 | API (curl) | `curl -X POST .../api/benchmark -d '{"instagramId":"..."}'` |
| (R28~) | GET 폴링이 stage 전이 (crawling→transcribing→analyzing→done) | API (curl, 순차) | `curl ".../api/benchmark?id={jobId}"` 반복 |
| (R28~) | 바이럴 필터 (views >= 기준) | unit (순수 함수) | `node -e` 또는 test-rationale-engine.js 스타일 스크립트 |
| (R28~) | Whisper 전사 성공/오류 경로 | API (curl, 실키) | 수동 — 실제 키 필요 |
| (R28~) | 탭 전환 + 결과 렌더링 | 브라우저 E2E | test-e2e.js 스타일 수동 실행 |
| (R28~) | 비용 상한 (MAX_ANALYZE_REELS 클램프) | unit | 순수 함수 테스트 |

### Wave 0 Gaps
- [ ] `api/benchmark.js` — 신규 (스테이지 머신 + 상수)
- [ ] 벤치마킹 탭 JS 모듈 — 신규 (폴링 루프)
- [ ] ENVIRONMENT-GUIDE.md — APIFY/OPENAI 추가
- [ ] vercel.json — `functions.maxDuration` 추가

---

## Security Domain

> config.json에 `security_enforcement` 명시 없음 → 기본 활성.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 서버 간 API 키만 사용 (사용자 인증 없음) |
| V3 Session Management | no | jobId 기반 상태, 쿠키 없음 |
| V4 Access Control | yes | 랜덤 22자 jobId(128bit, review.js 패턴)로 추측 방지 |
| V5 Input Validation | yes | instagramId/브랜드명 길이·패턴 검증 + MAX 상수 클램프 |
| V6 Cryptography | yes | API 키는 Vercel 환경변수, 응답에서 제거 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API 키 탈취 (프론트 노출) | Information Disclosure | 모든 외부 호출 서버 사이드, `process.env` 전용 |
| jobId 무차별 대입 | Spoofing | crypto.randomBytes(16) 22자 base64url |
| 폴링 DoS / KV 폭주 | DoS | job TTL(24h) + 폴링 간격 서버 무관 + KV 무료 한도 |
| SSRF (임의 URL fetch) | Spoofing | fetch 대상은 Apify dataset의 `audioUrl` 필드 한정(사용자 URL 직접 입력 금지) |
| 프롬프트 인젝션 | Tampering | 릴스 캡션/전사 텍스트는 "데이터"로만 취급, 시스템 프롬프트에서 역할 고정 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `apify/instagram-reel-scraper`와 `website-scraper/instagram-reel-scraper` 입력 스키마 호환(`username` 배열) | 1-2 | 입력 필드명이 다르면 run 실패 → 플랜에서 첫 스모크 테스트로 확인 |
| A2 | Whisper 60초 전사 지연 10~30초 (공식 미명시) | 2-5 | 지연이 더 길면 GET당 전사 개수를 1개로 낮춤 |
| A3 | 프로젝트가 fluid compute 상태인지 미확인 → 최악 60s 가정해 maxDuration 명시 | 3-1 | maxDuration 명시만으로 양쪽 모두 안전 |
| A4 | 인스타 공개 프로필은 익명 크롤 가능 (쿠키 불필요) | 1-1 | IG가 로그인 장벽 강화 시 세션 쿠키/리지덴셜 프록시 도입 필요(계정 밴 리스크) |
| A5 | Upstash KV 값 1MB 제한 | 3-3 | 결과를 요약 저장하는 설계라 실제 영향 없음 |
| A6 | 바이럴 기준 50,000 views가 합리적 | 6 | 계정 규모에 따라 조정 — 상수화로 대응 |

---

## Sources

### Primary (HIGH confidence)
- https://apify.com/apify/instagram-reel-scraper — 액터 소개, 출력 샘플(모든 필드), PPE 비용, free 크레딧
- https://apify.com/website-scraper/instagram-reel-scraper/api/openapi — 입력 스키마(username/resultsLimit 등), run-sync 엔드포인트
- https://docs.apify.com/api/v2/act-runs-post.md — run 생성, 상태값(READY~ABORTED), maxTotalChargeUsd
- https://docs.apify.com/api/v2/actor-run-get — run 폴링(waitForFinish), actor-run-dataset-items shortcut
- https://docs.apify.com/api/v2 — 액터 이름 기반 ID, 인증, /v2/acts/ deprecated 안내
- https://apify.com/pricing — Free 플랜 $5 크레딧, 소진 시 차단
- https://developers.openai.com/api/docs/guides/speech-to-text — 25MB, mp4 포함 포맷, language 파라미터
- https://developers.openai.com/api/reference/resources/audio/transcriptions — 엔드포인트, response_format, whisper-1
- https://developers.openai.com/api/docs/models/whisper-1 — $0.006/분, rate limit 표
- https://vercel.com/docs/functions/limitations — Hobby 300s 최대, Pro 800s/1800s
- https://vercel.com/docs/functions/configuring-functions/duration — vercel.json maxDuration 설정
- https://vercel.com/docs/limits — 2025-04-23 이전 구버전 한도(Hobby 10s/60s)
- https://vercel.com/changelog/vercel-kv-is-now-generally-available — KV Hobby 30K req/월, 256MB

### Secondary (MEDIUM confidence)
- https://vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes — 1800s 확장 베타 확인(2026-06)
- https://use-apify.com/docs/what-is-apify/apify-free-plan — Free 플랜 상세(무신용카드, $0.20/CU)
- https://vercel.com/docs/plans/hobby — Hobby 플랜 표 (함수 300s 명시)

### Tertiary (LOW confidence)
- Whisper 지연(10~30s/60s 오디오) — 커뮤니티 관측값
- 한국어 숏폼 정확도 특성 — 일반적 지식 기반

---

## 결론 및 권장 아키텍처

**결정: Option B — `POST /api/benchmark`(job 생성) + `GET /api/benchmark?id=`(폴링) + Vercel KV 스테이지 머신.**

- **액터**: 공식 `apify/instagram-reel-scraper`, `resultsLimit: 30`, `includeDownloadedVideo: false`.
  `videoViewCount >= 50000` 필터로 상위 **최대 5개** 선정.
- **전사**: `audioUrl`(오디오 전용 mp4)을 서버가 fetch → Whisper `whisper-1` multipart 업로드
  (`model=whisper-1, language=ko, response_format=verbose_json`). ffmpeg 불필요.
- **분석/재조립**: `api/generate.js`의 `withRetry` + 시스템 프롬프트 패턴으로 Claude 호출 —
  segment 타임스탬프 기반 훅/전개/클로징 구조 해부 → 새 키워드로 대본 재조립.
- **폴링**: 클라이언트 setInterval 5~8s, GET 1회가 "완료된 다음 단계의 작업 1단위"만 수행
  (전사는 GET당 1~2개) → 모든 호출이 Vercel 300s 이내. `vercel.json`에
  `maxDuration: 300` 명시.
- **비용**: job당 ~$0.15, Apify 월 $5 크레딧으로 약 60회/월. 서버 코드 상수로
  `MAX_ANALYZE_REELS=5`, Apify `maxTotalChargeUsd=1` 강제.
- **재사용**: `review.js`의 random ID + KV 패턴, `generate.js`의 retry, `research.js`의
  에러 격리 구조. 프론트 폴링은 신규 모듈로 추가(기존 파일 무수정).
- **리스크 대응**: CDN 만료(즉시 전사), 0건 계정(명확한 오류), IG 정책 변화(쿠키 옵션 백업).

**Planner에게**: 신규 파일 범위는 `api/benchmark.js` 1개 + 벤치마킹 탭 JS 모듈 + index.html
탭 버튼/컨테이너 + state-manager 탭 목록 + vercel.json functions + ENVIRONMENT-GUIDE.md +
`env`에 APIFY_API_TOKEN/OPENAI_API_KEY 추가. 외부 키 2개는 사용자 승인 필요(checkpoint).
