# Project Research: Architecture — v2 원소스 멀티유즈 콘텐츠 시스템

> 상태: 조사 완료
> 대상: AD SCRIPT STUDIO v2
> 작성일: 2026-08-09
> 조사자: GSD 프로젝트 연구원 (Phase 6)

---

## 요약

AD SCRIPT STUDIO v2는 **원소스 멀티유즈(One-Source Multi-Use)** 콘텐츠 생성 시스템으로, v1의 전략 제안서 생성 기능을 확장하여 **콘텐츠 코어 생성 계층**과 **포맷 렌더러 계층**이라는 두 계층 구조로 재설계한다.

**핵심 아키텍처 결정 사항:**

1. **콘텐츠 코어 스키마** — v1의 10개 입력 필드(appState)를 확장하여 상품/주제/타겟/당위성/법적고지/니치 규칙/깊이단계 소구점까지 포함하는 통합 스키마. **YAML을 기본 저장 형식으로 권장**한다. 사람이 편집하기 쉽고, 니치 스키마(NICHE_SCHEMA.md)와의 일관성 유지, Git 버전 관리에 적합하기 때문이다. 서버리스 함수 내부에서는 런타임에 JSON으로 파싱하여 사용.

2. **렌더러 아키텍처** — 4개 포맷(쇼츠/카드뉴스/인포그래픽/롱폼) 렌더러가 공통 콘텐츠 코어를 소비하며, 각 포맷별 필드 소비 매핑표를 통해 경계 명확화. 렌더러 간 공통 유틸리티(법적 고지 삽입, 과장 필터, 프롬프트 템플릿)를 공유 모듈로 분리.

3. **하이브리드 배포 패턴** — **패턴 3 권장**: Vercel 서버리스(api/content/*.js)는 콘텐츠 코어 CRUD, 렌더 결과물 생성(경량: 원고+프롬프트+자막 텍스트), 렌더 작업 상태 조회까지 담당. 실제 미디어 처리(이미지 생성/TTS/렌더링)는 로컬 스크립트(scripts/)가 담당. 두 환경 간 동기화는 파일 기반(content/campaigns/{campaignId}/)으로 수행.

4. **주제 브릿지** — **옵션 C(수동 복붙/URL 입력)로 시작, 이후 옵션 A(정적 YAML 카탈로그)로 전환** 권장. 옵션 B는 mc 저장소 구조 조사 필요로 이번 마일스톤 범위 밖.

5. **법적 고지 + 필터** — 콘텐츠 코어의 `legal` 필드 → 렌더러의 포맷별 고지 삽입 → 렌더 결과물 생성 후 검증 단계의 3단계 구조. 필터는 boolean이 아닌 위반 항목 목록 + 심각도(critical/warning/info) + 제안 수정안을 반환.

6. **상태 관리** — 캠페인별 상태는 파일 기반(content/campaigns/{campaignId}/core.yaml)으로 저장. 렌더 진행 상태는 Vercel KV를 재사용하되, 로컬 스크립트와의 동기화는 파일 기반 폴링 또는 명시적 완료 플래그로 처리.

**v1과의 연속성:** 전략 제안서 생성기(메인 기능)는 무손상 유지. 영상 소스 생성기(template-video.js, video-ui.js)는 쇼츠 렌더러의 하위 부품으로 흡수되나 즉시 삭제하지 않고 추후 정리 대상. 벤치마킹 분석기는 콘텐츠 코어에 입력할 근거 자료 공급원으로 재정의.

---

## 1. 콘텐츠 코어 스키마 설계

### 1.1 배경: v1 appState와의 관계

v1의 `state-manager.js`는 10개 필드(brandName, productName, concept, target, toneAndManner, competitorInfo, priceRange, reviewExcerpts[], trustFactors[], excludedKeywords[]) + 모드 상태(manual/auto)를 클라이언트 사이드에서 관리했다. v2 콘텐츠 코어는 이 10개 필드를 **포함 + 확장**한다.

**마이그레이션 경로:**

| v1 필드 | v2 콘텐츠 코어 내 위치 | 비고 |
|---------|------------------------|------|
| brandName | `product.brand` | |
| productName | `product.name` | |
| concept | `message.concept` | |
| target | `target.description` | |
| toneAndManner | `message.tone` | enum 값 매핑 필요 |
| competitorInfo | `product.competitor` | |
| priceRange | `product.price` | |
| reviewExcerpts[] | `evidence.reviews[]` | |
| trustFactors[] | `product.trustFactors[]` | |
| excludedKeywords[] | `legal.restrictedClaims[]` + `niche.restrictions.avoidWords[]` | 의미적 재배치 |

**v1 appState와의 호환성:** 기존 v1 UI/코드와의 호환성을 위해 `core.fromAppState(appState)` / `core.toAppState(core)` 변환 함수를 api/content/core.js에 제공. v1 코드는 점진적으로 v2 코어로 전환하되, 전환 전까지는 병행 사용 가능.

### 1.2 필드 구성 (권장)

ARCHITECTURE.md 초안의 6개 그룹을 기반으로 정리:

#### 그룹 A: 식별 · 메타
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `campaignId` | string | ✅ | 캠페인/콘텐츠 고유 ID |
| `createdAt` | string (ISO) | ✅ | 생성 일시 |
| `updatedAt` | string (ISO) | ✅ | 갱신 일시 |
| `product.name` | string | ✅ | 상품/서비스명 |
| `product.brand` | string | ✅ | 브랜드명 |
| `product.category` | string | - | 카테고리 (니치 매핑용) |
| `product.price` | string | - | 가격대 + 구매 장벽 |
| `product.competitor` | string | - | 경쟁 제품명 + 차이점 |
| `product.trustFactors[]` | string | - | 브랜드 신뢰 요소 |

#### 그룹 B: 니치 (신규 — NICHE_SCHEMA.md 연계)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `niche.id` | string | ✅ | 니치 식별자 (예: `travel-destination`) |
| `niche.name` | string | ✅ | 한국어 이름 |
| `niche.version` | string | ✅ | 스키마 버전 |
| `niche.tone.primary` | string | - | 기본 톤 |
| `niche.restrictions.avoidWords[]` | string | - | 금기어 |
| `niche.restrictions.avoidPhrases[]` | string | - | 주의 표현 |
| `niche.restrictions.claimLimits` | object | - | 수치/비교 주장 제한 |
| `niche.trust.signals[]` | string | - | 신뢰 신호 유형 |
| `niche.depths.basic/applied/advanced` | object | - | 깊이 단계별 소구점 |

#### 그룹 C: 타겟 · 목적
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `target.description` | string | ✅ | 타겟 고객 설명 |
| `target.painPoints[]` | string | - | 구체적 고민/통증 |
| `purpose.stage` | enum | ✅ | 인지/고려/결정 단계 |
| `purpose.callToAction` | string | - | 원하는 최종 행동 |

#### 그룹 D: 메시지 · 당위성
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `message.concept` | string | ✅ | 핵심 컨셉/메시지 |
| `message.tone` | enum | ✅ | 톤앤매너 |
| `rationale.principles[]` | object | - | 적용된 26원칙 + 제품별 근거 |
| `rationale.excludedPrinciples[]` | string | - | 의도적으로 뺀 원칙 |

#### 그룹 E: 근거 자료
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `evidence.reviews[]` | string | - | 고객 리뷰 발췌 |
| `evidence.viralScripts[]` | object | - | 벤치마킹 분석 데이터 |
| `evidence.researchSummary` | string | - | 자동 조사/AI 리서치 요약 |

#### 그룹 F: 법적 고지
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `legal.affiliateType` | enum | - | 쿠팡파트너스/브랜드커넥스/기타/없음 |
| `legal.disclosureText` | string | - | 포맷별 삽입 고지 문구 (템플릿 자동 + 수동 오버라이드) |
| `legal.restrictedClaims[]` | string | - | 사용하면 안 되는 표현 목록 |

#### 그룹 G: 시스템 메타 (자동 관리)
| 필드 | 타입 | 설명 |
|------|------|------|
| `schemaVersion` | string | 콘텐츠 코어 스키마 버전 (예: `2.0`) |
| `source` | string | `'user' | 'auto-research' | 'bridge'` — v1 fieldSourceMap 계승 |
| `parentCampaignId` | string | (선택) 파생 원본 캠페인 ID |

### 1.3 저장 형식: YAML 권장 + 근거

**권장: YAML을 기본 저장 형식, JSON을 내부 처리 형식으로 사용.**

| 기준 | YAML | JSON |
|------|------|------|
| 사람 가독성 | 우수 (계층 구조, 주석 가능) | 보통 (계층은 표현되나 주석 불가) |
| Git diff 친화성 | 우수 (라인 단위 변경 추적) | 보통 (한 줄 압축 시 diff 어려움) |
| 니치 스키마(NICHE_SCHEMA.md)와의 일관성 | 우수 (NICHE_SCHEMA.md가 YAML 예시 사용) | 불일치 |
| 서버리스 파싱 | `js-yaml` 패키지 필요 (경량) | 기본 `JSON.parse` 가능 |
| v1 호환성 | 변환 필요 | v1 appState가 JSON 유사 구조 |

**근거:**
1. 콘텐츠 코어는 사람이 편집하는 문서 성격이 강하다 (campaignId별 core.yaml). YAML이 가독성/수정 편의성에서 우위.
2. NICHE_SCHEMA.md, LEGAL_COMPLIANCE.md 등 관련 설계가 이미 YAML 스타일로 작성되어 있어 일관성 유지.
3. Vercel 서버리스 함수는 런타임에 `js-yaml`로 파싱 후 메모리에서 JSON 객체로 사용. 저장 시에도 YAML 직렬화.
4. v1 appState(JSON 유사)는 `core.fromAppState()`로 변환 진입점 제공.

**스키마 버전 관리:** `schemaVersion` 필드로 관리. v1 appState는 암시적 `1.0`. v2 콘텐츠 코어는 `2.0`. 변환 함수는 버전 간 마이그레이션을 담당. 새 버전 추가 시 기존 코어 파일을 읽을 수 있는 후방 호환성 maintained.

### 1.4 필수 필드 vs 선택 필드

**필수 필드 (콘텐츠 코어 생성 시 반드시 필요):**
- `campaignId`, `createdAt`, `updatedAt`, `schemaVersion`
- `product.name`, `product.brand`
- `target.description`
- `message.concept`, `message.tone`
- `purpose.stage`
- `niche.id`, `niche.name`, `niche.version`

**선택 필드:** 나머지는 선택. 비어 있어도 렌더러가 기본값으로 처리하거나, 해당 필드가 필요 없는 포맷 렌더러는 무시.

**검증:** v1의 `validateRequired()` 패턴을 확장. api/content/core.js에 `validateCore(core)` 함수로 필수 필드 검사 + 선택 필드 타입 검증.

---

## 2. 렌더러 아키텍처

### 2.1 렌더러 공통 인터페이스

모든 렌더러는 다음 인터페이스를 따른다:

```
입력:  콘텐츠 코어 객체 (YAML 파싱된 JSON)
출력:  렌더 결과 객체 (포맷별 정의)
공통:  법적 고지 삽입, 과장 필터 검증, 프롬프트 템플릿 로드
```

**공통 모듈 (api/content/ 아래 공유):**

| 모듈 | 역할 |
|------|------|
| `core.js` | 스키마 검증, 저장/조회, 변환 함수 |
| `legal.js` | 고지 템플릿 선택, 포맷별 고지 위치 결정, 고지 텍스트 생성 |
| `filter.js` | 과장/금기어 필터 실행, 위반 항목 목록 + 심각도 반환 |
| `prompts.js` | assets/prompts/ 아래의 마크다운/템플릿 파일 로드 + 치환 |
| `niche.js` | 니치 스키마 로드, depth 단계별 소구점 조회, 금기어/신뢰 표현 규칙 적용 |

**렌더러별 파일:**
- `renderer-shorts.js`
- `renderer-cards.js`
- `renderer-infographic.js`
- `renderer-longform.js`
- `topic-bridge.js` (주제 브릿지 — 렌더러는 아니지만 콘텐츠 코어 초안 생성에 관여)

### 2.2 렌더러별 출력 형식

| 렌더러 | 출력 형식 | 주요 필드 |
|--------|-----------|-----------|
| **쇼츠** | `{ script: { scenes[], duration }, subtitles: [], imagePrompts: [], audioScript: string, disclosure: { video: string, description: string } }` | 씬별 대사/연출지시, 자막 텍스트, EN 이미지 프롬프트, TTS 원고, 법적 고지(영상용/설명란용) |
| **카드뉴스** | `{ slides: [{ number, headline, body, visualDirection, imagePrompt? }], disclosure: { slide: number, text: string }, caption: string }` | 슬라이드별 카피, 시각 지시, 필요 시 EN 이미지 프롬프트, 마지막 슬라이드 고지, 게시 캡션 |
| **인포그래픽** | `{ dataPoints: [{ label, value, comparison?, source? }], narrative: string, visualLayout: string, disclosure: { text: string, position: string }, restrictedClaimsCheck: object }` | 비교/통계 데이터 포인트, 내러티브 텍스트, 시각 구성 지시, 고지, 수치 주장 검증 결과 |
| **롱폼** | `{ title, introduction, sections: [{ heading, content, depth: 'basic'|'applied'|'advanced' }], conclusion, cta, disclosure: { position: string, text: string } }` | 제목, 도입부, 깊이 단계별 섹션, 결론/CTA, 제휴 고지 위치/문구 |

**출력 형식 표준화 원칙:**
- 모든 렌더러는 **공통 필드** `renderMetadata: { renderer: string, renderedAt: ISO, coreCampaignId: string, filterResult?: object }`를 포함.
- 법적 고지 관련 필드는 모든 렌더러 출력에 포함 (`disclosure` 또는 `legalNotice`). 단, 위치와 형태는 포맷별로 다름.
- 이미지 프롬프트가 필요한 렌더러(쇼츠, 카드뉴스)는 `imagePrompts` 배열 포함. 프롬프트 스타일 규칙은 assets/styles/ 아래 해당 렌더러의 스타일 가이드 참조.

### 2.3 렌더러 간 공통 코드 재사용 패턴

```
api/content/
├── core.js              # 스키마 검증, CRUD, 변환
├── legal.js             # 고지 템플릿 + 포맷별 삽입
├── filter.js            # 과장/금기어 필터
├── prompts.js           # 프롬프트 템플릿 로드
├── niche.js             # 니치 스키마 + depth 소구점
├── renderer-shorts.js   # import { core, legal, filter, prompts, niche }
├── renderer-cards.js    # 동일
├── renderer-infographic.js
├── renderer-longform.js
└── topic-bridge.js
```

각 렌더러는 공유 모듈을 import하여 사용. 렌더러 고유 로직만 각 파일에 작성. 이로써 렌더러 추가/수정 시 공통 로직 중복 방지.

---

## 3. 하이브리드 배포 아키텍처

### 3.1 v1 아키텍처와의 차이점

**v1:** 모든 로직이 두 곳에 분산:
- 프론트엔드(browser): Vanilla JS로 상태 관리, 템플릿 렌더링, PDF 생성
- 서버리스(api/*.js): LLM 호출(Claude API), 벤치마킹 파이프라인(Apify + Whisper)

**v2 추가:**
- 콘텐츠 코어 CRUD (api/content/core.js)
- 렌더러 로직 (api/content/renderer-*.js)
- 로컬 미디어 처리 파이프라인 (scripts/shorts/*.py)

### 3.2 서버리스(api/content/) 책임

**담당 업무:**
1. 콘텐츠 코어 CRUD
   - `POST /api/content/core` — 새 캠페인 코어 생성/저장
   - `GET /api/content/core?campaignId=` — 코어 조회
   - `PATCH /api/content/core` — 코어 일부 필드 업데이트
   - `GET /api/content/core/list` — 캠페인 목록 (메타만)

2. 렌더 작업 요청 + 경량 결과물 생성
   - `POST /api/content/render/shorts` — 콘텐츠 코어 → 쇼츠 원고 + 프롬프트 + 자막 텍스트 생성 (서버리스 내에서 완료)
   - `POST /api/content/render/cards` — 카드뉴스 슬라이드 카피 생성
   - `POST /api/content/render/infographic` — 인포그래픽 데이터 정리
   - `POST /api/content/render/longform` — 롱폼 원고 생성

3. 렌더 작업 상태 조회 (로컬 스크립트 실행 시)
   - `GET /api/content/render/status?campaignId=` — 로컬에서 렌더링 진행 중이면 상태 반환

4. 주제 브릿지
   - `GET /api/content/topics` — 사용 가능한 주제 카탈로그 목록
   - `POST /api/content/topics/bridge` — 주제/URL 입력 → 콘텐츠 코어 초안 생성

**담당하지 않는 업무 (로컬 스크립트에 위임):**
- 이미지 생성 (nanobanana/Gemini API 호출은 서버리스에서 가능하나, 대용량 배치 처리는 로컬 권장)
- TTS (edge-tts 등)
- 영상 렌더링 (moviepy)
- Whisper 자막 동기화 (로컬 파일 처리)
- 대용량 파일 업로드/다운로드

### 3.3 로컬(script/) 책임

**담당 업무:**
1. 쇼츠 미디어 파이프라인 (scripts/shorts/)
   - `fetch_photos.py` — Pexels 등 실사 이미지 다운로드
   - `generate_tts.py` — edge-tts 등으로 음성 생성
   - `render_video.py` — moviepy로 영상 합성
   - `make_thumbnail.py` — 썸네일 생성

2. 자막 동기화 (scripts/whisper/)
   - `sync_subtitles.py` — Whisper 결과물 + 영상 싱크 맞추기

3. 콘텐츠 코어 로컬 처리 (scripts/content/)
   - `build-core-from-md.py` — 마크다운/YAML → 콘텐츠 코어 객체 변환 등

### 3.4 동기화 패턴: 파일 기반 (권장)

**패턴:** `content/campaigns/{campaignId}/` 디렉토리를 서버와 로컬이 공유 파일 시스템으로 사용.

```
content/campaigns/2026-08-여행서비스_A/
├── core.yaml            # 콘텐츠 코어 (서버가 쓰고 읽음)
├── shorts/
│   ├── script.md        # 서버 생성 원고
│   ├── images/          # 로컬 스크립트가 Pexels 이미지 다운로드
│   ├── audio/           # 로컬 스크립트가 TTS 생성
│   ├── subtitles/       # 로컬 스크립트가 자막 생성
│   └── output/          # 로컬 스크립트가 최종 영상 출력
│       └── final.mp4
├── cards/
├── infographic/
└── longform/
```

**동기화 흐름 (패턴 3):**

1. 사용자 웹 UI에서 콘텐츠 코어 입력 → `POST /api/content/core` → `content/campaigns/{id}/core.yaml` 저장
2. 사용자 "쇼츠 렌더" 클릭 → `POST /api/content/render/shorts` → 서버가 `core.yaml` 읽고 쇼츠 원고+프롬프트+자막 텍스트 생성 → `shorts/script.md`, `shorts/prompts.json`, `shorts/subtitles.srt` 저장 → 즉시 반환
3. 사용자 로컬에서 `python scripts/shorts/render_video.py --campaign-id {id}` 실행 → `shorts/` 아래의 원고/프롬프트/자막 읽어서 이미지 다운로드/TTS/렌더링 수행 → `shorts/output/final.mp4` 생성
4. (선택) 웹 UI에서 `GET /api/content/render/status?campaignId={id}`로 로컬 렌더링 완료 여부 확인 (output/ 아래에 final.mp4 존재 여부로 판별)

**동기화 방식 선택 근거:**

| 방식 | 장점 | 단점 | 권장? |
|------|------|------|------|
| **파일 기반(content/campaigns/)** | 구현 단순, Vercel KV 의존 없음, Git 버전 관리 가능, 캠페인 격리와 자연스럽게 통합 | 로컬과 서버가 동일 파일 시스템에 접근 가능해야 함 (Vercel은 로컬 파일 접근 불가 → 사용자 로컬에서 scripts 실행 시 로컬 파일 시스템 사용) | **권장** |
| Vercel KV | 서버리스에서 상태 조회 용이 | 로컬 스크립트가 KV에 접근하려면 API 키 필요, TTL 관리 필요, v1 benchmark.js와의 키 네임스페이스 분리 필요 | 보조적으로 사용 가능 |
| 별도 DB | 구조화된 쿼리 가능 | 운영 부담, 과한 인프라 | 당분간 불필요 |

**권장:** 파일 기반 동기화를 기본으로 하되, Vercel 서버리스가 로컬 스크립트 실행 상태를 알아야 하는 경우 KV에 간단한 상태 플래그만 저장.

### 3.5 권장 패턴 + 근거: 패턴 3

FOLDER_STRUCTURE.md에서 제시된 3가지 패턴 중 **패턴 3(서버리스에서 경량 출력 + 무거운 렌더링은 로컬)**을 권장.

**근거:**
1. **Vercel 서버리스 제약:** maxDuration 300초(Pro 플랜), 메모리 제한, 콜드 스타트. moviepy/Whisper 등 무거운 처리는 이 제약 안에서 안정적으로 실행하기 어려움.
2. **비용:** 쇼츠 1개 렌더링에 필요한 이미지 생성/TTS/렌더링을 서버리스에서 실행하면 실행 시간 기반 비용 증가. 로컬에서 실행하면 비용 0.
3. **실용성:** 콘텐츠 코어 → 원고/프롬프트/자막 텍스트까지는 서버리스로 자동화(빠르고 안정적). 실제 미디어 처리는 사용자 로컬에서 필요 시 실행. 완전 자동화가 꼭 필요하지 않은 초기 단계에 적합.
4. **확장성:** 추후 별도 워커/서버 환경 구축 시 패턴 2로 전환 가능. 패턴 3의 서버리스 API는 그대로 재사용 가능(API가 생성하는 원고/프롬프트/자막 텍스트 형식은 동일).

**패턴 3의 한계와 대응:**
- 한계: 완전한 엔드투엔드 자동화가 아님. 사용자가 로컬에서 스크립트 실행 필요.
- 대응: 로컬 스크립트 실행 방법을 문서화(skills/renderer/shorts-style.md에 실행 가이드 포함). 이후 별도 워커 환경 구축 시 패턴 2로 전환.

---

## 4. 주제 브릿지 아키텍처

### 4.1 배경

mc 블로그 체인에서 발행된 주제(시드 키워드 + 깊이 단계별 소제목)를 가져와서, 동일 주제로 쇼츠/카드뉴스/인포그래픽/롱폼을 만드는 연결 고리가 필요.

### 4.2 카탈로그 형식 권장

**YAML 권장.** 이유:
- NICHE_SCHEMA.md, FOLDER_STRUCTURE.md와 일관성
- 사람이 읽고 수정하기 쉬움
- Git 버전 관리에 적합

**카탈로그 파일 예시 (content/catalog/여행서비스_제주풀빌라.yaml):**

```yaml
topic:
  id: travel-jeju-poolvilla
  seedKeyword: "제주 풀빌라"
  niche: travel-destination
  source:
    type: mc-blog-chain
    chainId: "2026-07-여행서비스"
    blogUrls:
      - "https://example.com/제주풀빌라-기초"
      - "https://example.com/제주풀빌라-응용"
      - "https://example.com/제주풀빌라-고급"
  depthStages:
    basic:
      title: "제주에도 사람 없는 풀빌라가 있다"
      subPoints:
        - "관광지 말고 우리만 있는 공간"
        - "제주도 숙박 시장의 새로운 트렌드"
    applied:
      title: "풀빌라 vs 호텔 vs 펜션, 비용 대비 만족도"
      subPoints:
        - "1박 비용 비교"
        - "실제 경험담 기반 장단점"
    advanced:
      title: "지금 예약해야 하는 이유"
      subPoints:
        - "성수기 예약 경쟁"
        - "시즌 한정 특전"
  createdAt: "2026-08-09T00:00:00Z"
```

### 4.3 연결 방식 옵션 비교

| 옵션 | 구현 복잡도 | 유지보수 | 실시간성 | mc 의존성 | 권장 여부 |
|------|------------|----------|----------|-----------|-----------|
| **A: 정적 YAML 카탈로그** | 낮음 (파일 생성/수정) | 중간 (수동 갱신 필요) | 없음 | 낮음 (카탈로그만 유지) | **2단계에서 권장** |
| **B: 자동 수집 스크립트** | 중간~높음 (수집 로직 + 유지보수) | 낮음 (자동 갱신) | 있음 (실행 시점) | 높음 (mc 저장소 구조 의존) | 이번 마일스톤 범위 밖 |
| **C: 수동 복붙/URL 입력** | 매우 낮음 (입력 필드 1개) | 없음 | 없음 | 없음 | **1단계 권장** |

### 4.4 권장 방향

**1단계(이번 마일스톤): 옵션 C로 시작**
- 콘텐츠 코어 생성 UI에 "참조 주제/URL 입력" 필드 추가
- 입력이 있으면 해당 주제의 깊이 단계별 소제목을 AI로 추정 생성하여 콘텐츠 코어 초안으로 적재
- 입력이 없으면 콘텐츠 코어의 기본 필드로만 진행
- 구현 비용 최소화, 콘텐츠 코어 + 렌더러 기본 동작 완성 후 주제 브릿지 고도화

**2단계(후속 마일스톤): 옵션 A로 전환**
- mc 블로그 체인 주제들의 YAML 카탈로그를 수동 작성 (또는 반자동 변환)
- `content/catalog/*.yaml`로 저장, `GET /api/content/topics`로 목록 노출
- 사용자가 카탈로그에서 주제 선택 → 콘텐츠 코어 초안 자동 적재
- 새 mc 체인이 추가될 때 수동 파일 생성 필요하나, 한 번 작성하면 재사용 가능

**옵션 B는 보류:** mc 저장소 구조/발행 로그 형식에 대한 조사 없이 판단 불가. 또한 "mc는 코드 이전 대상이 아니다"라는 제약과 충돌하지 않도록, 수집만 하고 코드는 안 가져오는 방식이어야 하는데, 이 경계를 명확히 하려면 먼저 mc 측 구조 파악이 필요.

---

## 5. 법적 고지 + 필터 아키텍처

### 5.1 전체 흐름

```
콘텐츠 코어 (legal 필드 포함)
    ↓
     [렌더러: 포맷별 원고/카피 생성]
    ↓
     [법적 고지 삽입: 렌더러가 포맷별 적절한 위치에 disclosureText 삽입]
    ↓
     [과장 표현 필터: 결과물 텍스트 검사]
    ↓
     ├── filter.passed = true → 최종 결과물 반환
     └── filter.passed = false → 위반 항목 목록 + 심각도 반환
            ├── critical → 결과물 출력 중단 + 사용자 수정 요청
            └── warning → 결과물 포함하되 경고 플래그 표시
```

### 5.2 포맷별 고지 삽입 위치 (LEGAL_COMPLIANCE.md 기반)

| 포맷 | 고지 위치 | 비고 |
|------|-----------|------|
| **쇼츠** | (1) 영상 내 자막/텍스트: 시작 부근 or 제휴 제안 첫 장면, (2) 영상 설명란 상단 | vox-content 자막 규칙(최대 2줄, 문장 단위)과 충돌하지 않도록 단문 사용 |
| **카드뉴스** | 마지막 슬라이드 (전용 슬라이드 or 마지막 슬라이드 내 문구) + 게시 캡션 | 슬라이드 디자인에 따라 텍스트 크기/위치 조정 |
| **인포그래픽** | 이미지 하단/여백 (작지만 가독성 있게) + 게시글 캡션 | 이미지 생성 단계에서 고지 텍스트 공간 미리 확보 권장 |
| **롱폼** | 원고 상단 (권장) + 제휴 링크 최초 등장 지점 근처 재강조(선택) + 글 하단(선택) | 독자가 본문 진입 전 인지하는 것이 가장 중요 |

**고지 템플릿 선택:** 콘텐츠 코어의 `legal.affiliateType`에 따라 assets/legal/disclosures-kr.md의 템플릿 자동 선택. 필요 시 `legal.disclosureText`로 수동 오버라이드.

### 5.3 필터 단계 위치

필터는 **렌더 결과물 생성 직후, 최종 출력 직전**에 실행.

```
api/content/renderer-shorts.js (예시):

export async function renderShorts(core) {
  // 1. 쇼츠 원고/프롬프트/자막 생성
  const draft = generateShortsDraft(core);
  
  // 2. 법적 고지 삽입
  const withDisclosure = insertDisclosure(draft, core.legal);
  
  // 3. 과장 표현 필터
  const filterResult = await runFilter(withDisclosure, core);
  
  // 4. 필터 결과에 따른 처리
  if (!filterResult.passed && filterResult.hasCritical) {
    return { success: false, filterResult, draft: withDisclosure };
  }
  
  return {
    success: true,
    result: withDisclosure,
    filterResult,  // 경고가 있어도 결과는 반환, 플래그만 표시
    metadata: { renderedAt: new Date().toISOString() }
  };
}
```

### 5.4 필터가 검사하는 항목 (LEGAL_COMPLIANCE.md §4-2 기반)

| 검사 항목 | 검사 방식 | 심각도 |
|-----------|-----------|--------|
| **금기어** | `core.legal.restrictedClaims[]` + `core.niche.restrictions.avoidWords[]` 포함 여부 | critical |
| **과장·허위 표현** | 패턴 매칭 ("반드시", "100%", "완치", "보장" 등) + 맥락 판단(간단 규칙) | critical / warning |
| **수치·비교 주장** | 수치/비교 표현 존재 시 `evidence` 필드에 근거 있는지 확인 | warning |
| **법적 모호 표현** | 패턴 매칭 ("세계 최초", "유일", "최고" 등) | warning |
| **제휴 고지 누락** | `legal.affiliateType`이 설정되었는데 결과물에 고지가 포함되었는지 확인 | critical |

### 5.5 필터 결과 처리

필터는 boolean이 아닌 상세한 위반 항목 목록을 반환:

```javascript
// filter.js 반환 형식
{
  passed: false,
  hasCritical: true,
  hasWarning: true,
  violations: [
    {
      type: 'restricted_word',       // 'restricted_word' | 'exaggerated_claim' | 'missing_evidence' | 'legal_vague' | 'disclaimer_missing'
      severity: 'critical',          // 'critical' | 'warning' | 'info'
      text: '이 제품을 먹으면 2주 만에 완치됩니다',
      matchedWord: '완치',
      location: { format: 'shorts', part: 'scene_3_dialogue' },
      suggestion: "'완치'를 '도움'으로 대체 검토"
    },
    {
      type: 'disclaimer_missing',
      severity: 'critical',
      location: { format: 'shorts', part: 'video_description' },
      suggestion: '영상 설명란에 제휴 고지 문구 추가 필요'
    }
  ]
}
```

**심각도 기준:**
- **critical**: 출력 전 반드시 해결 필요 (금기어, 허위/과장, 고지 누락). 결과물 반환 시 `success: false` + 사용자에게 수정 요청.
- **warning**: 출력 가능하지만 검토/수정 권장. 결과물에 포함하되 UI에서 경고 플래그 표시.
- **info**: 참고 정보. 결과물에 영향 없이 로그/레이지에 기록.

**반복적 위반 처리:** 같은 위반이 여러 번 발생하면 필터 결과에 집계 표시. 사용자가 필터 결과 보고 수정 후 재렌더 요청 가능.

---

## 6. 상태 관리

### 6.1 v1 상태 관리와의 연속성

v1의 `state-manager.js`는:
- `appState` (10개 필드 + 모드)
- `tabState` (activeTab, proposalResults, videoResults, benchmarkResults)
- 세션 스토리지 기반 탭 상태 지속
- "2번으로 보내기" 패턴 (proposalResults → videoResults 전달)

**v2에서의 계승:**
- `tabState` 패턴 유지 (전략 제안서 생성기 + 영상 소스 생성기 + 신규 렌더러 탭들)
- "N번으로 보내기" 패턴 확장: 콘텐츠 코어 → 원하는 포맷 렌더러로 전달
- 세션 스토리지는 브라우저 탭 전환 시 상태 유지에 계속 사용

**v2에서의 변경/확장:**
- 콘텐츠 코어(`core.yaml`)가 `appState`를 대체/확장. appState는 콘텐츠 코어 생성 전의 임시 입력 상태로 재정의 가능.
- 캠페인별 상태는 이제 파일 기반(content/campaigns/{campaignId}/)으로 저장. 세션 스토리지보다 영속성 높음.
- v1의 `fieldSourceMap`(field 출처 추적: user/auto-research)은 콘텐츠 코어의 `source` 필드로 승계.

### 6.2 캠페인 상태 저장

**저장 위치:** `content/campaigns/{campaignId}/core.yaml`

**저장 시점:**
- 사용자가 "캠페인 저장" 클릭 시
- 콘텐츠 코어 필드 변경 후 자동 저장 (debounce 2초)
- 렌더 작업 시작 전 스냅샷 저장 (렌더 결과의 추적성 확보)

**저장 내용:** 콘텐츠 코어 전체 + 렌더 결과 메타데이터(어떤 렌더러가 언제 어떤 결과를 생성했는지). 실제 렌더 결과물(영상 파일 등)은 `content/campaigns/{campaignId}/` 아래 해당 포맷 디렉토리에 별도 저장.

**목록 조회:** `GET /api/content/core/list` → `content/campaigns/` 아래의 캠페인 디렉토리 목록 반환 (메타데이터만: campaignId, title, createdAt, 최신 렌더 결과 요약).

### 6.3 렌더 진행 상태 추적

**서버리스 렌더링 (즉시 완료):**
- `POST /api/content/render/shorts` 등은 동기적으로 실행, 결과 즉시 반환.
- 상태 추적 불필요 (요청-응답 패턴).

**로컬 스크립트 렌더링 (장시간 작업):**
- 서버리스는 로컬 스크립트 실행을 직접 대기하지 않음. 패턴 3의 핵심.
- 상태 추적 방법:
  1. **파일 기반 완료 플래그:** 로컬 스크립트가 렌더링 완료 후 `content/campaigns/{id}/shorts/output/.completed` 플래그 파일 생성. 서버리스는 이 파일 존재로 완료 여부 확인.
  2. **KV 상태 플래그 (선택):** `kv.set(`render-status:${campaignId}:shorts`, { status: 'running'|'completed'|'failed', startedAt, completedAt })`. 로컬 스크립트가 시작/완료 시 API 호출로 KV 업데이트. 서버리스는 `GET /api/content/render/status`로 조회.
  3. **폴링:** 웹 UI에서 `setInterval`로 `GET /api/content/render/status` 호출. 서버리스는 파일/KV 상태 반환.

**권장:** 파일 기반 완료 플래그를 기본으로. KV 상태 플래그는 웹에서 원격 상태의 빠른 조회가 필요할 때 보조적으로 사용.

---

## 7. v1 → v2 마이그레이션 경로

### 7.1 즉시 수행 (v2 전환의 일부)

1. **신규 디렉토리/파일 생성:** `api/content/`, `scripts/`, `assets/prompts/`, `assets/styles/`, `assets/legal/`, `content/catalog/`, `content/campaigns/`, `skills/renderer/`, `skills/custom/content-core.md`
2. **콘텐츠 코어 스키마 정의:** api/content/core.js에 스키마 + 검증 + 변환 함수 구현
3. **플랫폼 렌더러 1개(쇼츠) 우선 구현:** v1의 template-plan.js + template-video.js 로직을 쇼츠 렌더러로 통합

### 7.2 병행 유지 (전환 완료 시까지)

- `index.html`, `app.js`, `state-manager.js` — v1 UI 무손상 유지
- `template-plan.js`, `rationale-engine.js`, `proposal-pdf.js` 등 — v1 핵심 기능 무손상 유지
- `template-video.js`, `video-ui.js` — 쇼츠 렌더러가 완성되고 대체된 후 정리 (즉시 삭제 금지)
- `api/generate.js`, `api/benchmark.js` — v1 API 무손상 유지

### 7.3 점진적 전환 전략

**Phase 1: 콘텐츠 코어 + 쇼츠 렌더러 MVP**
1. 콘텐츠 코어 스키마 정의 + api/content/core.js 구현
2. 쇼츠 렌더러 구현 (v1 전략 제안서 생성 로직 계승)
3. 웹 UI에 "콘텐츠 코어" 탭 추가 (기존 3탭 + 신규 탭 또는 기존 탭 확장)
4. 쇼츠 렌더 결과 → 로컬 scripts/shorts/로 이어지는 워크플로우 문서화

**Phase 2: 나머지 렌더러 + 주제 브릿지**
1. 카드뉴스/인포그래픽/롱폼 렌더러 순차 구현
2. 주제 브릿지 옵션 C(수동 입력) 구현
3. 법적 고지 + 필터 기본 구현

**Phase 3: 주제 브릿지 옵션 A + 니치 스키마 확장**
1. content/catalog/*.yaml 카탈로그 작성
2. 니치 스키마 2~3개 추가 (여행지, 건강기능식품 등)
3. v1 템플릿/영상 소스 생성기 정리 (대체 완료 시)

---

## 8. 권장 아키텍처 요약

### 8.1 기술 스택

| 영역 | 권장 기술 | 근거 |
|------|-----------|------|
| **콘텐츠 코어 저장 형식** | YAML (파일), 내부 처리 시 JSON | 사람 편집 용이, Git 버전 관리, NICHE_SCHEMA.md와 일관성 |
| **콘텐츠 코어 스키마 버전** | `schemaVersion` 필드 (2.0부터) | v1 appState(암시적 1.0)와의 마이그레이션 관리 |
| **서버리스 프레임워크** | 기존 Vercel Serverless Functions 유지 | v1과 동일한 배포 파이프라인, 학습 비용 없음 |
| **YAML 파싱 (서버리스)** | `js-yaml` 패키지 | 경량, 서버리스 환경 호환 |
| **상태 저장** | 파일 기반(content/campaigns/) + 선택적 Vercel KV | 단순성 + 캠페인 격리 + v1 KV 패턴 계승 가능 |
| **렌더 결과 형식** | JavaScript 객체 (렌더러별 정의, 공통 메타데이터 포함) | 유연성 + 형식 검증 가능 |
| **프롬프트/스타일 관리** | assets/prompts/{shorts,cards,infographic,longform}/ + assets/styles/*.md | 포맷별 분리, v1 skill-loader.js 패턴 계승 |

### 8.2 폴더 구조 (권장 버전)

```
ad-script-studio/
├── api/
│   ├── generate.js          # v1: 유지
│   ├── benchmark.js         # v1: 유지
│   └── content/             # v2 신규
│       ├── core.js          # 콘텐츠 코어 스키마 + 검증 + 저장/조회 + 변환
│       ├── legal.js         # 고지 템플릿 + 포맷별 삽입
│       ├── filter.js        # 과장/금기어 필터
│       ├── prompts.js       # 프롬프트 템플릿 로드
│       ├── niche.js         # 니치 스키마 + depth 소구점
│       ├── renderer-shorts.js
│       ├── renderer-cards.js
│       ├── renderer-infographic.js
│       ├── renderer-longform.js
│       └── topic-bridge.js  # 주제 브릿지 (옵션 C → A)
├── scripts/                 # 로컬 전용 (Vercel 배포 제외)
│   ├── shorts/
│   │   ├── fetch_photos.py
│   │   ├── generate_tts.py
│   │   ├── render_video.py
│   │   └── make_thumbnail.py
│   ├── whisper/
│   │   └── sync_subtitles.py
│   └── content/
│       └── build-core-from-md.py
├── assets/
│   ├── prompts/{shorts,cards,infographic,longform}/
│   ├── styles/
│   │   └── shorts-style.md
│   └── legal/
│       └── disclosures-kr.md
├── content/
│   ├── catalog/*.yaml       # 주제 브릿지 카탈로그 (옵션 A)
│   └── campaigns/{campaignId}/
│       ├── core.yaml
│       ├── shorts/{script.md,images/,audio/,subtitles/,output/}
│       ├── cards/
│       ├── infographic/
│       └── longform/
├── skills/
│   ├── custom/
│   │   ├── shortform-copywriting.md  # v1 유지
│   │   └── content-core.md           # v2 신규
│   └── renderer/
│       ├── shorts-style.md
│       └── legal-disclosure.md
└── (기존 v1 파일들 유지)
```

### 8.3 핵심 설계 결정 요약

| 결정 사항 | 권장안 | 근거 |
|-----------|--------|------|
| 콘텐츠 코어 저장 형식 | YAML | 사람 편집성, Git 친화, 니치 스키마와 일관성 |
| v1 appState와의 관계 | 포함 + 확장, 변환 함수로 마이그레이션 | v1 무손상 유지 + 점진적 전환 |
| 렌더러 출력 형식 | 포맷별 정의 + 공통 메타데이터 | 유연성 + 추적성 |
| 배포 패턴 | 패턴 3 (서버리스 경량 출력 + 로컬 미디어 처리) | Vercel 제약, 비용, 실용성 |
| 동기화 방식 | 파일 기반(content/campaigns/) | 단순성, 캠페인 격리 |
| 주제 브릿지 1단계 | 옵션 C (수동 입력) | 구현 비용 최소화, 빠른 MVP |
| 주제 브릿지 2단계 | 옵션 A (정적 YAML 카탈로그) | 관리 용이성, Git 버전 관리 |
| 법적 고지 | 콘텐츠 코어 `legal` 필드 → 렌더러 포맷별 삽입 → 필터 검증 | 구조적 삽입 + 생성 시점 검증 |
| 필터 결과 처리 | boolean이 아닌 위반 목록 + 심각도 + 제안 | 사용자 피드백 품질 |
| 상태 저장 | 파일 기반 + 선택적 KV | 단순성 + v1 패턴 계승 가능 |

---

## 9. 미해결/추가 조사 필요 사항

### 9.1 이번 연구에서 판단하지 않은 사항

1. **니치 목록 범위:** 이번 마일스톤에 포함할 니치 개수/종류. (대표 2~3개로 시작? 여행지 + 건강기능식품 + 쇼핑몰 등?)
2. **제휴 프로그램 확정:** 쿠팡파트너스? 브랜드커넥스? 둘 다? 프로그램에 따라 고지 문구 달라짐.
3. **롱폼의 성격:** 블로그 포스트(mc 계승) vs 유튜브 롱폼 영상 원고(vox-content 연장)?
4. **콘텐츠 코어 스키마 버전 2.0 세부 필드:** 이번 문서에서 정의한 필드 목록은 초안. 실제 구현 시 조정 가능.
5. **렌더러 출력 형식의 구체적 필드 정의:** 각 렌더러의 출력 스키마는 구현 시점에 상세 정의 필요.

### 9.2 후속 연구 플래그

| Phase | 추가 조사 필요 내용 |
|-------|---------------------|
| 콘텐츠 코어 구현 | v1 appState → v2 코어 변환 함수의 구체적 매핑 로직, 스키마 버전 마이그레이션 전략 |
| 쇼츠 렌더러 구현 | v1 template-plan.js + template-video.js → 쇼츠 렌더러 통합 세부, vox-content 9단계 파이프라인 중 서버리스에서 처리 가능한 범위 |
| 로컬 스크립트 연동 | scripts/shorts/*.py의 실제 구현(단위 테스트, 에러 처리, Vercel 서버리스와 인터페이스), macOS/Linux/Windows 호환성 |
| 법적 필터 구현 | 금기어/과장 패턴 목록의 실제 범위, 패턴 매칭과 AI 판단의 경계, 과잉/과소 차단 튜닝 방법 |
| 니치 스키마 마이그레이션 | mc 기존 니치 YAML → NICHE_SCHEMA.md 형식 변환 방법, 포함 범위 |

---

## 10. 출처

- **v1 아키텍처:** TECHNICAL_DOC.md (§2 아키텍처 & 기술 스택, §4 핵심 모듈 상세, §6 데이터 플로우)
- **v1 상태 관리:** state-manager.js (appState, tabState, fieldSourceMap, transferToVideoGenerator 패턴)
- **v1 API:** api/generate.js (Provider Chain, 타임아웃 로직, parseApiResponse), api/benchmark.js (KV 스테이지 머신, 파이프라인 패턴)
- **v2 설계 초안:** .planning/ARCHITECTURE.md, .planning/FOLDER_STRUCTURE.md
- **법적 고지 설계:** .planning/LEGAL_COMPLIANCE.md
- **니치 스키마:** .planning/NICHE_SCHEMA.md
- **마케팅 원칙:** skills/custom/shortform-copywriting.md (26개 원칙, v1 → v2 계승)
- **v1 스킬 시스템:** skill-loader.js, skills/marketing/ (v1 → v2 계승 패턴)

---

*본 문서는 GSD Phase 6 연구 산출물이며, v2 아키텍처 설계 결정을 문서화합니다. 실제 구현 시 세부 사항은 조정 가능합니다.*
