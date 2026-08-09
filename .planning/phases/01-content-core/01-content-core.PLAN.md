---
phase: 01-content-core
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - api/content/core.js
  - content/campaigns/.gitkeep
autonomous: true
requirements:
  - CORE-01
  - CORE-02
  - CORE-03
  - CORE-04
  - CORE-05
user_setup: []

must_haves:
  truths:
    - "campaignId를 지정하면 content/campaigns/{campaignId}/core.yaml 파일이 생성된다"
    - "저장된 core.yaml을 불러와서 콘텐츠 코어 객체로 파싱할 수 있다"
    - "캠페인 목록 조회 시 저장된 campaignId 리스트를 볼 수 있다"
    - "v1 appState(10개 필드)를 콘텐츠 코어로 변환할 수 있다(fromAppState)"
    - "콘텐츠 코어를 v1 appState로 역변환할 수 있다(toAppState)"
    - "purpose.stage enum(인지/고려/결정)이 스키마에 포함된다"
    - "depth.basic/applied/advanced 소구점 필드가 스키마에 포함된다"
    - "기존 index.html/app.js/state-manager.js 동작에 변화가 없다"
  artifacts:
    - path: "api/content/core.js"
      provides: "콘텐츠 코어 스키마, 저장/불러오기/목록 조회, fromAppState/toAppState 변환"
      exports:
        - "CORE_SCHEMA"
        - "createCampaignDir"
        - "saveCore"
        - "loadCore"
        - "listCampaigns"
        - "fromAppState"
        - "toAppState"
        - "validateCore"
    - path: "content/campaigns/.gitkeep"
      provides: "Git 버전 관리용 디렉토리 마커"
  key_links:
    - from: "api/content/core.js"
      to: "content/campaigns/{campaignId}/core.yaml"
      via: "fs.writeFileSync / fs.readFileSync"
      pattern: "content/campaigns/.*/core\\.yaml"
    - from: "fromAppState(appState)"
      to: "CORE_SCHEMA 구조"
      via: "필드 매핑"
      pattern: "appState\\.(brandName|productName|concept|target|tonAndManner|competitorInfo|priceRange|reviewExcerpts|trustFactors|excludedKeywords)"
    - from: "purpose.stage"
      to: "enum ['인지', '고려', '결정']"
      pattern: "stage:\\s*['\"](인지|고려|결정)['\"]"
    - from: "depth.basic / depth.applied / depth.advanced"
      to: "소구점 객체"
      pattern: "depth\\.(basic|applied|advanced)"

---

<objective>
## Phase 1: 콘텐츠 코어 확장 + 파일 저장

**Goal:** v1의 10개 입력 필드 + 당위성 엔진 + mc 깊이단계 개념을 병합한 콘텐츠 코어 YAML 스키마를 정의하고, campaignId 기반 파일 저장/불러오기/목록 조회 기능을 완성한다.

**Purpose:** 모든 포맷 렌더러(쇼츠/카드뉴스/인포그래픽/롱폼)의 공통 입력이 될 콘텐츠 코어 스키마를 수립하고, 파일 기반 저장소의 기본 CRUD를 구현한다.

**Output:**
- `api/content/core.js` — 콘텐츠 코어 스키마 정의 + 저장/불러오기/목록 조회 + 변환 함수
- `content/campaigns/` 디렉토리 구조 (Git 커밋)
- 스키마 검증 + v1 appState 호환 변환 함수
</objective>

<execution_context>
@/Users/twinssn/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/twinssn/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
# v1 appState 구조 (state-manager.js)
```javascript
const appState = {
  brandName: '',
  productName: '',
  concept: '',
  target: '',
  toneAndManner: '',
  competitorInfo: '',
  priceRange: '',
  reviewExcerpts: [],      // 줄바꿈 구분 → 배열
  trustFactors: [],        // 태그 입력 → 배열
  excludedKeywords: [],    // 쉼표 구분 → 배열
  mode: 'manual'
};
```

# v1 필드 → 콘텐츠 코어 매핑 (ARCHITECTURE.md §1.1)
| v1 필드 | 콘텐츠 코어 위치 |
|---------|-----------------|
| brandName | product.brand |
| productName | product.name |
| concept | message.concept |
| target | target.description |
| toneAndManner | message.tone (enum 매핑 필요) |
| competitorInfo | product.competitor |
| priceRange | product.price |
| reviewExcerpts[] | evidence.reviews[] |
| trustFactors[] | product.trustFactors[] |
| excludedKeywords[] | legal.restrictedClaims[] + niche.restrictions.avoidWords[] |

# 콘텐츠 코어 7개 그룹 (ROADMAP.md + ARCHITECTURE.md)
1. 식별·메타: campaignId, createdAt, updatedAt, schemaVersion, source, parentCampaignId
2. 제품: product(name, brand, category, price, competitor, trustFactors[])
3. 타겟·목적: target(description, painPoints[]), purpose(stage, callToAction)
4. 메시지·당위성: message(concept, tone), rationale(principles[], excludedPrinciples[])
5. 근거자료: evidence(reviews[], viralScripts[], researchSummary)
6. 법적고지: legal(affiliateType, disclosureText, restrictedClaims[])
7. 깊이단계 소구점: depth(basic, applied, advanced) + niche(id, name, version, tone, restrictions, trust)

# 목적(purpose.stage) enum: 인지 / 고려 / 결정
# 깊이단계(depth): basic / applied / advanced 각각 소구점 객체
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 콘텐츠 코어 YAML 스키마 정의 + 검증 + 저장/불러오기/목록 조회</name>
  <files>api/content/core.js, content/campaigns/.gitkeep</files>
  <behavior>
    - 핵심 동작: campaignId + 코어 객체를 받아 content/campaigns/{campaignId}/core.yaml 로 YAML 저장
    - 핵심 동작: campaignId로 core.yaml을 읽어 콘텐츠 코어 객체로 파싱
    - 핵심 동작: content/campaigns/ 디렉토리에서 저장된 캠페인 ID 목록 반환
    - 핵심 동작: CORE_SCHEMA 객체로 7개 그룹 30+ 필드 구조 정의
    - 핵심 동작: validateCore(core)로 필수 필드 검증
    - 목적.stage enum 검증: '인지' | '고려' | '결정' 만 허용
    - 깊이단계 구조 검증: depth.basic / depth.applied / depth.advanced 이 객체 형태인지 확인
    - YAML 파싱 오류 처리: 잘못된 YAML 입력 시 오류 객체 반환 (예외 던지지 않음)
    - 디렉토리 미존재 시 자동 생성
  </behavior>
  <read_first>
- /Users/twinssn/projects2/ad-script-studio/.planning/research/ARCHITECTURE.md (§1.2 필드 구성, §1.3 저장 형식)
- /Users/twinssn/projects2/ad-script-studio/.planning/ROADMAP.md (Phase 1 성공 기준)
- /Users/twinssn/projects2/ad-script-studio/state-manager.js (appState 구조 확인)
  </read_first>
  <action>
## 구현 내용

### 1. content/campaigns/.gitkeep 생성
- 빈 파일 생성으로 Git이 디렉토리 추적하도록 함

### 2. api/content/core.js 생성

#### CORE_SCHEMA 정의 (7개 그룹, 30+ 필드)
```javascript
// 콘텐츠 코어 YAML 스키마 (v2.0)
export const CORE_SCHEMA = {
  // 그룹 A: 식별·메타
  campaignId: { type: 'string', required: true },
  createdAt: { type: 'string', required: true, format: 'iso' },
  updatedAt: { type: 'string', required: true, format: 'iso' },
  schemaVersion: { type: 'string', required: true, default: '2.0' },
  source: { type: 'string', enum: ['user', 'auto-research', 'bridge'], default: 'user' },
  parentCampaignId: { type: 'string', required: false },

  // 그룹 B: 제품
  product: {
    name: { type: 'string', required: true },
    brand: { type: 'string', required: true },
    category: { type: 'string', required: false },
    price: { type: 'string', required: false },
    competitor: { type: 'string', required: false },
    trustFactors: { type: 'array', items: 'string', required: false }
  },

  // 그룹 C: 타겟·목적
  target: {
    description: { type: 'string', required: true },
    painPoints: { type: 'array', items: 'string', required: false }
  },
  purpose: {
    stage: { type: 'string', enum: ['인지', '고려', '결정'], required: true },
    callToAction: { type: 'string', required: false }
  },

  // 그룹 D: 메시지·당위성
  message: {
    concept: { type: 'string', required: true },
    tone: { type: 'string', required: true }
  },
  rationale: {
    principles: { type: 'array', items: 'object', required: false },
    excludedPrinciples: { type: 'array', items: 'string', required: false }
  },

  // 그룹 E: 근거자료
  evidence: {
    reviews: { type: 'array', items: 'string', required: false },
    viralScripts: { type: 'array', items: 'object', required: false },
    researchSummary: { type: 'string', required: false }
  },

  // 그룹 F: 법적고지
  legal: {
    affiliateType: { type: 'string', enum: ['쿠팡파트너스', '브랜드커넥스', '기타', '없음'], required: false },
    disclosureText: { type: 'string', required: false },
    restrictedClaims: { type: 'array', items: 'string', required: false }
  },

  // 그룹 G: 깊이단계 소구점 + 니치
  niche: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    version: { type: 'string', required: true },
    tone: { type: 'object', required: false },
    restrictions: {
      avoidWords: { type: 'array', items: 'string', required: false },
      avoidPhrases: { type: 'array', items: 'string', required: false },
      claimLimits: { type: 'object', required: false }
    },
    trust: { type: 'object', required: false }
  },
  depth: {
    basic: { type: 'object', required: false },    // 인지 단계 소구점
    applied: { type: 'object', required: false },  // 고려 단계 소구점
    advanced: { type: 'object', required: false }  // 결정 단계 소구점
  }
};
```

#### export 함수들
- `createCampaignDir(campaignId)` — content/campaigns/{campaignId}/ 디렉토리 생성 (fs.mkdirSync, { recursive: true })
- `saveCore(campaignId, coreData)` — 캠페인 디렉토리 생성 + core.yaml YAML 직렬화 저장 (js-yaml 사용)
- `loadCore(campaignId)` — core.yaml 읽기 + YAML 파싱 → 콘텐츠 코어 객체 반환, 파일 없거나 파싱 오류 시 null + 오류 정보 반환
- `listCampaigns()` — content/campaigns/ 하위 디렉토리 이름 목록 반환 (campaignId 리스트)
- `validateCore(core)` — CORE_SCHEMA 기준 필수 필드 존재 확인 + 타입/Enum 검증 → { valid: boolean, errors: [] }
- `generateId()` — 캠페인 ID 생성 헬퍼 (예: yyyy-mm-dd_짧은설명 형태 권장)

#### YAML 처리
- `js-yaml` 패키지 사용 (npm install js-yaml)
- 저장 시: `YAML.stringify(coreData)`
- 불러오기 시: `YAML.parse(fileContent)`
- 오류 처리: try/catch로 감싸고 실패한 경우 { success: false, error: '...' } 형태 반환

#### 경로 처리
- `path.join(process.cwd(), 'content', 'campaigns', campaignId, 'core.yaml')` 방식 사용
- Vercel 서버리스 환경에서는 process.cwd()가 프로젝트 루트임을 가정

#### purpose.stage enum 검증
- validateCore에서 `['인지', '고려', '결정']` 중 하나인지 확인
- depth 구조 검증: basic/applied/advanced가 객체인지 확인 (없어도 괜찮음, 있으면 객체여야 함)

### 3. 테스트 파일 생성: test-content-core.mjs
- 저장/불러오기/목록 조회/검증/변환 각각 테스트
</action>
  <verify>
<automated>
node --input-type=module -e "
import { createCampaignDir, saveCore, loadCore, listCampaigns, validateCore, CORE_SCHEMA } from './api/content/core.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// 임시 테스트 디렉토리 설정
const TEST_DIR = join(tmpdir(), 'ad-script-test-' + Date.now());
mkdirSync(join(TEST_DIR, 'content', 'campaigns'), { recursive: true });

// 과정.cwd()를 테스트 디렉토리로 변경하는 대신, 핵심 함수들이 경로를 제대로 구성하는지 확인
// (실제 구현에서는 process.cwd() 기준)

console.log('✓ core.js 모듈 로드 성공');
console.log('✓ CORE_SCHEMA 정의됨:', Object.keys(CORE_SCHEMA).length, '개 그룹');
console.log('✓ 필수 함수 존재 확인: createCampaignDir, saveCore, loadCore, listCampaigns, validateCore');
"
</automated>
</verify>
  <done>
- api/content/core.js 파일 생성됨
- content/campaigns/.gitkeep 파일 생성됨
- CORE_SCHEMA가 7개 그룹, 30+ 필드로 정의됨
- saveCore/loadCore/listCampaigns/createCampaignDir 함수 export됨
- validateCore 함수가 purpose.stage enum + depth 구조 검증 포함
- YAML 파싱 오류 시 안전하게 처리됨
</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: fromAppState / toAppState 변환 함수 + 통합 검증 테스트</name>
  <files>api/content/core.js</files>
  <behavior>
    - fromAppState(appState): v1의 10개 필드 + mode를 콘텐츠 코어 구조로 변환
    - toAppState(core): 콘텐츠 코어를 v1 appState 구조로 역변환 (정보 손실 가능: 선택 필드는 빈 값/빈 배열로)
    - brandName → product.brand 매핑 확인
    - productName → product.name 매핑 확인
    - concept → message.concept 매핑 확인
    - target → target.description 매핑 확인
    - toneAndManner → message.tone 매핑 확인
    - competitorInfo → product.competitor 매핑 확인
    - priceRange → product.price 매핑 확인
    - reviewExcerpts[] → evidence.reviews[] 매핑 확인
    - trustFactors[] → product.trustFactors[] 매핑 확인
    - excludedKeywords[] → legal.restrictedClaims[] 매핑 확인
    - purpose.stage 기본값: '인지' (appState에 없는 신규 필드)
    - depth.basic/applied/advanced 기본값: 빈 객체 (appState에 없는 신규 필드)
    - niche.id/niche.name/niche.version: 변환 시 '미지정' 기본값 또는 caller가 제공하도록 설계
    - fromAppState 결과물이 validateCore를 통과하는지 확인 (필수 필드 중 일부가 비었더라도 구조적으로 유효한지)
  </behavior>
  <read_first>
- /Users/twinssn/projects2/ad-script-studio/.planning/research/ARCHITECTURE.md (§1.1 마이그레이션 경로 표)
- /Users/twinssn/projects2/ad-script-studio/state-manager.js (appState 초기값 확인)
  </read_first>
  <action>
## 구현 내용

### fromAppState(appState) 함수
```javascript
export function fromAppState(appState) {
  return {
    // 그룹 A: 식별·메타 (자동 생성)
    campaignId: appState.campaignId || generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: '2.0',
    source: appState._source || 'user',

    // 그룹 B: 제품 (v1 필드 매핑)
    product: {
      name: appState.productName || '',
      brand: appState.brandName || '',
      category: '',
      price: appState.priceRange || '',
      competitor: appState.competitorInfo || '',
      trustFactors: Array.isArray(appState.trustFactors) ? [...appState.trustFactors] : []
    },

    // 그룹 C: 타겟·목적
    target: {
      description: appState.target || '',
      painPoints: []
    },
    purpose: {
      stage: '인지',  // 신규 필드 — 기본값
      callToAction: ''
    },

    // 그룹 D: 메시지·당위성
    message: {
      concept: appState.concept || '',
      tone: appState.toneAndManner || '진지'
    },
    rationale: {
      principles: [],
      excludedPrinciples: []
    },

    // 그룹 E: 근거자료
    evidence: {
      reviews: Array.isArray(appState.reviewExcerpts) ? [...appState.reviewExcerpts] : [],
      viralScripts: [],
      researchSummary: ''
    },

    // 그룹 F: 법적고지
    legal: {
      affiliateType: '없음',
      disclosureText: '',
      restrictedClaims: Array.isArray(appState.excludedKeywords) ? [...appState.excludedKeywords] : []
    },

    // 그룹 G: 깊이단계 + 니치
    niche: {
      id: 'pending',
      name: '',
      version: '2.0'
    },
    depth: {
      basic: {},
      applied: {},
      advanced: {}
    }
  };
}
```

### toAppState(core) 함수
```javascript
export function toAppState(core) {
  return {
    brandName: core.product?.brand || '',
    productName: core.product?.name || '',
    concept: core.message?.concept || '',
    target: core.target?.description || '',
    toneAndManner: core.message?.tone || '진지',
    competitorInfo: core.product?.competitor || '',
    priceRange: core.product?.price || '',
    reviewExcerpts: Array.isArray(core.evidence?.reviews) ? [...core.evidence.reviews] : [],
    trustFactors: Array.isArray(core.product?.trustFactors) ? [...core.product.trustFactors] : [],
    excludedKeywords: Array.isArray(core.legal?.restrictedClaims) ? [...core.legal.restrictedClaims] : [],
    mode: 'manual'
  };
}
```

### 핵심 매핑 확인표
| 변환 방향 | v1 필드 | 콘텐츠 코어 경로 |
|-----------|---------|-----------------|
| fromAppState | brandName | product.brand |
| fromAppState | productName | product.name |
| fromAppState | concept | message.concept |
| fromAppState | target | target.description |
| fromAppState | toneAndManner | message.tone |
| fromAppState | competitorInfo | product.competitor |
| fromAppState | priceRange | product.price |
| fromAppState | reviewExcerpts[] | evidence.reviews[] |
| fromAppState | trustFactors[] | product.trustFactors[] |
| fromAppState | excludedKeywords[] | legal.restrictedClaims[] |
| toAppState | product.brand | brandName |
| toAppState | product.name | productName |
| toAppState | message.concept | concept |
| toAppState | target.description | target |
| toAppState | message.tone | toneAndManner |
| toAppState | product.competitor | competitorInfo |
| toAppState | product.price | priceRange |
| toAppState | evidence.reviews[] | reviewExcerpts[] |
| toAppState | product.trustFactors[] | trustFactors[] |
| toAppState | legal.restrictedClaims[] | excludedKeywords[] |

### niche + depth 필드 처리
- fromAppState에서 niche.id는 'pending', niche.name은 '', niche.version은 '2.0'으로 설정
- depth.basic/applied/advanced는 빈 객체 {} 로 초기화
- 이 필드들은 v1에 없던 신규 필드이므로, 변환 후에도 "수동 입력 필요" 상태로 남겨둠
- 주제 브릿지(BRIDGE-01/02)에서나중에 이 필드들을 채우는 방식
  </action>
  <verify>
<automated>
node --input-type=module -e "
import { fromAppState, toAppState } from './api/content/core.js';

// 테스트 1: 빈 appState → 코어 변환
const emptyState = {
  brandName: '', productName: '', concept: '', target: '', toneAndManner: '',
  competitorInfo: '', priceRange: '', reviewExcerpts: [], trustFactors: [], excludedKeywords: []
};
const core = fromAppState(emptyState);
console.assert(core.product.brand === '', 'brandName → product.brand');
console.assert(core.product.name === '', 'productName → product.name');
console.assert(core.message.concept === '', 'concept → message.concept');
console.assert(core.target.description === '', 'target → target.description');
console.assert(core.message.tone === '진지', 'toneAndManner 기본값');
console.assert(core.product.competitor === '', 'competitorInfo → product.competitor');
console.assert(core.product.price === '', 'priceRange → product.price');
console.assert(Array.isArray(core.evidence.reviews), 'reviewExcerpts → evidence.reviews 배열');
console.assert(Array.isArray(core.product.trustFactors), 'trustFactors → product.trustFactors 배열');
console.assert(Array.isArray(core.legal.restrictedClaims), 'excludedKeywords → legal.restrictedClaims 배열');
console.assert(core.purpose.stage === '인지', 'purpose.stage 기본값 = 인지');
console.assert(typeof core.depth.basic === 'object', 'depth.basic 객체');
console.assert(typeof core.depth.applied === 'object', 'depth.applied 객체');
console.assert(typeof core.depth.advanced === 'object', 'depth.advanced 객체');

// 테스트 2: 값 있는 appState → 코어 변환
const filledState = {
  brandName: '테스트브랜드', productName: '테스트제품', concept: '핵심컨셉',
  target: '25-35세 여성', toneAndManner: '유쾌',
  competitorInfo: '경쟁사A', priceRange: '39,000원',
  reviewExcerpts: ['좋아요', '강추'], trustFactors: ['식약처인증'],
  excludedKeywords: ['싼', '저렴한']
};
const core2 = fromAppState(filledState);
console.assert(core2.product.brand === '테스트브랜드', 'brandName 매핑');
console.assert(core2.product.name === '테스트제품', 'productName 매핑');
console.assert(core2.message.concept === '핵심컨셉', 'concept 매핑');
console.assert(core2.target.description === '25-35세 여성', 'target 매핑');
console.assert(core2.message.tone === '유쾌', 'toneAndManner 매핑');
console.assert(core2.product.competitor === '경쟁사A', 'competitorInfo 매핑');
console.assert(core2.product.price === '39,000원', 'priceRange 매핑');
console.assert(core2.evidence.reviews.length === 2, 'reviewExcerpts 길이');
console.assert(core2.evidence.reviews[0] === '좋아요', 'reviewExcerpts[0]');
console.assert(core2.product.trustFactors.length === 1, 'trustFactors 길이');
console.assert(core2.legal.restrictedClaims.length === 2, 'restrictedClaims 길이');

// 테스트 3: toAppState 역변환
const back = toAppState(core2);
console.assert(back.brandName === '테스트브랜드', 'toAppState brandName');
console.assert(back.productName === '테스트제품', 'toAppState productName');
console.assert(back.concept === '핵심컨셉', 'toAppState concept');
console.assert(back.target === '25-35세 여성', 'toAppState target');
console.assert(back.toneAndManner === '유쾌', 'toAppState toneAndManner');

console.log('✓ 모든 변환 테스트 통과');
"
</automated>
</verify>
  <done>
- fromAppState 함수가 v1 appState → 콘텐츠 코어 변환 수행
- toAppState 함수가 콘텐츠 코어 → v1 appState 역변환 수행
- 10개 필드 전체 매핑 확인 (양방향)
- purpose.stage 기본값 '인지' 적용
- depth.basic/applied/advanced 빈 객체 초기화
- niche.id 'pending' 기본값 적용
</done>
</task>

<task type="auto">
  <name>Task 3: 검증 테스트 + v1 무손상 확인</name>
  <files>test-content-core.mjs</files>
  <action>
## 통합 테스트 작성

### test-content-core.mjs 생성

다음 시나리오를 모두 검증하는 테스트 파일 생성:

1. **저장 테스트**
   - campaignId='test-campaign-001'로 core.yaml 저장
   - content/campaigns/test-campaign-001/core.yaml 파일 존재 확인
   - 파일 내용이 YAML 포맷인지 확인

2. **불러오기 테스트**
   - 저장한 캠페인 불러오기 → 원본과 동일한지 확인
   - 존재하지 않는 캠페인 불러오기 → null + 오류 반환 확인

3. **목록 조회 테스트**
   - 2개 이상 캠페인 저장 후 목록 조회 → 모든 campaignId 포함 확인

4. **검증 테스트**
   - 필수 필드 누락 시 validateCore가 errors 반환
   - purpose.stage에 잘못된 값('삭제') 입력 시 검증 실패
   - purpose.stage에 올바른 값('인지'/'고려'/'결정') 입력 시 검증 통과
   - depth.basic이 객체가 아닌 문자열이면 검증 실패

5. **변환 테스트**
   - fromAppState → toAppState 왕복 변환 후 원본과 주요 필드 일치 확인
   - 목적.stage가 '인지'로 설정되는지 확인 (앱스테이트에 없던 값)

6. **v1 무손상 테스트**
   - 기존 index.html/app.js/state-manager.js를 수정하지 않았음을 git diff로 확인
   - 기존 파일에 콘텐츠 코어 관련 코드 중복 없음 확인

</action>
  <verify>
<automated>
node test-content-core.mjs
</automated>
</verify>
  <done>
- test-content-core.mjs 테스트 파일 생성
- 저장/불러오기/목록/검증/변환 모든 테스트 통과
- v1 무손상 확인 (기존 파일 변경 없음)
</done>
</task>

</tasks>

<verification>
## Phase 1 검증 체크리스트

- [ ] `api/content/core.js` 파일이 생성되고 모든 export 함수 존재
- [ ] CORE_SCHEMA가 7개 그룹, 30+ 필드로 정의됨
- [ ] `campaignId` 입력 시 `content/campaigns/{campaignId}/core.yaml` 생성됨
- [ ] 저장된 core.yaml을 loadCore로 불러와서 객체 파싱 가능
- [ ] listCampaigns()가 저장된 campaignId 리스트 반환
- [ ] fromAppState(appState)가 v1 10개 필드를 콘텐츠 코어로 변환
- [ ] toAppState(core)가 콘텐츠 코어를 v1 appState로 역변환
- [ ] purpose.stage enum('인지'/'고려'/'결정')이 스키마에 포함되고 검증됨
- [ ] depth.basic/applied/advanced 소구점 필드가 스키마에 포함됨
- [ ] YAML 파싱 오류 시 안전하게 처리됨 (예외 던지지 않음)
- [ ] 기존 index.html, app.js, state-manager.js 수정 없음 (git diff 확인)
</verification>

<success_criteria>
## Phase 1 완료 기준

1. **스키마 완성도:** 콘텐츠 코어 YAML 스키마가 7개 그룹(식별·메타 / 제품 / 타겟·목적 / 메시지·당위성 / 근거자료 / 법적고지 / 깊이단계 소구점) 30+ 필드로 정의됨
2. **저장 기능:** campaignId 지정 시 content/campaigns/{campaignId}/core.yaml 자동 생성
3. **불러오기 기능:** 저장된 core.yaml 읽어 콘텐츠 코어 객체로 파싱 가능
4. **목록 조회:** 저장된 캠페인 campaignId 리스트 조회 가능
5. **변환 호환성:** fromAppState/toAppState 양방향 변환 정상 동작
6. **신규 필드 포함:** purpose.stage enum + depth.basic/applied/advanced 소구점 필드 스키마에 포함
7. **v1 무손상:** 기존 index.html/app.js/state-manager.js 수정 없음
8. **테스트 통과:** test-content-core.mjs 전체 테스트 통과
</success_criteria>

<output>
## 이 Phase가 생성하는 파일/심볼

### 신규 파일
- `api/content/core.js` — 콘텐츠 코어 스키마 + CRUD + 변환 함수
- `content/campaigns/.gitkeep` — Git 버전 관리용 디렉토리 마커
- `test-content-core.mjs` — 통합 검증 테스트

### export 심볼 (api/content/core.js)
- `CORE_SCHEMA` — 7개 그룹 스키마 정의 객체
- `createCampaignDir(campaignId)` — 캠페인 디렉토리 생성
- `saveCore(campaignId, coreData)` — core.yaml 저장
- `loadCore(campaignId)` — core.yaml 불러오기 + 파싱
- `listCampaigns()` — 캠페인 ID 목록 조회
- `validateCore(core)` — 스키마 검증
- `fromAppState(appState)` — v1 → 콘텐츠 코어 변환
- `toAppState(core)` — 콘텐츠 코어 → v1 변환
- `generateId()` — 캠페인 ID 생성 헬퍼

### 디렉토리 구조
```
content/campaigns/
└── .gitkeep
```

</output>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 파일 시스템 → API | 사용자 제공 campaignId가 파일 경로로 사용됨 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Security (Path traversal) | saveCore/loadCore의 campaignId | mitigate | campaignId를 path segments로 분해 후 유효한지 검증 (., .., / 포함 금지) |
| T-01-02 | Tampering (YAML injection) | YAML.parse 입력 | mitigate | 사용자 편집 YAML 파싱 시 try/catch + 스키마 검증 실패 시 안전하게 처리 |
| T-01-03 | Information Disclosure | listCampaigns 노출 범위 | accept | MVP는 단일 사용자 가정, 추후 인증 도입 시 노출된 캠페인 필터링 |
</threat_model>
