# Project Research: Features — v2 원소스 멀티유즈 콘텐츠 시스템

> 상태: 조사 완료
> 대상: AD SCRIPT STUDIO v2
> 작성일: 2026-08-09
> v1 코드 베이스 분석 기준: template-plan.js, template-video.js, rationale-engine.js, state-manager.js, app.js

## 요약

AD SCRIPT STUDIO v2는 v1의 콘텐츠 코어(10개 입력 필드 + 26개 마케팅 원칙 기반 당위성 엔진)를 확장하여 **4개 포맷 출력**을 생성하는 원소스 멀티유즈 시스템이다. v1의 `template-plan.js`(60초 숏폼 대본 템플릿), `template-video.js`(씬 파싱 + EN 이미지 프롬프트 생성), `rationale-engine.js`(26개 원칙 기반 근거 생성)를 각 포맷 렌더러의 기반 로직으로 계승한다.

**4개 포맷 렌더러의 핵심 역할:**
- **쇼츠**: 콘텐츠 코어 → 대본 생성 → 씬 파싱 → EN 이미지 프롬프트 → Pexels/Pixabay 실사 이미지 fetch → AI 이미지 생성(Pollinations.ai/Gemini) → edge-tts TTS → Whisper 자막 → moviepy 렌더링 → 썸네일
- **카드뉴스**: 5~10장 슬라이드, 슬라이드별 한국어 카피 + 시각 지시 + EN 이미지 프롬프트 + 마지막 슬라이드 제휴 고지
- **인포그래픽**: 가격·경쟁사·리뷰 통계 기반 데이터 정리 + 시각 구성 지시 (실제 렌더링은 아님)
- **롱폼**: mc 깊이 단계 모델(기초/응용/고급) + 니치 스키마 적용, 1500~3000자 분량, 블로그 포스트 형태

**주제 브릿지**: mc 블로그 체인의 chain_posts DB 스키마(seed, depth, step, title, target_keyword, key_points, angle, chain_type)를 참조하여 동일 주제 콘텐츠 코어를 자동 적재.

---

## 1. 쇼츠 렌더러

### 입력 (콘텐츠 코어 필드 매핑)

| 코어 필드 | 사용 방식 | v1 계승 포인트 |
|-----------|-----------|----------------|
| `brandName` | 대본 placeholder 대체, 브랜드 언급 | template-plan.js `replacePlaceholders()` |
| `productName` | 대본 placeholder 대체, 제품 언급 | template-plan.js |
| `concept` | 핵심 메시지, keyBenefit 대체 | template-plan.js (기존 keyBenefit→concept 매핑) |
| `target` | 타겟층 언급, 훅 장면의 주체 | template-plan.js, rationale-engine.js TYPE_HOOK |
| `toneAndManner` | 장면 톤/연출 스타일 결정 | 신규 적용 |
| `competitorInfo` | 비교/대조 장면 구성 시 활용 | rationale-engine.js TYPE_PSYCH 3-3, 3-8 |
| `priceRange` | CTA 장면 가격 언급, 긴급성 프레이밍 | rationale-engine.js TYPE_CTA |
| `reviewExcerpts[]` | painPoint 추출, 사회적 증거 장면 | template-plan.js (reviewExcerpts→painPoint 매핑) |
| `trustFactors[]` | 신뢰 요소 장면, proof 장면 | template-plan.js, rationale-engine.js |
| `excludedKeywords[]` | 생성 시 필터링 | v1 상태 보유, 실제 필터 로직은 신규 필요 |
| **추가 필드 (v2 신규)** | | |
| `rationale[]` | 당위성 근거 → 장면별 소구점 매핑 | rationale-engine.js `generateRationaleManually()` 결과 |
| `depth` | 깊이 단계 (basic/applied/advanced) — 쇼츠에는 기본 적용 | NICHE_SCHEMA.md 계승 |
| `niche` | 니치 태그 — 톤/금기어 필터 적용 | NICHE_SCHEMA.md |

### 처리 단계 (vox-content 파이프라인 계승)

```
1. 콘텐츠 코어 → 쇼츠 대본 생성 (v1 template-plan.js 확장)
   - 7장면 템플릿 (hook→problem→solution→benefit→proof→cta→closing)
   - 15초/30초/60초 축약 규칙 계승 (abbreviateScript)
   - v2 추가: rationale[] 기반 장면별 소구점 매핑

2. 씬 파싱 + EN 이미지 프롬프트 생성 (v1 template-video.js 계승)
   - parseScriptToScenes(): 대본 → 씬 배열
   - generateImagePrompt(): 씬별 EN 이미지 프롬프트 (최소/보통/상세 레벨)
   - generateMotionPrompt(): 씬별 모션 프롬프트
   - v2 추가: 프롬프트 품질 개선 (시각 요소 추출 로직 고도화)

3. Pexels/Pixabay 실사 이미지 fetch
   - 키워드 추출: 씬 description + dialogue에서 키워드 추출
   - API 검색: Pixabay API (q, image_type=photo, orientation=horizontal, per_page=5)
   - 다운로드: webformatURL (640px) 또는 largeImageURL (1280px) → 로컬 저장
   - 참고: Pexels API도 유사하나 Pixabay가 한국어 검색 지원 (lang=ko)
   - 라이선스: Pixabay Content License (상업적 사용 가능, 출처 표시 권장)

4. AI 이미지 생성 (선택: 실사 이미지 부재 시 또는 스타일화된 이미지 필요 시)
   - 옵션 A: Pollinations.ai (무료, URL 기반: https://image.pollinations.ai/prompt/{prompt}?width=1024&height=1024&model=flux)
   - 옵션 B: Gemini API / 나노바나나 (유료, 고품질)
   - 옵션 C: Cloudflare Workers AI (img2img, 텍스트→이미지 모델 검토 필요)
   - v2 MVP: Pollinations.ai 우선 (무료, 별도 API 키 불필요)
   - 프롬프트: template-video.js generateImagePrompt() 출력 + 스타일 접미사 (--ar 9:16)

5. TTS 생성 (edge-tts)
   - 패키지: edge-tts (npm v1.0.1)
   - 한국어 목소리: ko-KR-SunHiNeural (여성), ko-KR-InJoonNeural (남성)
   - 씬별 dialogue → 개별 MP3 파일 생성
   - v2 고려: Cloudflare Workers AI TTS도 검토 가능 (텍스트→음성 모델 존재 시)

6. Whisper 자막 동기화
   - 패키지: openai-whisper (pip v20250625) 또는 faster-whisper
   - TTS MP3 → 한국어 자막(.srt) 생성
   - 자막 동기화: 씬별 시간 정보(time 필드)와 매칭
   - v2 MVP: 로컬 Whisper 실행 (GPU 없어도 CPU 모드 가능하나 속도 느림)

7. moviepy 렌더링
   - 패키지: moviepy (pip v2.2.1)
   - 설정:
     - 해상도: 1920x1080 (세로형 쇼츠면 1080x1920)
     - 프레임레이트: 12fps (v1 명세 기준)
     - Ken Burns 효과: 느린 줌/팬
     - PIP 실사 인서트: Pexels 이미지 오버레이
     - 2줄 자막: Whisper 자막 기반
     - 크로스디졸브 전환: 장면 간 0.5초
   - 출력: MP4 (H.264)

8. 썸네일 생성
   - 첫 장면 이미지 + 브랜드명 텍스트 오버레이
   - Pillow(PIL)로 텍스트 합성
   - 출력: JPG (1280x720 또는 1080x1920)
```

### 출력물
- `content/campaigns/{campaignId}/shorts/{sceneId}/`
  - `{sceneId}.mp3` (TTS 오디오)
  - `{sceneId}.srt` (자막)
  - `{sceneId}.jpg` (AI/실사 이미지)
  - `final.mp4` (렌더링 결과)
  - `thumbnail.jpg` (썸네일)

### vox-content 파이프라인 계승 포인트
- template-video.js의 `parseScriptToScenes()`, `generateImagePrompt()`, `generateMotionPrompt()` 재사용
- v1의 7장면 템플릿 구조 + 15/30/60초 축약 로직 계승
- state-manager.js의 campaign 단위 저장 패턴 확장

---

## 2. 카드뉴스 렌더러

### 입력 (콘텐츠 코어 필드 매핑)

| 코어 필드 | 사용 방식 |
|-----------|-----------|
| `brandName`, `productName` | 슬라이드별 브랜드/제품 언급 |
| `concept` | 핵심 메시지, 헤드라인 카피 소스 |
| `target` | 타겟 맞춤 어조/어휘 선택 |
| `toneAndManner` | 시각 스타일 + 카피 톤 결정 |
| `competitorInfo` | 비교 슬라이드 구성 |
| `priceRange` | 가격 제시 슬라이드 |
| `reviewExcerpts[]` | 사회적 증거 슬라이드 (고객 후기 인용) |
| `trustFactors[]` | 신뢰 요소 슬라이드 |
| `rationale[]` | 소구점별 슬라이드 매핑 (26개 원칙 중 카드뉴스에 적합한 원칙 선별) |
| `depth`, `niche` | 깊이 단계/니치별 소구점 조정 |

### 슬라이드 구성 (권장: 5~8장)

| 슬라이드 | 유형 | 구성 요소 | v1 원칙 매핑 |
|----------|------|-----------|--------------|
| 1 | 커버 | 헤드라인 카피 + 시각 지시 + EN 이미지 프롬프트 | TYPE_HOOK (1-1~1-9) 중 1개 |
| 2 | 문제 제기 | 타겟의 pain point + 시각 지시 | TYPE_PSYCH 3-1, 3-4, 3-5 |
| 3~5 | 솔루션/혜택 | 제품별 혜택 + 시각 지시 + EN 이미지 프롬프트 | TYPE_HOOK solution, TYPE_PSYCH 3-2, 3-6 |
| 6 | 증거/신뢰 | 리뷰 인용/신뢰 요소 + 시각 지시 | TYPE_PSYCH 3-7, TYPE_CTA 2-5 |
| 7 | 비교 (선택) | 경쟁사 대비 차별점 + 시각 지시 | TYPE_PSYCH 3-3, 3-8 |
| 8 | CTA | 행동 유도 + 가격 + 제휴 고지 | TYPE_CTA 2-1~2-7 |
| 마지막 | 제휴 고지 | 필수: "본 콘텐츠는 제휴 마케팅의 일환으로..." | 법적 컴플라이언스 |

### 슬라이드별 구성 요소

각 슬라이드는 다음 3개 필드를 출력:
1. **한국어 카피**: 헤드라인 + 본문 (템플릿 기반 또는 AI 생성)
2. **시각 지시**: 색상, 구도, 스타일, 텍스트 위치 등 (이미지 생성/디자인 도구용)
3. **EN 이미지 프롬프트**: Pollinations.ai / Gemini용 영어 프롬프트 (template-video.js `generateImagePrompt()` 계승 + 카드뉴스 특성상 텍스트 오버레이 고려)

### 마지막 슬라이드 제휴 고지 처리
- LEGAL_COMPLIANCE.md 기준: 슬라이드 내 하단 작은 텍스트 또는 별도 슬라이드로 배치
- 문구 예: "본 콘텐츠는 제휴 마케팅의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다."

### v2 MVP 범위
- 6장 고정 구조 (커버→문제→솔루션→혜택→증거→CTA+고지)
- 템플릿 기반 카피 생성 (v1 template-plan.js 패턴 확장)
- EN 이미지 프롬프트는 template-video.js `generateImagePrompt()` 재사용
- 실제 이미지 생성/레이아웃 렌더링은 이후 확장 (MVP에서는 프롬프트+지시 출력까지)

---

## 3. 인포그래픽 렌더러

### 입력 (콘텐츠 코어 필드 매핑)

| 코어 필드 | 사용 방식 |
|-----------|-----------|
| `brandName`, `productName` | 인포그래픽 제목, 브랜드 언급 |
| `concept` | 핵심 메시지/테마 |
| `priceRange` | 가격 비교 데이터, 가격 근거 |
| `competitorInfo` | 경쟁사 대비 비교 데이터 |
| `reviewExcerpts[]` | 리뷰 통계 (긍정 비율, 반복 언급 키워드) |
| `trustFactors[]` | 인증/수상 시각 요소 |
| `rationale[]` | 데이터 기반 주장 선별 (수치/비교 관련 원칙) |

### 출력물 형태
- **실제 그래픽 렌더링은 아님** — 텍스트 데이터 + 시각 구성 지시 출력
- 출력 예:
  ```
  {
    title: "제품명 vs 경쟁사 가격 비교",
    dataPoints: [
      { label: " 제품명", value: "39,000원", highlight: true },
      { label: "경쟁사 A", value: "59,000원", highlight: false },
      { label: "경쟁사 B", value: "45,000원", highlight: false },
    ],
    chartType: "bar",  // bar, line, pie, comparison_table
    visualDirection: {
      colorScheme: "브랜드 컬러 기반",
      layout: "좌우 비교 또는 세로 막대",
      annotation: "가격 차이 % 강조"
    },
    claimsVerification: [
      { claim: "경쟁사 대비 34% 저렴", status: "verify",근거: "priceRange vs competitorInfo" }
    ]
  }
  ```

### 수치·비교 주장 과장 검증 연계
- 콘텐츠 코어의 priceRange, competitorInfo에 기반한 주장만 허용
- 근거 없는 수치 주장(예: "1위", "90% 만족")은 과장으로 플래그
- rationale-engine.js의 그라운딩 규칙(필수 입력값 없으면 원칙 제외)을 인포그래픽 주장 검증에 확장 적용

### v2 MVP 범위
- 가격 비교 + 리뷰 통계 요약 출력 (텍스트 데이터 형태)
- chartType 추천 + 시각 구성 지시
- 실제 차트 렌더링(Pillow, Chart.js 등)은 이후 확장

---

## 4. 롱폼 렌더러

### 입력 (콘텐츠 코어 필드 매핑)

| 코어 필드 | 사용 방식 |
|-----------|-----------|
| `brandName`, `productName` | 제목, 소제목, 본문 언급 |
| `concept` | 핵심 메시지, 글 전체를 관통하는 테마 |
| `target` | 독자 페르소나, 어조/어휘 수준 결정 |
| `toneAndManner` | 글의 감성/스타일 |
| `competitorInfo` | 비교/차별화 섹션 |
| `priceRange` | 구매 고려 섹션, 가격 정당성 |
| `reviewExcerpts[]` | 사회적 증거, 실제 고객 목소리 인용 |
| `trustFactors[]` | 신뢰 구축 섹션 (인증, 수상, 판매량 등) |
| `rationale[]` | 당위성 근거 → 글의 논리적 구조 기반 |
| `depth` | **핵심**: 깊이 단계에 따른 글 구조/깊이 결정 |
| `niche` | 니치 스키마 적용 (톤/금기어/소구점) |

### mc 깊이 단계 모델 적용

mc의 chain_type 중 **depth 방향**을 계승:

| 깊이 단계 | mc step 역할 | 롱폼 소구점 | 권장 분량 |
|-----------|-------------|-------------|-----------|
| **basic (기초)** | step 1: 기초/정보형 | 인지 단계 — 문제 인식, 기본 정보 전달 | 1000~1500자 |
| **applied (응용)** | step 2: 분석/응용형 | 고려 단계 — 비교, 장단점, 사용 시나리오 | 1500~2500자 |
| **advanced (고급)** | step 3: 전문/심화형 | 결정/구매 단계 — 심층 분석, 신뢰 구축, CTA | 2000~3000자 |

### 니치 스키마 적용
- NICHE_SCHEMA.md 정의: 톤/금기어/신뢰표현/깊이단계별 소구점/포맷별 노트
- 예: 건강기능식품 니치 → 과장 표현 필터 강화, 식약처 표현 규칙 적용
- 예: 여행지 니치 → 감성 톤, 경험 중심 서술

### 출력 형태: 블로그 포스트 vs 유튜브 롱폼 원고
- **v2 MVP: 블로그 포스트에 가까움** (텍스트 콘텐츠, SEO 고려 구조)
- 구조: 제목(H1) → 리드 문단 → 소제목(H2/H3) → 본문 → 요약/CTA → 제휴 고지
- 추후 확장: 유튜브 롱폼 영상 원고로 변환 (말투 변환, 시각 컷 지시 추가)

### 제휴 고지 삽입 위치
- 글 하단 또는 CTA 섹션 직전
- LEGAL_COMPLIANCE.md 기준 문구 준수

### v2 MVP 범위
- depth=basic (기초/정보형) 1개 단계만 생성
- 템플릿 기반 구조 (mc chain_drafter.py의 draft 구조 참조)
- 니치 스키마 중 1~2개 니치(여행지, 건강기능식품) 우선 적용

---

## 5. 주제 브릿지

### mc 블로그 체인 주제 파일 형식

mc의 chain_posts DB 스키마 (chain_db.py 기준):

| 필드 | 타입 | 설명 | v2 활용도 |
|------|------|------|-----------|
| `chain_id` | INTEGER | 체인 고유 ID | 주제 그룹 식별 |
| `seed` | TEXT | 원본 시드 키워드 | 주제브릿지 검색/선택 키워드 |
| `depth` | INTEGER (0,1,2) | 깊이 단계 | 롱폼 depth 매핑 |
| `step` | INTEGER | 발행 단계 | 발행 순서 참조 |
| `chain_type` | TEXT (depth/lateral/swallow) | 체인 방향 | 주제 브릿지 유형 |
| `title` | TEXT | 포스트 제목 | 콘텐츠 코어 concept/제목 후보 |
| `target_keyword` | TEXT | 타겟 키워드 | SEO/검색 의도 참조 |
| `key_points` | TEXT (JSON 배열) | 핵심 포인트 | 콘텐츠 코어 concept 보조 |
| `angle` | TEXT | 각도/관점 | 톤/접근법 결정 |
| `category_guess` | TEXT | 카테고리 추정 | 니치 태그 매핑 |
| `bridge_logic` | TEXT | 브릿지 논리 | 주제 연결 설명 |
| `image_prompt` | TEXT | 이미지 프롬프트 | 쇼츠/카드뉴스 이미지 프롬프트 참조 |
| `draft_md` | TEXT | 초안 마크다운 | 롱폼 내용 참조 (선택) |
| `published_url` | TEXT | 발행 URL | 참조 링크 |

### 주제 선택 인터페이스

**v2 MVP: 리스트 선택 방식**
1. mc 체인 DB에서 발행된 체인 목록 조회 (chain_id, seed, depth, title, published_url)
2. 사용자가 체인 선택 → 해당 체인의 chain_posts 목록 표시 (step별 title + angle)
3. 사용자가 특정 step 선택 또는 전체 depth 체인 선택

**이후 확장: 검색/필터**
- seed 키워드 검색
- chain_type 필터 (depth/lateral/swallow)
- 카테고리 필터 (category_guess)

### 선택된 주제 → 콘텐츠 코어 자동 적재 범위

| 콘텐츠 코어 필드 | 자동 적재 내용 | 출처 |
|-----------------|---------------|------|
| `concept` (일부) | chain_posts.title + angle → 컨셉 후보 | chain_posts |
| `target` (보조) | category_guess → 니치/타겟 추정 | chain_posts |
| `depth` | chain_type=depth인 경우 depth 단계 | chain_posts.depth |
| `niche` | category_guess → 니치 태그 | chain_posts |
| `reviewExcerpts` (미적재) | — | 수동 입력 또는 별도 자동 조사 |
| `priceRange` (미적재) | — | 수동 입력 또는 별도 자동 조사 |
| `competitorInfo` (미적재) | — | 수동 입력 또는 별도 자동 조사 |

**중요**: 주제 브릿지는 콘텐츠 코어의 **메시지방향성(concept/depth/niche)만 보조**하고, 제품-specific 필드(price, competitor, reviews)는 수동으로 입력하거나 별도 자동 조사로 채워야 함.

---

## 6. 공통 기능

### 콘텐츠 코어 저장/불러오기

| 방식 | 설명 | 권장 시점 |
|------|------|-----------|
| **파일 기반 (MVP)** | `content/campaigns/{campaignId}/core.json` | v2 MVP — 단순, 버전 관리 용이 |
| **Cloudflare KV (이후)** | 키-밸류 저장, 빠른 조회 | 캠페인 많고 빠른 로드 필요 시 |
| **SQLite (이후)** | 관계형 쿼리 필요 시 (주제 브릿지 등) | complex query 필요 시 |

**파일 기반 스키마 (core.json):**
```json
{
  "campaignId": "uuid-or-slug",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "product": {
    "name": "...",
    "brand": "...",
    "category": "...",
    "price": "...",
    "competitor": "...",
    "trustFactors": ["...", "..."]
  },
  "target": {
    "description": "...",
    "painPoints": ["...", "..."]
  },
  "purpose": {
    "stage": "awareness|consideration|decision",
    "callToAction": "..."
  },
  "message": {
    "concept": "...",
    "tone": "..."
  },
  "rationale": [...],  // rationale-engine.js 출력
  "evidence": {
    "reviews": ["...", "..."],
    "viralScripts": [],
    "researchSummary": "..."
  },
  "legal": {
    "affiliateType": "cpabest|linkprice|etc",
    "disclosureText": "...",
    "restrictedClaims": ["...", "..."]
  },
  "depth": "basic|applied|advanced",
  "niche": "travel|health_functional_food|etc"
}
```

### 캠페인 단위 격리
- 디렉토리 구조: `content/campaigns/{campaignId}/`
  - `core.json` — 콘텐츠 코어
  - `shorts/` — 쇼츠 렌더 결과
  - `cards/` — 카드뉴스 렌더 결과
  - `infographic/` — 인포그래픽 데이터
  - `longform/` — 롱폼 원고

### 렌더 결과물 카피/다운로드/공유
- **카피**: 텍스트 결과(롱폼 원고, 카드뉴스 카피, 인포그래픽 데이터)를 클립보드로 복사
- **다운로드**: MP4(쇼츠), TXT/Markdown(롱폼, 카드뉴스 카피), JSON(인포그래픽 데이터)
- **공유**: 추후 클라우드 저장 링크 생성 (Cloudflare R2 + Pages 연동)

### 법적 고지 + 과장 필터 적용 지점

| 포맷 | 제휴 고지 위치 | 과장 필터 시점 | 과장 필터 항목 |
|------|---------------|---------------|---------------|
| 쇼츠 | 마지막 장면(Closing) 또는 별도 고지 슬라이드 | 대본 생성 후, 렌더링 전 | 절대적 표현(최고, 1위), 수치 과장, 보장 표현 |
| 카드뉴스 | 마지막 슬라이드 | 카피 생성 후 | 동일 + 이미지 내 텍스트 과장 |
| 인포그래픽 | 데이터 하단 각주 | 데이터 정리 후 | 근거 없는 수치 비교, 출처 없는 통계 |
| 롱폼 | 글 하단 또는 CTA 직전 | 초안 생성 후 | 동일 + 의학적/법적 주장 (니치별 추가) |

**과장 필터 구현 접근:**
- 키워드 기반 필터 (excludedKeywords 확장 + 포맷별 금지 표현 리스트)
- 근거 검증: 콘텐츠 코어의 실제 입력 필드에 기반하지 않은 주장은 플래그
- rationale-engine.js의 그라운딩 규칙을 확장 적용

---

## 권장 기능 범위 (MVP vs 이후)

| 기능 | MVP 포함? | 근거 |
|------|-----------|------|
| **쇼츠 대본 생성** (template-plan.js 확장) | ✅ 포함 | v1 로직 재사용, 즉시 가치 |
| **쇼츠 씬 파싱 + EN 이미지 프롬프트** (template-video.js 계승) | ✅ 포함 | v1 로직 재사용 |
| **Pexels/Pixabay 이미지 fetch** | ✅ 포함 | 무료 API, 낮은 구현 복잡도 |
| **AI 이미지 생성 (Pollinations.ai)** | ✅ 포함 | 무료, API 키 불필요, MVP에 충분 |
| **edge-tts TTS** | ✅ 포함 | 무료, 한국어 목소리 지원, npm 패키지 |
| **Whisper 자막 생성** | ⚠️ 선택 포함 | CPU 모드 속도 이슈 — GPU 환경 또는 이후 확장 고려 |
| **moviepy 렌더링** | ⚠️ 선택 포함 | 로컬 렌더링 환경 필요, 클라우드 렌더링은 이후 |
| **썸네일 생성** | ❌ 이후 | PIL 기반 단순 합성 — MVP 생략 가능 |
| **카드뉴스 카피 + 시각 지시 + EN 프롬프트 출력** | ✅ 포함 | 템플릿 기반, 즉시 가치 |
| **카드뉴스 실제 이미지 레이아웃 렌더링** | ❌ 이후 | 디자인 도구 연동 또는 프론트 렌더링 필요 |
| **인포그래픽 데이터 출력 + 시각 구성 지시** | ✅ 포함 | 텍스트 기반, 즉시 가치 |
| **인포그래픽 실제 차트 렌더링** | ❌ 이후 | Pillow/Chart.js 연동 필요 |
| **롱폼 기본(1개 depth 단계) 생성** | ✅ 포함 | mc depth 모델 계승, 템플릿 기반 |
| **롱폼 3단계 전체 + 니치 스키마 전체** | ❌ 이후 | 니치 스키마 정의 선행 필요 |
| **주제 브릿지: mc 체인 목록 조회 + 선택 → concept/depth/niche 적재** | ✅ 포함 | mc chain_db.py 스키마 활용, 구현 복잡도 낮음 |
| **주제 브릿지: 검색/필터/전체 체인 자동 적재** | ❌ 이후 | MVP 이후 UX 개선 |
| **콘텐츠 코어 파일 저장/불러오기** | ✅ 포함 | campaignId 기반 파일 I/O, 단순 |
| **Cloudflare KV 저장** | ❌ 이후 | MVP 이후 확장성 고려 |
| **렌더 결과물 카피/다운로드** | ✅ 포함 | 클립보드 API + 파일 다운로드 |
| **법적 고지 자동 삽입** | ✅ 포함 | 포맷별 고지 위치/문구 적용 |
| **과장 필터 (기본 키워드 필터)** | ✅ 포함 | excludedKeywords 확장 + 금지 표현 리스트 |
| **과장 필터 (근거 검증 + 플래그)** | ⚠️ 부분 포함 | rationale-engine.js 그라운딩 규칙 확장 |

---

## 기술적 결정 사항

### 이미지 소스 우선순위
1. **Pixabay API** (lang=ko 지원, 100 req/min, 다운로드 권장) — v1의 자동 조사와 유사한 패턴
2. **Pollinations.ai** (무료, Flux 모델, URL 기반 생성)
3. **Gemini / 나노바나나** (고품질 필요 시, 유료)

### TTS 선택지
- **edge-tts** (npm, 무료, 한국어 목소리 2종, 로컬 실행)
- Cloudflare Workers AI TTS (Workers 환경일 경우, 모델 존재 여부 확인 필요)

### 자막 생성
- **openai-whisper** (pip, 한국어 지원, 로컬 CPU 실행 가능 — 속도 느림)
- GPU 환경 또는 클라우드 실행이 가능하면 품질/속도 개선

### 렌더러 실행 환경
- **로컬 Node.js + Python 하이브리드**: TTS(whisper, moviepy)는 Python, 대본/프롬프트 생성은 Node.js
- **추후 Cloudflare Workers + Workers AI로 통합 가능성**: TTS/이미지/월 rendering은 Workers AI 한계 확인 필요

---

## 출처

- **v1 코드**: template-plan.js, template-video.js, rationale-engine.js, state-manager.js, app.js (로컬 분석)
- **mc 체인 모델**: chain_models.py, chain_db.py, chain_deriver.py, config/chain_config.yaml (로컬 분석)
- **Pixabay API**: https://pixabay.com/api/docs/ (2026-08-09 접속, 한국어 검색 lang=ko 지원 확인)
- **edge-tts**: npm v1.0.1 (npm view 확인)
- **moviepy**: pip v2.2.1 (pip show 확인)
- **openai-whisper**: pip v20250625 (pip show 확인)
- **Pollinations.ai**: https://pollinations.ai (URL 기반 이미지 생성, Flux 모델)
- **Cloudflare Workers AI**: https://developers.cloudflare.com/workers-ai/ (2026-08-09 접속, 모델 카탈로그 확인 필요)
