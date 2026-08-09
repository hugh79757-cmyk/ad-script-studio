# Research Summary: AD SCRIPT STUDIO v2 원소스 멀티유즈 콘텐츠 시스템

**도메인:** 마케팅 콘텐츠 생성 도구 (바닐라 JS + Python 하이브리드)
**조사일:** 2026-08-09
**전체 신뢰도:** HIGH (v1 코드베이스 직접 분석 + 주요 외부 서비스 확인)

> **참고:** 사용자가 언급한 ARCHITECTURE.md, NICHE_SCHEMA.md, LEGAL_COMPLIANCE.md는 아직 파일로 존재하지 않음. 설계 의도는 연구 질문에 기술되어 있어 FEATURES.md 작성 시 해당 의도를 반영함.

## 실행 요약

AD SCRIPT STUDIO v2는 v1의 콘텐츠 코어(10개 입력 필드 + 26개 마케팅 원칙 기반 당위성 엔진)를 확장하여 **4개 포맷(쇼츠, 카드뉴스, 인포그래픽, 롱폼)**을 생성하는 원소스 멀티유즈 시스템이다. 핵심 특징은:

1. **v1 코드 재사용률이 높음**: template-plan.js(7장면 대본 템플릿 + 축약 로직), template-video.js(씬 파싱 + EN 이미지 프롬프트), rationale-engine.js(26개 원칙 + 그라운딩 규칙)를 각 포맷 렌더러의 기반 로직으로 직접 계승 가능.

2. **vox-content 파이프라인은 5단계로 분해 가능**: 대본 생성 → 씬 파싱/프롬프트 → 이미지(Pexels/Pixabay + Pollinations.ai) → TTS(edge-tts) → 자막/렌더링(Whisper + moviepy). 각 단계가 콘텐츠 코어의 특정 필드를 입력으로 받음.

3. **주제 브릿지는 mc 체인 DB 스키마를 직접 활용 가능**: chain_posts의 seed, depth, step, title, angle, category_guess 필드를 콘텐츠 코어의 concept/depth/niche 필드에 매핑. 단, 제품-specific 필드(price, competitor, reviews)는 별도 입력 필요.

4. **MVP 범위 설정이 중요**: TTS/자막/렌더링 파이프라인 전체가 로컬 실행을 요구하므로, 인프라 dependency가 높음. MVP에서는 "대본+프롬프트+이미지 검색까지 출력"을 1차 목표로 하고, 실제 렌더링은 환경 구성 후 추가하는 접근이 현실적.

## 주요 발견

### 스택
- **프론트/로직**: v1과 동일한 바닐라 JS (Node.js 호환), state-manager.js 패턴 확장
- **이미지 검색**: Pixabay API (lang=ko, 100 req/min, 무료) — Pexels보다 한국어 검색 지원이 장점
- **AI 이미지**: Pollinations.ai (무료, Flux 모델, URL 기반, API 키 불필요) — MVP에 적합
- **TTS**: edge-tts (npm v1.0.1, ko-KR-SunHiNeural/InJoonNeural, 무료)
- **자막**: openai-whisper (pip v20250625, 한국어 지원, 로컬 CPU 실행 가능하나 느림)
- **렌더링**: moviepy (pip v2.2.1, 12fps/1920x1080/Ken Burns/PIP/크로스디졸브 설정 가능)
- **저장**: 파일 기반 (content/campaigns/{campaignId}/core.json) — MVP, 이후 KV/SQLite

### 아키텍처
- **콘텐츠 코어 centric**: 모든 포맷 렌더러가 단일 core.json을 입력으로 받음
- **포맷별 렌더러 분리**: shorts/, cards/, infographic/, longform/ 디렉토리로 결과물 격리
- **v1 계승 포인트**: template-plan.js, template-video.js, rationale-engine.js를 모듈로 재사용
- **Python/Node 하이브리드**: TTS/자막/렌더링은 Python, 대본/프롬프트/상태관리는 Node.js

### 기능 범위
- **MVP 포함 (17개)**: 쇼츠 대본/씬/이미지/TTS, 카드뉴스 카피+지시, 인포그래픽 데이터, 롱폼 basic 단계, 주제 브릿지 기본, 파일 저장, 카피/다운로드, 법적 고지, 기본 과장 필터
- **MVP 이후 (10개)**: 실제 영상 렌더링, 카드뉴스 레이아웃 렌더링, 인포그래픽 차트 렌더링, 롱폼 전체 depth+니치, 주제 브릿지 검색/필터, KV 저장, 고급 과장 필터

### 핵심 피트폴
1. **렌더링 파이프라인의 로컬 의존성**: Whisper CPU 모드 속도, moviepy 렌더링 시간 — 클라우드 렌더링 또는 GPU 환경 필요 가능성
2. **주제 브릿지의 불완전한 코어 적재**: mc 체인은 제품-specific 필드(price, competitor, reviews)를 제공하지 않음 → 수동 입력 필요 명시 필수
3. **과장 필터의 한계**: 키워드 기반 필터는 우회 가능 → 근거 검증(콘텐츠 코어 필드 기반 주장만 허용)을 병행해야 함

## 로드맵 시사점

### 제안 Phase 구조

1. **Phase 1: 콘텐츠 코어 확장 + 파일 저장** — core.json 스키마 정의, campaignId 기반 저장/불러오기, 기존 10개 필드 + rationale/depth/niche 추가
2. **Phase 2: 쇼츠 렌더러 (대본~이미지까지)** — template-plan.js/template-video.js 확장, Pixabay fetch, Pollinations.ai 생성, edge-tts TTS까지. 렌더링은 "준비 완료" 상태로 출력
3. **Phase 3: 카드뉴스 + 인포그래픽 렌더러** — 템플릿 기반 카피/지시 생성, 인포그래픽 데이터 출력
4. **Phase 4: 롱폼 렌더러 + 주제 브릿지** — mc depth 모델 적용, mc 체인 DB 조회→선택→코어 적재
5. **Phase 5: 렌더링 파이프라인 완성** — Whisper 자막, moviepy 렌더링, 썸네일 생성 (환경 구성 포함)
6. **Phase 6: 법적 컴플라이언스 + 과장 필터 강화** — 포맷별 고지 위치, 근거 검증 기반 과장 플래그

### Phase ordering rationale
- Phase 1→2→3→4 순서는 콘텐츠 코어 → 개별 포맷 렌더러 → 통합 주제 브릿지의 의존성과 일치
- 렌더링 파이프라인(Phase 5)을 분리한 이유: 로컬 환경 의존성(GPU, Python 패키지)으로 인해 선행 포맷 렌더러와 독립적으로 진행 가능
- 법적 컴플라이언스는 출력물이 생기는 Phase 2부터 부분 적용, Phase 6에서 완결

### 연구 플래그
- **Phase 5**: GPU 환경 확보 여부, Cloudflare Workers AI에서 TTS/렌더링 가능 여부 확인 필요 (LOW 신뢰도 — Workers AI 모델 카탈로그 미확인)
- **Phase 4**: mc 체인 DB 경로(/Users/twinssn/Projects/5000/data/mc_chains.db) 접근 권한 및 스키마 버전 확인 필요
- **Phase 6**: 니치 스키마 전체 정의(LEGAL_COMPLIANCE.md, NICHE_SCHEMA.md)가 선행되어야 함 — 현재 미작성

## 신뢰도 평가

| 영역 | 수준 | 사유 |
|------|------|------|
| 스택 | HIGH | v1 코드 + npm/pip 버전 직접 확인 + Pixabay/Pollinations 문서 확인 |
| 기능 범위 | HIGH | v1 코드 분석 기반 + vox-content 파이프라인 단계 분해 명확 |
| 아키텍처 | MEDIUM | core.json 스키마는 설계 초안 기반, 실제 구현은 검증 필요 |
| 피트폴 | MEDIUM-HIGH | v1의 텍스트 기반 출력 패턴을 영상/이미지 파이프라인으로 확장할 때 발생 가능한 이슈 식별 |

## 해결할 갭
- Cloudflare Workers AI 모델 카탈로그에서 TTS/이미지 생성 모델 존재 여부 미확인
- NICHE_SCHEMA.md, LEGAL_COMPLIANCE.md 미작성 — Phase 4/6 전에 필요
- Pixabay API 키 필요 여부 (무료 티어 존재 확인 필요)
- Whisper CPU 모드 실제 속도 벤치마크 미수행
