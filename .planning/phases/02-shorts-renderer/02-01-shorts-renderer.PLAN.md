---
phase: 02-shorts-renderer
plan: 01
type: execute
wave: 1
depends_on: ["01-content-core"]
files_modified:
  - api/content/shorts-renderer.js
  - test-shorts-renderer.mjs
  - content/campaigns/{campaignId}/shorts/render-ready.json  # 생성 대상 경로 (실제 저장 시)
autonomous: true
requirements: ["SHORTS-01", "SHORTS-02", "SHORTS-03", "SHORTS-04", "SHORTS-05", "SHORTS-06", "SHORTS-07"]
user_setup:
  - service: pixabay
    why: "SHORTS-03 실사 이미지 검색·다운로드"
    env_vars:
      - name: PIXABAY_API_KEY
        source: "Pixabay API 대시보드 → API Key"
    dashboard_config:
      - task: "API 키 발급"
        location: "https://pixabay.com/accounts/register/ → API 키 생성"
  - service: pollinations-ai
    why: "SHORTS-04 AI 이미지 생성 (익명 15초당 1회 제한 인지. 선택 사항으로 API 키 옵션 존재)"
    env_vars:
      - name: POLLINATIONS_API_KEY
        source: "Pollinations.ai 대시보드 (선택 사항 — 없으면 익명 사용)"
    dashboard_config: []

must_haves:
  truths:
    - "콘텐츠 코어 객체를 입력하면 7장면 60초 대본이 생성된다 (v1 template-plan.js 확장, 15/30초 축약 규칙 유지)"
    - "대본에서 씬을 파싱하여 씬별 EN 이미지 프롬프트가 생성된다 (최소 3/최대 10씬, 상세도 조절 최소/보통/상세)"
    - "Pixabay API로 장면별 실사 이미지를 검색·다운로드하여 content/campaigns/{campaignId}/shorts/images/에 저장하고 출처 로그를 남긴다"
    - "Pollinations.ai(Flux)로 AI 이미지를 생성할 수 있다 (익명 15초당 1회 제한 인지, API 키 옵션 지원)"
    - "edge-tts로 장면별 한국어 TTS를 생성하여 content/campaigns/{campaignId}/shorts/audio/에 저장한다 (ko-KR-SunHiNeural)"
    - "렌더링 준비 완료 상태(render-ready.json)에 대본 + 씬별 프롬프트 + TTS 파일 경로 + 이미지 경로가 조립되고, 실제 moviepy 렌더링은 '준비 완료, Phase 5에서 실행'으로 표시된다"
    - "쇼츠 결과물에서 장면별/전체 카피 버튼이 동작한다"
  artifacts:
    - path: "api/content/shorts-renderer.js"
      provides: "쇼츠 렌더러 메인 모듈 — 스크립트 생성, 씬 파싱, 이미지 검색·다운로드, TTS 생성, render-ready 조립, 카피"
      min_lines: 300
      exports: ["generateShorts", "parseScriptToScenes", "generateImagePrompts", "fetchPixabayImage", "fetchPollinationsImage", "generateTTS", "assembleRenderReady", "copyScene", "copyAll"]
    - path: "test-shorts-renderer.mjs"
      provides: "쇼츠 렌더러 테스트 — 스크립트 생성, 씬 파싱, 프롬프트, 카피 함수 단위 테스트"
      min_lines: 150
  key_links:
    - from: "api/content/shorts-renderer.js"
      to: "api/content/core.js"
      via: "import { loadCore } — 콘텐츠 코어 읽기"
      pattern: "loadCore"
    - from: "api/content/shorts-renderer.js"
      to: "template-plan.js"
      via: "SCRIPT_TEMPLATE + generateScript() 재사용 (수정하지 않음)"
      pattern: "template-plan"
    - from: "api/content/shorts-renderer.js"
      to: "template-video.js"
      via: "parseScriptToScenes() + generateImagePrompt() 계승 (수정하지 않음)"
      pattern: "template-video"
    - from: "api/content/shorts-renderer.js"
      to: "content/campaigns/{campaignId}/shorts/render-ready.json"
      via: "assembleRenderReady()로 JSON 저장"
      pattern: "render-ready.json"
    - from: "api/content/shorts-renderer.js"
      to: "Pixabay API (https://pixabay.com/api/)"
      via: "fetch + PIXABAY_API_KEY"
      pattern: "pixabay.com/api"
    - from: "api/content/shorts-renderer.js"
      to: "Pollinations.ai (https://image.pollinations.ai/)"
      via: "fetch + 프롬프트 URL 인코딩"
      pattern: "pollinations.ai"
    - from: "api/content/shorts-renderer.js"
      to: "edge-tts (npm edge-tts 패키지 또는 exec)"
      via: "ko-KR-SunHiNeural 목소리로 MP3 생성"
      pattern: "edge-tts|ko-KR-SunHiNeural"

---

<objective>
콘텐츠 코어(api/content/core.js에서 loadCore()로 읽음)를 입력받아
v1 template-plan.js·template-video.js를 확장/계승하여
60초 숏폼 대본 + 씬별 EN 이미지 프롬프트 + Pixabay 실사 이미지 + Pollinations.ai AI 이미지 + edge-tts TTS를 생성하고,
render-ready.json에 "렌더링 준비 완료, Phase 5에서 실행" 상태로 조립한다.

목적: Phase 5(moviepy 렌더링)로 넘길 모든 자산(대본, 이미지, TTS)을 생성하는 것.
Vercel Serverless에서 실행 가능한 범위(이미지 다운로드, TTS)로 제한하며,
moviepy/Whisper는 포함하지 않는다 (PITFALLS.md #1).

출력:
- api/content/shorts-renderer.js (메인 렌더러 모듈)
- test-shorts-renderer.mjs (단위 테스트)
- content/campaigns/{campaignId}/shorts/render-ready.json (렌더 결과 조립 파일)
</objective>

<execution_context>
@/Users/twinssn/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/twinssn/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/twinssn/projects2/ad-script-studio/.planning/ROADMAP.md
@/Users/twinssn/projects2/ad-script-studio/.planning/REQUIREMENTS.md
@/Users/twinssn/projects2/ad-script-studio/.planning/research/ARCHITECTURE.md
@/Users/twinssn/projects2/ad-script-studio/.planning/research/STACK.md
@/Users/twinssn/projects2/ad-script-studio/.planning/research/PITFALLS.md
@/Users/twinssn/projects2/ad-script-studio/api/content/core.js
@/Users/twinssn/projects2/ad-script-studio/template-plan.js
@/Users/twinssn/projects2/ad-script-studio/template-video.js
@/Users/twinssn/projects2/ad-script-studio/skills/custom/shortform-copywriting.md

## v1 무손상 대상 (이 plan에서 절대 수정하지 않음)
- template-plan.js: 수정 금지 — 이 plan의 대본 생성은 template-plan.js의 SCRIPT_TEMPLATE과 generateScript()를 외부에서 import하여 사용
- template-video.js: 수정 금지 — 이 plan의 씬 파싱·프롬프트 생성은 template-video.js의 parseScriptToScenes(), generateImagePrompt()를 외부에서 import하여 사용
- state-manager.js: 수정 금지
- app.js: 수정 금지
- index.html: 수정 금지

## Phase 1 산출물 (의존성)
- api/content/core.js: CORE_SCHEMA + saveCore + loadCore + listCampaigns + validateCore + fromAppState + toAppState
- content/campaigns/{campaignId}/core.yaml: 콘텐츠 코어 저장 파일

## 콘텐츠 코어 필드 중 쇼츠 렌더러가 사용하는 필드 (ARCHITECTURE.md §2.2 + FEATURES.md §1)
| 코어 필드 | 사용 방식 |
|-----------|-----------|
| product.brand | 대본 placeholder 대체 (template-plan.js의 brandName 역할) |
| product.name | 대본 placeholder 대체 (template-plan.js의 productName 역할) |
| message.concept | 핵심 메시지, keyBenefit 대체 |
| target.description | 타겟층 언급, 훅 장면 주체 |
| message.tone | 장면 톤/연출 스타일 (신규 적용) |
| product.competitor | 비교/대조 장면 구성 시 활용 |
| product.price | CTA 장면 가격 언급 |
| evidence.reviews[] | painPoint 추출, 사회적 증거 장면 |
| product.trustFactors[] | 신뢰 요소 장면, proof 장면 |
| legal.disclosureText | 제휴 고지 (render-ready.json의 disclosure 필드에 포함, Phase 5에서 자막 삽입) |
| purpose.stage | 대본 소구점 강도 결정 (인지=호기심 강조, 고려=비교 강조, 결정=CTA 강조) |
| niche.id + niche.restrictions.avoidWords[] | 이미지 프롬프트 구성 시 제외할 시각 요소 결정 |

## 설계 결정 (이 plan에서 확정)
1. **대본 생성 방식**: template-plan.js를 수정하지 않고, 신규 모듈 shorts-renderer.js가 template-plan.js의 SCRIPT_TEMPLATE + generateScript()를 import하여 사용. content core → v1 appState 변환은 core.toAppState()로 수행한 후 generateScript()에 전달하는 래퍼 함수 generateShortsScript(core)를 shorts-renderer.js에 구현.
2. **이미지 소스 우선순위**: Pixabay(실사) 우선 시도 → 실패 시 Pollinations.ai(Flux) 폴백. 둘 다 실패하면 render-ready.json에 이미지 상태를 'failed'로 기록하고 렌더 계속 진행 (PITFALLS.md §2 Pollinations.ai 익명 제한 대응).
3. **TTS**: edge-tts ko-KR-SunHiNeural 확정. Vercel Serverless에서 edge-tts 실행이 불안정할 수 있으므로, TTS 함수는 `generateTTS()`로 추상화하고, 실패 시 render-ready.json에 오디오 상태를 'pending'으로 표시 (실제 TTS 실행은 로컬 스크립트 또는 Phase 5에서 재시도 가능). Vercel 서버리스에서 edge-tts를 직접 호출하는 코드는 포함하되, 실패 graceful handling 포함.
4. **렌더링 준비 완료 출력 형식**: JSON 파일 `content/campaigns/{campaignId}/shorts/render-ready.json`. moviepy 렌더링은 Phase 5로 이연 문구를 포함.
5. **카피 버튼**: render-ready.json을 읽는 함수가 장면별/전체 카피 문자열을 반환. 실제 클립보드 API 호출은 프론트엔드(app.js) 책임 — shorts-renderer.js는 카피할 텍스트 데이터만 제공.
6. **Vercel Serverless 제약 고려**: 이미지 다운로드 + TTS는 수 분 소요될 수 있으므로, 각 단계를 개별 함수로 분리하여 로컬 스크립트에서도 단계별 호출 가능하게 설계. 전체를 한 번에 실행하는 `generateShorts()`와 단계별 함수(`generateScriptOnly()`, `fetchImagesOnly()`, `generateTTSOnly()`)를 모두 노출.

## 테스트 전략
- Node.js 내장 test runner (node --test) 사용 — 별도 프레임워크 설치 불필요
- 외부 API(Pixabay, Pollinations.ai, edge-tts)는 테스트에서 mock 처리
- v1 무손상 확인: template-plan.js와 template-video.js가 수정되지 않았음을 grep으로 확인 + core.toAppState()/fromAppState() 변환 테스트
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 대본 생성 + 씬 파싱 + EN 이미지 프롬프트 모듈 작성</name>
  <files>api/content/shorts-renderer.js, test-shorts-renderer.mjs</files>
  <behavior>
    - Test 1: 빈 콘텐츠 코어를 입력하면 기본 fallback 대본이 7장면 생성된다
    - Test 2: product.brand/product.name/message.concept가 채워진 코어를 입력하면 해당 값이 대본에 대체된다
    - Test 3: generateScriptOnly(core)는 template-plan.js의 generateScript() 결과를 그대로 반환한다 (v1 무손상 확인: 원본 generateScript 동작 유지)
    - Test 4: parseScriptToScenes()는 대본 배열에서 최소 3개, 최대 10개 씬을 추출한다
    - Test 5: generateImagePrompts(scenes, '최소'|'보통'|'상세')는 씬별 EN 프롬프트 배열을 반환한다
    - Test 6: abbreviateShortsScript(scenes, 15)는 hook+solution+cta 3장면으로 축약된다
    - Test 7: abbreviateShortsScript(scenes, 30)는 hook+problem+solution+cta 4장면으로 축약된다
    - Test 8: template-plan.js와 template-video.js가 원본 그대로 유지됨을 grep으로 확인 (수정 금지 검증)
  </behavior>
  <read_first>
    - api/content/core.js (CORE_SCHEMA, loadCore, toAppState 인터페이스 확인용)
    - template-plan.js (SCRIPT_TEMPLATE, generateScript, abbreviateScript 인터페이스 확인용)
    - template-video.js (parseScriptToScenes, generateImagePrompt, generateAllPrompts 인터페이스 확인용)
  </read_first>
  <action>
    ## api/content/shorts-renderer.js 생성

    **파일**: `api/content/shorts-renderer.js`
    **역할**: 쇼츠 렌더러의 핵심 로직 — 대본 생성, 씬 파싱, EN 이미지 프롬프트 생성

    ### import 관계 (v1 무손상 — 수정하지 않고 참조만)
    ```javascript
    // template-plan.js에서 생성 스크립트 로직을 import (v1 원본 그대로 사용)
    import { generateScript as v1GenerateScript, abbreviateScript as v1AbbreviateScript, SCRIPT_TEMPLATE } from '../template-plan.js';

    // template-video.js에서 씬 파싱 + 프롬프트 생성 로직을 import (v1 원본 그대로 사용)
    import { parseScriptToScenes, generateImagePrompt, generateAllPrompts } from '../template-video.js';

    // Phase 1 콘텐츠 코어 모듈을 import
    import { loadCore, toAppState, validateCore } from './core.js';
    ```

    ### export 함수 목록

    **1. generateShortsScript(core) → scenes[]**
    콘텐츠 코어에서 v1 appState로 변환 후 template-plan.js generateScript()를 호출하여 7장면 대본 생성.
    - core가 유효하지 않으면 validateCore로 검사하고 오류 반환
    - core.product.brand, core.product.name, core.message.concept 등 필드 매핑은 core.toAppState()를 통해 수행
    - purpose.stage에 따라 대본 톤 조절: 인지→호기심 강조, 고려→비교 강조, 결정→CTA 강조 (렉트 단서 추가)
    - niche.restrictions.avoidWords에 포함된 단어가 대본에 들어가지 않도록 확인 (있는 경우 대체 문구 사용)

    **2. generateShortsPrompts(scenes, detailLevel) → prompts[]**
    template-video.js의 generateAllPrompts()를 감싸는 래퍼.
    - detailLevel: '최소' | '보통' | '상세' (기본값 '보통')
    - 반환 배열 각 요소: { sceneIndex, time, type, imagePrompt, motionPrompt, styleSuffix }
    - template-video.js의 getStyleSuffix() 결과를 그대로 사용 (현재 '--style raw --ar 9:16')

    **3. abbreviateShortsScript(scenes, targetDuration) → scenes[]**
    template-plan.js의 abbreviateScript()를 래핑.
    - targetDuration: 15 | 30 | 60 (초)
    - v1의 15초/30초 축약 규칙 유지 (15초: hook+solution+cta, 30초: hook+problem+solution+cta)

    **4. parseShortsScenes(scenes) → parsedScenes[]**
    template-video.js의 parseScriptToScenes()를 씬 객체 배열에 맞게 조정.
    - 입력: generateShortsScript()가 반환한 scenes[] (time, type, dialogue, direction, visual 포함)
    - 출력: 각 씬에 description(visual + dialogue 결합), dialogue 분리 저장
    - 최소 3씬, 최대 10씬 제한 적용 (template-video.js의 parseScriptToScenes 로직 계승)

    ### v1 무손상 확인 로직 (이 함수 내부에서 하지 않고 테스트에서 확인)
    - 이 파일은 template-plan.js와 template-video.js를 수정하지 않는다. import만 한다.
    - template-plan.js의 SCRIPT_TEMPLATE.totalScenes === 7, SCRIPT_TEMPLATE.duration === 60 확인은 테스트에서 수행.
  </action>
  <verify>
    <automated>cd /Users/twinssn/projects2/ad-script-studio && node --test test-shorts-renderer.mjs --test-name-pattern "Task1" 2>&1 | tail -30</automated>
  </verify>
  <done>
    - api/content/shorts-renderer.js가 생성되고 generateShortsScript, generateShortsPrompts, abbreviateShortsScript, parseShortsScenes를 export함
    - test-shorts-renderer.mjs가 생성되고 Task1 관련 테스트가 모두 통과함
    - template-plan.js가 수정되지 않았음: `git diff template-plan.js`가 비어 있음
    - template-video.js가 수정되지 않았음: `git diff template-video.js`가 비어 있음
    - core.toAppState()로 변환한 appState를 v1 generateScript()에 전달하면 정상 대본이 생성됨
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Pixabay 이미지 검색·다운로드 + Pollinations.ai AI 이미지 생성 모듈 작성</name>
  <files>api/content/shorts-renderer.js (append), test-shorts-renderer.mjs (append)</files>
  <behavior>
    - Test 1: fetchPixabayImage(keywords, campaignId, sceneIndex)는 PIXABAY_API_KEY 환경변수가 설정되었을 때 이미지 URL과 저장 경로를 반환한다 (mock fetch 사용)
    - Test 2: PIXABAY_API_KEY가 없으면 fetchPixabayImage는 graceful하게 'skipped' 상태를 반환한다 (오류로 중단하지 않음)
    - Test 3: fetchPollinationsImage(prompt, campaignId, sceneIndex)는 Pollinations.ai URL로 이미지 생성을 요청하고 로컬 저장을 시도한다 (mock fetch 사용)
    - Test 4: fetchImagesForShorts(scenes, campaignId)는 각 씬별 Pixabay 우선 → Pollinations 폴백 순서로 이미지를 가져온다
    - Test 5: 이미지 출처 로그(이미지 URL, 출처 Pixabay/Pollinations, 저장 경로)가 render-ready에 포함될 구조로 반환된다
    - Test 6:동시 요청 제한 — Pollinations.ai 익명 15초당 1회 제한을 인지한 순차 실행이 기본 동작이다 (동시 요청이 아님)
  </behavior>
  <read_first>
    - api/content/shorts-renderer.js (Task 1 결과물 — export 구조에 추가)
    - .planning/research/STACK.md (Pixabay API 한도, Pollinations.ai 제한 확인)
    - .planning/research/PITFALLS.md (§2 Pexels/Pixabay 한도, Pollinations.ai 익명 제한)
  </read_first>
  <action>
    ## shorts-renderer.js에 이미지 모듈 추가 (Task 1 파일에 append)

    ### import 추가
    ```javascript
    import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
    import { join } from 'node:path';
    import { cwd } from 'node:process';
    ```

    ### 경로 헬퍼
    ```javascript
    const CAMPAIGNS_DIR = join(cwd(), 'content', 'campaigns');
    function shortsImagesDir(campaignId) {
      return join(CAMPAIGNS_DIR, campaignId, 'shorts', 'images');
    }
    function shortsAudioDir(campaignId) {
      return join(CAMPAIGNS_DIR, campaignId, 'shorts', 'audio');
    }
    function ensureDir(dirPath) {
      if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
      return dirPath;
    }
    ```

    ### fetchPixabayImage(keywords, campaignId, sceneIndex) → { success, imagePath?, sourceUrl?, error? }
    - PIXABAY_API_KEY 환경변수 확인. 없으면 `{ success: false, skipped: true, reason: 'PIXABAY_API_KEY not set' }` 반환
    - Pixabay API 호출: `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(keywords)}&image_type=photo&orientation=horizontal&per_page=3`
    - 응답에서 webformatURL (640px) 또는 largeImageURL (1280px) 중 하나 선택
    - 이미지를 `content/campaigns/{campaignId}/shorts/images/scene_${sceneIndex+1}.jpg`로 다운로드 저장
    - 출처 정보 반환: `{ success: true, imagePath, sourceUrl, source: 'pixabay', pixabayId }`
    - HTTP 오류 또는 파싱 실패 시 `{ success: false, error }` 반환 (폴백 트리거용)

    ### fetchPollinationsImage(prompt, campaignId, sceneIndex, { apiKey?, seed? } = {}) → { success, imagePath?, sourceUrl?, error? }
    - Pollinations.ai URL 구성: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux${apiKey ? `&key=${apiKey}` : ''}${seed ? `&seed=${seed}` : ''}`
    - 이미지를 `content/campaigns/{campaignId}/shorts/images/scene_${sceneIndex+1}_ai.jpg`로 저장
    - API 키가 있으면 사용, 없으면 익명 사용 (15초당 1회 제한 인지 — 테스트에서는 mock으로 대체)
    - 반환: `{ success: true, imagePath, sourceUrl, source: 'pollinations', prompt }`
    - 실패 시 `{ success: false, error, fallbackRecommended: true }`

    ### fetchImagesForShorts(scenes, campaignId, options = {}) → images[]
    각 씬별로:
    1. 씬의 visual + dialogue에서 키워드 추출 (간단한 공백 구분 + 상위 3단어)
    2. `fetchPixabayImage(keywords, campaignId, idx)` 호출
    3. Pixabay 실패 시 `fetchPollinationsImage(scene.imagePrompt, campaignId, idx)` 호출 (generateShortsPrompts로 미리 생성된 프롬프트 사용)
    4. 둘 다 실패하면 `{ success: false, sceneIndex, reason: 'all sources failed' }` 기록
    - 순차 실행 (Pollinations.ai 익명 제한 대응). 병렬 실행 금지.
    - 반환: `{ sceneIndex, imagePath?, source, sourceUrl?, status: 'done'|'pixabay-skipped'|'pollinations-fallback'|'failed' }[]`

    ### 키워드 추출 헬퍼 (extractImageKeywords(visual, dialogue))
    - visual + dialogue 결합 텍스트에서 단순한 명사구 추출 (공백 구분 상위 단어 3~5개 + 영숫자/한글만 필터링)
    - 불용어(this, the, a, 은, 는, 이, 가, 의, 에 등) 제외
    - Pixabay 검색어로 사용 (lang=ko 지원 확인됨: STACK.md 참고)
  </action>
  <verify>
    <automated>cd /Users/twinssn/projects2/ad-script-studio && node --test test-shorts-renderer.mjs --test-name-pattern "Task2" 2>&1 | tail -30</automated>
  </verify>
  <done>
    - fetchPixabayImage, fetchPollinationsImage, fetchImagesForShorts, extractImageKeywords가 shorts-renderer.js에 추가되고 export됨
    - PIXABAY_API_KEY 없을 때 gracefully skipped 처리됨
    - Pollinations.ai 익명 제한을 인지한 순차 실행 구조임 (병렬 fetch 없음)
    - 테스트에서 mock fetch로 이미지 검색·다운로드 흐름 확인
    - template-plan.js, template-video.js 무손상 유지 (git diff 확인)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: edge-tts TTS 생성 + 렌더링 준비 완료 조립 + 카피 버튼 모듈 작성</name>
  <files>api/content/shorts-renderer.js (append), test-shorts-renderer.mjs (append)</files>
  <behavior>
    - Test 1: generateTTSForScene(dialogue, campaignId, sceneIndex)는 edge-tts로 ko-KR-SunHiNeural 음성 MP3를 생성한다 (mock/spawn 테스트)
    - Test 2: PIXABAY_API_KEY 미설정 + edge-tts 실패 시에도 render-ready.json이 생성되고, 해당 자산 상태가 'pending' 또는 'failed'로 기록된다 (partial success)
    - Test 3: assembleRenderReady(core, scenes, prompts, images, audioResults)는 render-ready.json 구조를 정확히 조립한다
    - Test 4: render-ready.json에 'renderStatus: "ready-for-moviepy"'와 'phase5Note: "moviepy 렌더링은 Phase 5에서 실행"'이 포함된다
    - Test 5: copyScene(renderReady, sceneIndex)는 해당 장면의 대본 + 프롬프트 + 경로 정보를 클립보드용 문자열로 반환한다
    - Test 6: copyAll(renderReady)는 전체 쇼츠 정보를 클립보드용 문자열로 반환한다 (장면별 구분 포함)
    - Test 7: generateShorts(core, campaignId, options)가 전체 파이프라인을 실행하고 render-ready.json을 저장한다
  </behavior>
  <read_first>
    - api/content/shorts-renderer.js (Task 1~2 결과물 — export 구조에 추가)
    - .planning/research/STACK.md (edge-tts 정보, Vercel 서버리스 제약)
    - .planning/research/PITFALLS.md (§2 edge-tts 동시 접속 제한, §4 부분 성공 처리)
  </read_first>
  <action>
    ## shorts-renderer.js에 TTS + 조립 + 카피 모듈 추가 (append)

    ### generateTTSForScene(dialogue, campaignId, sceneIndex, options = {}) → { success, audioPath?, error? }
    - edge-tts 사용 방식 결정: Vercel Serverless에서 edge-tts npm 패키지의 안정적 동작이 보장되지 않을 수 있으므로, 두 가지 실행 모드 지원:
      - **exec 모드** (기본): `child_process.execFile`로 `edge-tts` CLI 호출 (`edge-tts --text "..." --write-media 아웃풋.mp3 --voice ko-KR-SunHiNeural`). Vercel에서는 이 방식이 실패할 수 있음 — 실패 시 graceful 처리.
      - **npm 패키지 모드** (옵션): edge-tts npm 패키지를 import하여 asyncio.run()으로 실행. Vercel에서 동작하면 사용.
    - 음성: ko-KR-SunHiNeural (여성) 확정. 남성 음성 옵션(ko-KR-InJoonNeural)은 추후 확장으로 열어둠.
    - 저장 경로: `content/campaigns/{campaignId}/shorts/audio/scene_${sceneIndex+1}.mp3`
    - 길이 제한: 씬별 dialogue가 200자 초과 시 경고 로그만 남기고 진행 (edge-tts의 긴 텍스트 제한 대응, PITFALLS.md §2)
    - 실패 시: `{ success: false, error, status: 'failed' }` 반환. render-ready에 'pending' 상태 기록.

    ** 중요: Vercel Serverless 환경 감지**
    - `process.env.VERCEL` 존재 시 edge-tts exec 모드가 실패할 가능성이 높음을 로그로 경고
    - 실패해도 전체 파이프라인이 중단되지 않도록 partial success 처리

    ### assembleRenderReady(core, scenes, prompts, images, audioResults, options = {}) → renderReadyObject
    render-ready.json에 저장될 객체 조립:
    ```javascript
    {
      renderStatus: "ready-for-moviepy",  // ← 핵심: 실제 렌더링은 아직 안 됨
      phase5Note: "moviepy 렌더링은 Phase 5에서 실행. 이 파일은 렌더링에 필요한 모든 자산의 경로/프롬프트/대본 정보를 담고 있음.",
      campaignId: core.campaignId,
      createdAt: new Date().toISOString(),
      coreSnapshot: {  // 콘텐츠 코어 주요 필드 스냅샷 (추적성)
        product: { name: core.product.name, brand: core.product.brand },
        message: { concept: core.message.concept },
        purpose: { stage: core.purpose.stage }
      },
      script: {
        duration: 60,
        totalScenes: scenes.length,
        scenes: scenes.map((s, i) => ({
          sceneIndex: i,
          type: s.type,
          time: s.time,
          dialogue: s.dialogue,
          direction: s.direction,
          visual: s.visual
        }))
      },
      prompts: prompts.map(p => ({
        sceneIndex: p.sceneIndex,
        imagePrompt: p.imagePrompt,
        motionPrompt: p.motionPrompt,
        styleSuffix: p.styleSuffix
      })),
      images: images.map(img => ({
        sceneIndex: img.sceneIndex,
        status: img.status,
        localPath: img.imagePath || null,
        sourceUrl: img.sourceUrl || null,
        source: img.source || null,
        promptUsed: img.promptUsed || null
      })),
      audio: audioResults.map(a => ({
        sceneIndex: a.sceneIndex,
        status: a.success ? 'done' : 'failed',
        localPath: a.audioPath || null,
        voice: 'ko-KR-SunHiNeural',
        dialogue: a.dialogue || null
      })),
      disclosure: {
        videoSubtitle: core.legal?.disclosureText || '',  // Phase 5에서 자막으로 삽입 예정
        description: core.legal?.disclosureText || ''      // 설명란용
      },
      nextStep: {
        action: "로컬에서 scripts/shorts/render_video.py 실행 또는 Phase 5 파이프라인으로 이동",
        command: "python scripts/shorts/render_video.py --campaign-id " + core.campaignId
      }
    }
    ```

    ### saveRenderReady(renderReady, campaignId) → { success, path }
    - `content/campaigns/{campaignId}/shorts/` 디렉토리 생성
    - render-ready.json 저장 (JSON.stringify + pretty print)

    ### loadRenderReady(campaignId) → { success, data }
    - render-ready.json 읽어오기

    ### copyScene(renderReady, sceneIndex) → string
    클립보드에 복사할 텍스트 반환 (실제 navigator.clipboard 호출은 프론트엔드 책임):
    ```
    [장면 ${sceneIndex+1}] ${type} | ${time}
    대사: ${dialogue}
    연출: ${direction}
    시각: ${visual}
    이미지 프롬프트: ${imagePrompt}
    이미지 경로: ${localPath || '생성 실패'}
    오디오 경로: ${audioPath || '생성 실패'}
    ---
    ```

    ### copyAll(renderReady) → string
    전체 쇼츠 정보를 클립보드용 문자열로 반환. 장면별 구분선 포함.

    ### generateShorts(core, campaignId, options = {}) → { success, renderReady?, error? }
    전체 파이프라인 실행 (단계별 호출도 가능):
    1. validateCore(core) 검사 → 실패 시 즉시 반환
    2. generateShortsScript(core) → scenes
    3. abbreviateShortsScript(scenes, options.duration || 60) → scenes (기본 60초)
    4. parseShortsScenes(scenes) → parsedScenes
    5. generateShortsPrompts(parsedScenes, options.detailLevel || '보통') → prompts
    6. fetchImagesForShorts(parsedScenes, campaignId) → images  (⚠️ 시간 소요 — Vercel timeout 주의)
    7. generateTTSForScene() 각 씬별 호출 → audioResults (⚠️ Vercel에서 edge-tts 불안정 가능성)
    8. assembleRenderReady(...) → renderReady
    9. saveRenderReady(renderReady, campaignId) → 저장
    10. 반환: `{ success: true, renderReady, path }`

    **중요**: 6~7단계(이미지+TTS)는 시간이 소요되므로, Vercel Serverless에서 실행 시 timeout 가능성 있음.
    각 단계는 개별 export되어 로컬 스크립트에서도 단계별 호출 가능.
  </action>
  <verify>
    <automated>cd /Users/twinssn/projects2/ad-script-studio && node --test test-shorts-renderer.mjs --test-name-pattern "Task3" 2>&1 | tail -30</automated>
  </verify>
  <done>
    - generateTTSForScene, assembleRenderReady, saveRenderReady, loadRenderReady, copyScene, copyAll, generateShorts가 shorts-renderer.js에 추가되고 export됨
    - render-ready.json 구조에 renderStatus: "ready-for-moviepy"와 phase5Note가 포함됨
    - Partial success 처리: 일부 자산 실패해도 render-ready.json 생성됨
    - Vercel Serverless 환경에서 edge-tts 실패 시 graceful 처리됨
    - 카피 함수가 장면별/전체 텍스트를 정확히 반환함
    - template-plan.js, template-video.js 무손상 유지
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: 통합 E2E 테스트 — 콘텐츠 코어 → render-ready.json 전체 흐름</name>
  <files>test-shorts-renderer.mjs (append)</files>
  <behavior>
    - Test 1: 더미 콘텐츠 코어를 generateShorts()에 입력하면 render-ready.json이 생성되고 모든 필드가 올바르게 채워진다
    - Test 2: 생성된 render-ready.json을 loadRenderReady()로 읽으면 동일한 데이터가 반환된다
    - Test 3: render-ready.json의 script.scenes 길이가 7개(60초 기본)이다
    - Test 4: render-ready.json의 각 씬에 dialogue, imagePrompt, audio 상태가 포함되어 있다
    - Test 5: core.toAppState() → v1 generateScript() → core 로드하고 다시 조립한 결과가 일관된다 (v1 무손상 교차 확인)
    - Test 6: 목적 단계(purpose.stage)가 '인지'일 때와 '결정'일 때 CTA 장면 대본이 다르다
  </behavior>
  <read_first>
    - api/content/shorts-renderer.js (Task 1~3 결과물 전체)
    - api/content/core.js (loadCore, toAppState, validateCore, CORE_SCHEMA)
    - .planning/ROADMAP.md (Phase 2 Success Criteria)
  </read_first>
  <action>
    ## test-shorts-renderer.mjs에 통합 테스트 추가 (append)

    ### 더미 콘텐츠 코어 헬퍼
    ```javascript
    function makeDummyCore(overrides = {}) {
      return {
        campaignId: 'test-campaign-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: '2.0',
        source: 'user',
        product: {
          name: overrides.productName || '테스트제품',
          brand: overrides.brandName || '테스트브랜드',
          category: '테스트카테고리',
          price: '39,000원',
          competitor: '경쟁제품 A',
          trustFactors: ['특허 기술', '10만 판매']
        },
        target: {
          description: '25~35세 직장인 여성',
          painPoints: ['아침 시간이 부족해요', '피부 관리가 번거로워요']
        },
        purpose: {
          stage: overrides.stage || '인지',
          callToAction: '지금 바로 만나보세요'
        },
        message: {
          concept: overrides.concept || '간편한 아침 피부 관리',
          tone: '유쾌'
        },
        rationale: { principles: [], excludedPrinciples: [] },
        evidence: {
          reviews: ['아침마다 쓰기 편해요', '피부가 촉촉해졌어요'],
          viralScripts: [],
          researchSummary: ''
        },
        legal: {
          affiliateType: '없음',
          disclosureText: '본 콘텐츠는 제휴 마케팅의 일환으로...',
          restrictedClaims: []
        },
        niche: {
          id: 'test-niche',
          name: '테스트니치',
          version: '2.0',
          tone: {},
          restrictions: { avoidWords: [], avoidPhrases: [], claimLimits: {} },
          trust: {}
        },
        depth: { basic: {}, applied: {}, advanced: {} }
      };
    }
    ```

    ### 통합 테스트 시나리오
    1. 더미 코어 생성 (인지 단계)
    2. generateShorts(script only 모드)로 대본만 생성 → scenes 검증
    3. generateShortsPrompts로 프롬프트 생성 → prompts 검증
    4. assembleRenderReady로 조립 → renderReady 구조 검증
    5. saveRenderReady + loadRenderReady 왕복 검증
    6. 목적 단계 변경 (결정) → CTA 대사 변경 확인
    7. v1 무손상 교차 확인: core.toAppState() 결과 → v1 generateScript() 호출 결과 비교
    8. template-plan.js 원본 SCRIPT_TEMPLATE 상수 변경 없음 확인 (git 기반 또는 직접 값 검증)
  </action>
  <verify>
    <automated>cd /Users/twinssn/projects2/ad-script-studio && node --test test-shorts-renderer.mjs --test-name-pattern "Task4" 2>&1 | tail -30</automated>
  </verify>
  <done>
    - 전체 파이프라인 generateShorts()가 더미 코어로 정상 동작함 (이미지/TTS는 mock)
    - render-ready.json 구조가 ROADMAP.md Success Criteria와 일치함
    - loadRenderReady() 왕복 검증 통과
    - 목적 단계별 대본 차이 확인
    - v1 무손상 교차 확인 통과
    - template-plan.js, template-video.js 원본 무손상 (git diff 검증)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: v1 무손상 최종 검증 + 테스트 정리</name>
  <files>test-shorts-renderer.mjs (append)</files>
  <behavior>
    - Test 1: template-plan.js의 SCRIPT_TEMPLATE.totalScenes === 7, duration === 60이 변경되지 않았다
    - Test 2: template-video.js의 parseScriptToScenes, generateImagePrompt, generateAllPrompts 함수가 여전히 export되고 있다
    - Test 3: state-manager.js의 appState 객체 구조가 변경되지 않았다 (브랜드명, 제품명, 컨셉, 타겟, toneAndManner, competitorInfo, priceRange, reviewExcerpts, trustFactors, excludedKeywords, mode 필드 존재)
    - Test 4: app.js에서 generateVideoPrompts 함수가 존재하면 여전히 호출 가능하다 (v1 영상 소스 생성기 탭 무손상)
    - Test 5: core.fromAppState()와 core.toAppState() 왕복 변환 시 주요 필드가 보존된다
  </behavior>
  <read_first>
    - template-plan.js (전체 — SCRIPT_TEMPLATE 상수 변경 없음 확인)
    - template-video.js (전체 — export 함수 존재 확인)
    - state-manager.js (전체 — appState 구조 확인)
    - api/content/core.js (fromAppState, toAppState 확인)
  </read_first>
  <action>
    ## v1 무손상 검증 테스트 추가 (test-shorts-renderer.mjs에 append)

    ### 검증 방법
    각 파일 수정 여부를 확인하는 방식:
    1. 템플릿 파일들의 주요 상수/함수 시그니처가 기대값과 일치하는지 확인
    2. git diff로 실제 수정 여부 확인 (`git diff --exit-code template-plan.js template-video.js state-manager.js app.js`)
       - git 저장소에 커밋된 원본이 있어야 함. 없으면 파일 해시 또는 주요 상수 값 직접 검증으로 대체.

    ### v1 무손상 체크리스트 (테스트에서 확인)
    - [ ] template-plan.js SCRIPT_TEMPLATE.totalScenes === 7
    - [ ] template-plan.js SCRIPT_TEMPLATE.duration === 60
    - [ ] template-plan.js generateScript가 함수 타입
    - [ ] template-plan.js abbreviateScript가 함수 타입
    - [ ] template-video.js parseScriptToScenes가 함수 타입
    - [ ] template-video.js generateImagePrompt가 함수 타입
    - [ ] template-video.js generateAllPrompts가 함수 타입
    - [ ] state-manager.js appState에 brandName, productName, concept, target, toneAndManner, competitorInfo, priceRange, reviewExcerpts, trustFactors, excludedKeywords, mode 필드 존재
    - [ ] state-manager.js transferToVideoGenerator가 함수 타입 (존재 시)
    - [ ] core.fromAppState({brandName:'X', productName:'Y', concept:'Z', target:'W'}) → appState.brandName === 'X' 등 주요 필드 매핑 확인

    ### v1 무손상 위반 시 처리
    - 테스트 실패 시: 이 plan의 작업이 v1 파일을 수정했는지 확인 → 우발적 수정이면 즉시 원복
    - template-plan.js/template-video.js는 이 plan에서 절대 수정하지 않는다는 원칙을 코드와 테스트 양쪽으로 보장
  </action>
  <verify>
    <automated>cd /Users/twinssn/projects2/ad-script-studio && node --test test-shorts-renderer.mjs --test-name-pattern "Task5" 2>&1 | tail -30</automated>
  </verify>
  <done>
    - template-plan.js, template-video.js, state-manager.js, app.js 모두 v1 원본 그대로 유지됨을 테스트로 확인
    - core.fromAppState()/toAppState() 왕복 변환 검증 통과
    - git diff로 실제 파일 변경 없음 확인 (git repo 커밋된 경우)
    - Phase 2 전체가 v1을 손상시키지 않았음을 자동화 테스트로 증명
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| 경계 | 설명 |
|------|------|
| 콘텐츠 코어 → shorts-renderer | 신뢰된 입력 (Phase 1에서 validateCore로 검증됨). 그러나 loadCore()로 읽은 YAML 파싱 결과가 예상과 다를 수 있음 → shorts-renderer 내부에서 추가 방어 검증 |
| shorts-renderer → Pixabay API | 외부 신뢰 불가 경계. API 키 노출 방지, 응답 파싱 오류 처리, HTTP 상태 코드 확인 필요 |
| shorts-renderer → Pollinations.ai | 익명 제한 + 응답 불확실성. 생성 실패/지연 대응 필요 |
| shorts-renderer → edge-tts (Microsoft Edge TTS) | 비공식 서비스, SLA 없음. 실패 시 전체 파이프라인 중단하지 않도록 partial success 설계 |
| Vercel Serverless → 로컬 파일 시스템 | Vercel에서는 `/tmp`만 쓰기 가능. `content/campaigns/` 경로가 Vercel 런타임에서 실제로 쓰기 가능한지 확인 필요. 로컬 실행과 Vercel 실행을 구분해야 함 |

## STRIDE Threat Register

| 위협 ID | 카테고리 | 컴포넌트 | Disposition | 완화 계획 |
|---------|----------|----------|-------------|-----------|
| T-02-01 | 정보 유출 (Information) | Pixabay API 키 | 완화 | PIXABAY_API_KEY는 Vercel 환경변수에만 저장. 프론트엔드 노출 금지. shorts-renderer.js에서 process.env.PIXABAY_API_KEY로만 접근 |
| T-02-02 | 서비스 거부 (Denial) | Pollinations.ai 익명 제한 (15초당 1회) | 완화 | 순차 실행(기본), 이미지 실패 시 graceful degradation. 대량 생성 시 API 키 사용 권장 문서화 |
| T-02-03 | 서비스 거부 (Denial) | edge-tts Microsoft Edge 서비스 불안정 | 완화 | TTS 실패 시 render-ready.json에 'pending' 상태 기록. 전체 파이프라인 중단하지 않음. 로컬 재시도 옵션 제공 |
| T-02-04 | 권한 상승 (Elevation) | campaignId 경로 traversal | 완화 | core.js의 isValidCampaignId() 재사용. shorts-renderer.js의 모든 경로 생성 시 campaignId 검증 통과 필수 |
| T-02-05 | 변조 (Tampering) | render-ready.json 무결성 | 수용 | render-ready.json은 로컬 파이프라인 중간 파일. Phase 5에서 재검증. 디지털 서명 미적용 (Phase 2 범위 밖) |
| T-02-06 | 정보 유출 (Information) | 콘텐츠 코어 민감 정보 (price, competitor 등) | 수용 | 콘텐츠 코어는 사용자 소유 파일. Vercel 서버리스에 임시로 로드되나 로그/응답에 노출되지 않도록 주의. render-ready.json도 동일 |
| T-02-SC | 위장 (Spoofing) | npm 패키지 의존성 (edge-tts 등) | 완화 | slopcheck + 차단 인간 체크포인트. edge-tts는 인기 패키지(11k+ GitHub stars)이나, forged 패키지 가능성 상존 |
</threat_model>

<verification>
## Phase 2 전체 검증 체크리스트

### 자동화 검증
- [ ] `node --test test-shorts-renderer.mjs` 모든 테스트 통과 (Task1~5)
- [ ] `git diff template-plan.js` — 변경사항 없음
- [ ] `git diff template-video.js` — 변경사항 없음
- [ ] `git diff state-manager.js` — 변경사항 없음
- [ ] `git diff app.js` — 변경사항 없음
- [ ] `git diff index.html` — 변경사항 없음
- [ ] `git diff style.css` — 변경사항 없음
- [ ] shorts-renderer.js가 core.js의 loadCore, toAppState, validateCore를 정상 import
- [ ] template-plan.js의 generateScript, abbreviateScript가 shorts-renderer.js에서 정상 import
- [ ] template-video.js의 parseScriptToScenes, generateImagePrompt가 shorts-renderer.js에서 정상 import

### 수동 검증
- [ ] 더미 콘텐츠 코어로 generateShorts() 실행 시 render-ready.json 생성 확인
- [ ] render-ready.json 열어보고 script.scenes, prompts, images, audio, disclosure 필드 확인
- [ ] renderStatus가 "ready-for-moviepy"인지 확인
- [ ] phase5Note에 "Phase 5에서 실행" 문구가 있는지 확인
- [ ] copyScene/copyAll 함수가 올바른 문자열을 반환하는지 Node.js에서 직접 호출 확인
- [ ] PIXABAY_API_KEY 미설정 상태에서 fetchPixabayImage가 skipped 처리하는지 확인

### v1 무손상 확인 (핵심)
- [ ] v1 전략 제안서 생성기 탭(proposal)에서 기존 10개 입력 필드 정상 동작
- [ ] v1 영상 소스 생성기 탭(video)에서 template-video.js 기반 프롬프트 생성 정상 동작 (해당 탭이 존재하는 경우)
- [ ] v1 benchmark 탭이 있는 경우 정상 동작
- [ ] state-manager.js의 "2번으로 보내기" (transferToVideoGenerator) 패턴 정상 동작 (해당 함수가 존재하는 경우)
</verification>

<success_criteria>
## 측정 가능한 완료 기준

1. **스크립트 생성**: 콘텐츠 코어 입력 → 7장면 60초 대본이 생성된다. v1 template-plan.js의 SCRIPT_TEMPLATE과 generateScript()를 재사용한다 (수정하지 않음).

2. **씬 파싱 + 프롬프트**: 대본에서 씬을 파싱하여 씬별 EN 이미지 프롬프트가 생성된다. 최소 3씬, 최대 10씬 제한. 상세도('최소'/'보통'/'상세') 파라미터 지원.

3. **Pixabay 이미지**: PIXABAY_API_KEY 환경변수 설정 시 장면별 실사 이미지를 검색하고 `content/campaigns/{campaignId}/shorts/images/`에 저장한다. API 키 미설정 시 graceful skip.

4. **Pollinations.ai 이미지**: Pixabay 실패 시 Pollinations.ai(Flux)로 AI 이미지를 생성한다. 익명 15초당 1회 제한을 인지한 순차 실행.

5. **TTS**: edge-tts ko-KR-SunHiNeural로 씬별 한국어 TTS를 생성한다. Vercel Serverless에서 실패 시 partial success 처리.

6. **렌더링 준비 완료**: `content/campaigns/{campaignId}/shorts/render-ready.json`에 renderStatus: "ready-for-moviepy"와 phase5Note가 포함된다.

7. **카피 버튼**: copyScene()과 copyAll() 함수가 장면별/전체 카피 문자열을 반환한다.

8. **v1 무손상**: template-plan.js, template-video.js, state-manager.js, app.js, index.html, style.css 모두 원본 그대로 유지된다. 테스트로 확인.

9. **테스트**: test-shorts-renderer.mjs가 존재하고 `node --test test-shorts-renderer.mjs`가 모든 테스트를 통과한다.
</success_criteria>

<output>
Create `.planning/phases/02-shorts-renderer/02-01-shorts-renderer-SUMMARY.md` when done.

SUMMARY에는 다음이 포함되어야 함:
- 이 plan에서 생성된 파일 목록 (shorts-renderer.js, test-shorts-renderer.mjs)
- v1 무손상 확인 결과 (git diff / 테스트 결과)
- render-ready.json 구조 설명
- 이미지 소스 우선순위 결정 (Pixabay 우선, Pollinations 폴백)
- edge-tts Vercel 서버리스 제한 인지 및 partial success 설계 설명
- Phase 5로 이연된 항목 (moviepy 렌더링, Whisper 자막)
- 테스트 실행 명령: `node --test test-shorts-renderer.mjs`
</output>
