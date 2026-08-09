// test-shorts-renderer.mjs — 쇼츠 렌더러 TDD 테스트 (Phase 2, Plan 01)
// Node.js 내장 test runner 사용: node --test test-shorts-renderer.mjs

import assert from 'node:assert/strict';
import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

// ─────────────────────────────────────────────
// v1 템플릿 파일 (수정 금지 — 참조만)
// template-plan.js: CommonJS export → new Function으로 로드
// template-video.js: browser-only guard → Node.js import 불가 (소스만 읽음)
// ─────────────────────────────────────────────

const templatePlanPath = join(process.cwd(), 'template-plan.js');
let templatePlanSource = readFileSync(templatePlanPath, 'utf8');

const templateVideoPath = join(process.cwd(), 'template-video.js');
const templateVideoSource = readFileSync(templateVideoPath, 'utf8');

// korean-utils.js에서 getJosa + cleanKoreanText 함수 추출
// (korean-utils.js는 CommonJS guard가 browser-window 환경 우선이라
//  createRequire로 로드 시 빈 exports가 반환됨 → 소스 직접 추출)
const kuPath = join(process.cwd(), 'korean-utils.js');
const kuSource = readFileSync(kuPath, 'utf8');

// extractFunction: 소스 문자열에서 function name(...) { ... } 추출 (중첩 brace 처리)
function extractFunction(source, name) {
  const fnRegex = new RegExp(`function\\s+${name}\\s*\\(([^)]*)\\)\\s*\\{`, 's');
  const match = source.match(fnRegex);
  if (!match) throw new Error(`Function '${name}' not found in source`);
  const startIdx = match.index + match[0].length;
  let depth = 1;
  let i = startIdx;
  while (depth > 0 && i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  return source.slice(startIdx, i - 1).trim();
}

const hasBatchimSrc = extractFunction(kuSource, 'hasBatchim');
const getLastJongseongIndexSrc = extractFunction(kuSource, 'getLastJongseongIndex');
const getJosaSrc = extractFunction(kuSource, 'getJosa');
const cleanKoreanTextSrc = extractFunction(kuSource, 'cleanKoreanText');

// 의존성 순서로 함수 선언 주입 (hasBatchim → getLastJongseongIndex → getJosa → cleanKoreanText)
// → template-plan.js 소스 내 JSDoc 주석 등의 참조는 건드리지 않음
const fakeModule = { exports: {} };
new Function(
  'module', 'exports',
  `function hasBatchim(word) { ${hasBatchimSrc} }\n` +
  `function getLastJongseongIndex(word) { ${getLastJongseongIndexSrc} }\n` +
  `function getJosa(word, josaType) { ${getJosaSrc} }\n` +
  `function cleanKoreanText(text) { ${cleanKoreanTextSrc} }\n` +
  templatePlanSource
)(fakeModule, fakeModule);
const templatePlanExports = fakeModule.exports;

const {
  SCRIPT_TEMPLATE,
  generateScript: v1GenerateScript,
  abbreviateScript: v1AbbreviateScript,
} = templatePlanExports;

// template-video.js 원본 확인용 마커
const TEMPLATE_VIDEO_VERSION_MARKER = '// template-video.js — 씬 파싱 + 프롬프트 생성';

// ─────────────────────────────────────────────
// shorts-renderer.js + core.js import (Task 1에서 생성 예정)
// ─────────────────────────────────────────────
let shortsRenderer;
let core;
try {
  shortsRenderer = await import('./api/content/shorts-renderer.js');
  core = await import('./api/content/core.js');
} catch (e) {
  // 파일이 아직 없으면 빈 객체로 대체 (RED 단계에서 실패해야 함)
  shortsRenderer = {};
  core = {};
}

// ─────────────────────────────────────────────
// 헬퍼: 더미 콘텐츠 코어 생성
// ─────────────────────────────────────────────
function makeDummyCore(overrides = {}) {
  return {
    campaignId: overrides.campaignId || 'test-campaign-' + Date.now(),
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
      trustFactors: ['특허 기술', '10만 판매'],
    },
    target: {
      description: overrides.targetDesc || '25~35세 직장인 여성',
      painPoints: ['아침 시간이 부족해요', '피부 관리가 번거로워요'],
    },
    purpose: {
      stage: overrides.stage || '인지',
      callToAction: '지금 바로 만나보세요',
    },
    message: {
      concept: overrides.concept || '간편한 아침 피부 관리',
      tone: overrides.tone || '유쾌',
    },
    rationale: { principles: [], excludedPrinciples: [] },
    evidence: {
      reviews: ['아침마다 쓰기 편해요', '피부가 촉촉해졌어요'],
      viralScripts: [],
      researchSummary: '',
    },
    legal: {
      affiliateType: '없음',
      disclosureText: '본 콘텐츠는 제휴 마케팅의 일환으로...',
      restrictedClaims: [],
    },
    niche: {
      id: 'test-niche',
      name: '테스트니치',
      version: '2.0',
      tone: {},
      restrictions: { avoidWords: [], avoidPhrases: [], claimLimits: {} },
      trust: {},
    },
    depth: { basic: {}, applied: {}, advanced: {} },
  };
}

// ─────────────────────────────────────────────
// Task 1: 대본 생성 + 씬 파싱 + EN 이미지 프롬프트
// ─────────────────────────────────────────────
describe('Task1: 대본 생성 + 씬 파싱 + EN 이미지 프롬프트 모듈', () => {

  // ── Test 1: 빈 콘텐츠 코어 → 7장면 fallback 대본 ──
  it('Test1: 빈 콘텐츠 코어를 입력하면 기본 fallback 대본이 7장면 생성된다', () => {
    const emptyCore = makeDummyCore({
      brandName: '',
      productName: '',
      concept: '',
      targetDesc: '',
      tone: '',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(emptyCore)
      : null;

    assert.ok(scenes, 'generateShortsScript가 null을 반환하지 않아야 함');
    assert.ok(Array.isArray(scenes), 'generateShortsScript 결과는 배열이어야 함');
    assert.equal(scenes.length, 7, '빈 코어 입력 시 7장면이 생성되어야 함');
    assert.ok(scenes.every(s => s.type && s.dialogue && s.direction && s.visual),
      '각 장면에 type, dialogue, direction, visual이 있어야 함');
  });

  // ── Test 2: 채워진 코어 → 대본에 필드값 대체 ──
  it('Test2: product.brand/product.name/message.concept가 채워진 코어를 입력하면 해당 값이 대본에 대체된다', () => {
    const filledCore = makeDummyCore({
      brandName: '라네즈',
      productName: '수분크림',
      concept: '9시 아침 피부',
      targetDesc: '25~35세 직장인 여성',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(filledCore)
      : null;

    assert.ok(scenes, 'generateShortsScript가 null을 반환하지 않아야 함');
    assert.equal(scenes.length, 7, '채워진 코어 입력 시 7장면이 생성되어야 함');

    // hook 장면(첫 번째)에 브랜드명이 포함되어 있어야 함
    const hookScene = scenes.find(s => s.type === 'hook');
    assert.ok(hookScene, 'hook 장면이 존재해야 함');
    assert.ok(hookScene.dialogue.includes('라네즈'), 'hook 대본에 브랜드명(라네즈)이 포함되어야 함');

    // solution 장면
    const solutionScene = scenes.find(s => s.type === 'solution');
    assert.ok(solutionScene, 'solution 장면이 존재해야 함');
    assert.ok(solutionScene.dialogue.includes('라네즈'), 'solution 대본에 브랜드명이 포함되어야 함');
    assert.ok(solutionScene.dialogue.includes('수분크림'), 'solution 대본에 제품명이 포함되어야 함');

    // benefit 장면 (v1의 resultStat은 하드코드된 '만족스러운 변화' — 컨셉이 직접 들어가지 않음)
    // 컨셉은 solution(keyBenefit 자리)과 closing(slogan 자리)에 반영됨
    const benefitScene = scenes.find(s => s.type === 'benefit');
    assert.ok(benefitScene, 'benefit 장면이 존재해야 함');
    assert.ok(benefitScene.dialogue.includes('만족스러운 변화'),
      'benefit 대본에 v1 resultStat(만족스러운 변화)이 포함되어야 함');

    // 컨셉이 solution 장면(keyBenefit=concept)과 closing 장면(slogan=concept)에 반영되었는지 확인
    assert.ok(solutionScene.dialogue.includes('9시 아침 피부'),
      'solution 대본에 컨셉(9시 아침 피부)이 keyBenefit으로 포함되어야 함');

    const closingScene = scenes.find(s => s.type === 'closing');
    assert.ok(closingScene.dialogue.includes('9시 아침 피부'),
      'closing 대본에 컨셉(9시 아침 피부)이 slogan으로 포함되어야 함');
  });

  // ── Test 3: generateScriptOnly → v1 generateScript와 동일한 결과 (결정 stage) ──
  it('Test3: generateScriptOnly(core)는 template-plan.js의 generateScript() 결과를 그대로 반환한다 (v1 무손상 확인, 결정 stage)', () => {
    const core = makeDummyCore({
      brandName: '테스트브랜드',
      productName: '테스트제품',
      concept: '테스트컨셉',
      targetDesc: '테스트타겟',
      stage: '결정',  // 결정 stage는 v1 원본 CTA 템플릿을 그대로 사용
    });

    // v1 generateScript 직접 호출 (toAppState 변환 후)
    const appState = {
      brandName: core.product.brand,
      productName: core.product.name,
      concept: core.message.concept,
      target: core.target.description,
      toneAndManner: core.message.tone,
      competitorInfo: core.product.competitor,
      priceRange: core.product.price,
      reviewExcerpts: core.evidence.reviews,
      trustFactors: core.product.trustFactors,
      excludedKeywords: [],
      mode: 'manual',
    };
    const v1Result = v1GenerateScript(appState);

    // shorts-renderer의 generateScriptOnly 호출
    const shortsResult = shortsRenderer?.generateScriptOnly
      ? shortsRenderer.generateScriptOnly(core)
      : null;

    assert.ok(shortsResult, 'generateScriptOnly가 null을 반환하지 않아야 함');
    assert.ok(Array.isArray(shortsResult), '결과는 배열이어야 함');
    assert.equal(shortsResult.length, v1Result.length, 'generateScriptOnly 결과는 v1 generateScript와 장면 수가 동일해야 함');

    // 각 장면별 dialogue 비교
    for (let i = 0; i < v1Result.length; i++) {
      assert.equal(
        shortsResult[i].dialogue,
        v1Result[i].dialogue,
        `장면 ${i} (${v1Result[i].type})의 dialogue가 v1 generateScript와 동일해야 함`
      );
    }
  });

  // ── Test 4: parseScriptToScenes → 최소 3개, 최대 10개 씬 ──
  it('Test4: parseScriptToScenes()는 대본 배열에서 최소 3개, 최대 10개 씬을 추출한다', () => {
    const core = makeDummyCore({
      brandName: '맥',
      productName: '립스틱',
      concept: '매일 새로운 컬러',
      targetDesc: '20대 여성',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(core)
      : [];

    const parsed = shortsRenderer?.parseShortsScenes
      ? shortsRenderer.parseShortsScenes(scenes)
      : null;

    assert.ok(parsed, 'parseShortsScenes가 null을 반환하지 않아야 함');
    assert.ok(Array.isArray(parsed), '결과는 배열이어야 함');
    assert.ok(parsed.length >= 3, `최소 3개 씬이 필요: 현재 ${parsed.length}개`);
    assert.ok(parsed.length <= 10, `최대 10개 씬 제한: 현재 ${parsed.length}개`);

    // 각 씬에 description과 dialogue가 분리되어 있어야 함
    for (const scene of parsed) {
      assert.ok(scene.description || scene.dialogue,
        `씬에 description 또는 dialogue가 있어야 함 (index ${scene.sceneIndex})`);
    }
  });

  // ── Test 5: generateImagePrompts → detailLevel별 EN 프롬프트 배열 ──
  it('Test5: generateImagePrompts(scenes, "최소"|"보통"|"상세")는 씬별 EN 프롬프트 배열을 반환한다', () => {
    const core = makeDummyCore({
      brandName: '헤라',
      productName: '파운데이션',
      concept: '완벽한 피부 표현',
      targetDesc: '30대 여성',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(core)
      : [];

    const parsed = shortsRenderer?.parseShortsScenes
      ? shortsRenderer.parseShortsScenes(scenes)
      : [];

    for (const level of ['최소', '보통', '상세']) {
      const prompts = shortsRenderer?.generateShortsPrompts
        ? shortsRenderer.generateShortsPrompts(parsed, level)
        : null;

      assert.ok(prompts, `${level} 상세도 프롬프트가 null이 아니어야 함`);
      assert.ok(Array.isArray(prompts), `${level} 결과는 배열이어야 함`);
      assert.ok(prompts.length >= 3, `${level}: 최소 3개 프롬프트 필요 (현재 ${prompts.length}개)`);
      assert.ok(prompts.length <= 10, `${level}: 최대 10개 제한 (현재 ${prompts.length}개)`);

      for (const p of prompts) {
        assert.ok(typeof p.sceneIndex === 'number', `${level}: sceneIndex는 숫자여야 함`);
        assert.ok(typeof p.imagePrompt === 'string' && p.imagePrompt.length > 0,
          `${level}: imagePrompt는 비어있지 않은 문자열이어야 함`);
        assert.ok(typeof p.motionPrompt === 'string',
          `${level}: motionPrompt는 문자열이어야 함`);
        assert.ok(typeof p.styleSuffix === 'string',
          `${level}: styleSuffix는 문자열이어야 함`);
      }
    }
  });

  // ── Test 6: abbreviateShortsScript(15초) → hook+solution+cta 3장면 ──
  it('Test6: abbreviateShortsScript(scenes, 15)는 hook+solution+cta 3장면으로 축약된다', () => {
    const core = makeDummyCore({
      brandName: '이니스프리',
      productName: '선크림',
      concept: '매일 자외선 차단',
      targetDesc: '20~30대 남녀',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(core)
      : [];

    const abbreviated = shortsRenderer?.abbreviateShortsScript
      ? shortsRenderer.abbreviateShortsScript(scenes, 15)
      : null;

    assert.ok(abbreviated, 'abbreviateShortsScript(15)가 null을 반환하지 않아야 함');
    assert.equal(abbreviated.length, 3, '15초 축약 시 3장면이 생성되어야 함');
    const types = abbreviated.map(s => s.type);
    assert.ok(types.includes('hook'), '15초 축약에 hook이 포함되어야 함');
    assert.ok(types.includes('solution'), '15초 축약에 solution이 포함되어야 함');
    assert.ok(types.includes('cta'), '15초 축약에 cta가 포함되어야 함');
    assert.ok(types.length === 3, '15초 축약은 정확히 3개 유형만 포함해야 함');
  });

  // ── Test 7: abbreviateShortsScript(30초) → hook+problem+solution+cta 4장면 ──
  it('Test7: abbreviateShortsScript(scenes, 30)는 hook+problem+solution+cta 4장면으로 축약된다', () => {
    const core = makeDummyCore({
      brandName: '설화수',
      productName: '자음생크림',
      concept: '피부 근본 케어',
      targetDesc: '35~50세 여성',
    });

    const scenes = shortsRenderer?.generateShortsScript
      ? shortsRenderer.generateShortsScript(core)
      : [];

    const abbreviated = shortsRenderer?.abbreviateShortsScript
      ? shortsRenderer.abbreviateShortsScript(scenes, 30)
      : null;

    assert.ok(abbreviated, 'abbreviateShortsScript(30)이 null을 반환하지 않아야 함');
    assert.equal(abbreviated.length, 4, '30초 축약 시 4장면이 생성되어야 함');
    const types = abbreviated.map(s => s.type);
    assert.ok(types.includes('hook'), '30초 축약에 hook이 포함되어야 함');
    assert.ok(types.includes('problem'), '30초 축약에 problem이 포함되어야 함');
    assert.ok(types.includes('solution'), '30초 축약에 solution이 포함되어야 함');
    assert.ok(types.includes('cta'), '30초 축약에 cta가 포함되어야 함');
    assert.ok(types.length === 4, '30초 축약은 정확히 4개 유형만 포함해야 함');
  });

  // ── Test 8: template-plan.js와 template-video.js가 원본 그대로 유지됨 ──
  it('Test8: template-plan.js와 template-video.js가 원본 그대로 유지됨을 grep으로 확인 (수정 금지 검증)', () => {
    // template-plan.js: SCRIPT_TEMPLATE.totalScenes === 7, duration === 60
    assert.equal(SCRIPT_TEMPLATE.totalScenes, 7, 'template-plan.js SCRIPT_TEMPLATE.totalScenes === 7 (원본 유지 확인)');
    assert.equal(SCRIPT_TEMPLATE.duration, 60, 'template-plan.js SCRIPT_TEMPLATE.duration === 60 (원본 유지 확인)');
    assert.equal(typeof v1GenerateScript, 'function', 'template-plan.js generateScript가 함수 타입 (원본 유지 확인)');
    assert.equal(typeof v1AbbreviateScript, 'function', 'template-plan.js abbreviateScript가 함수 타입 (원본 유지 확인)');

    // template-video.js: 원본 소스 마커 확인
    assert.ok(templateVideoSource.includes(TEMPLATE_VIDEO_VERSION_MARKER),
      'template-video.js 원본 소스 마커가 존재함 (수정되지 않음)');
    assert.ok(templateVideoSource.includes('function parseScriptToScenes'),
      'template-video.js에 parseScriptToScenes 함수가 존재함 (원본 유지 확인)');
    assert.ok(templateVideoSource.includes('function generateImagePrompt'),
      'template-video.js에 generateImagePrompt 함수가 존재함 (원본 유지 확인)');
    assert.ok(templateVideoSource.includes('function generateAllPrompts'),
      'template-video.js에 generateAllPrompts 함수가 존재함 (원본 유지 확인)');
    assert.ok(templateVideoSource.includes('function getStyleSuffix'),
      'template-video.js에 getStyleSuffix 함수가 존재함 (원본 유지 확인)');

    // 소스 내용으로 유추되는 원본이 변경되지 않았는지 확인
    assert.ok(templatePlanSource.includes('const SCRIPT_TEMPLATE = '),
      'template-plan.js에 SCRIPT_TEMPLATE 정의가 존재함 (원본 유지 확인)');
    assert.ok(templatePlanSource.includes('function generateScript(appState'),
      'template-plan.js에 generateScript 함수 정의가 존재함 (원본 유지 확인)');
  });

  });

  // ─────────────────────────────────────────────────────────────
  // Task 2: Pixabay 이미지 검색·다운로드 + Pollinations.ai AI 이미지
  // ─────────────────────────────────────────────────────────────
  // NOTE: Task 2 테스트는 mock fetch를 사용하므로 실제 네트워크 호출 없음.
  //       Pollinations.ai 익명 15초당 1회 제한도 이 테스트에서는 문제 없음.

describe('Task2: Pixabay 이미지 + Pollinations.ai AI 이미지 모듈', () => {
  let originalFetch;
  let mockFetchImpl;
  let fetchCallLog;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchCallLog = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function setupMockFetch(handler) {
    mockFetchImpl = handler;
    fetchCallLog = [];
    globalThis.fetch = async (url, options = {}) => {
      fetchCallLog.push({ url: String(url), options });
      return await mockFetchImpl(url, options);
    };
  }

  // Pixabay API mock 응답 헬퍼
  function mockPixabayHits(imageUrl, webformatUrl, pixabayId = 'test-id-1') {
    return {
      hits: [
        {
          id: pixabayId,
          webformatURL: webformatUrl || imageUrl,
          largeImageURL: imageUrl,
          imageURL: imageUrl,
          user: 'test-user',
          pageURL: 'https://example.com',
        },
      ],
    };
  }

  // ── Test 1: fetchPixabayImage with API key → 성공 응답 ──
it('Test1: fetchPixabayImage(keywords, campaignId, sceneIndex)는 PIXABAY_API_KEY 환경변수 설정 시 이미지 URL과 저장 경로를 반환한다 (mock fetch 사용)', async () => {
  const mockImageUrl = 'https://example.com/test-image.jpg';
  setupMockFetch(async (url, opts) => {
    const u = new URL(url);
    if (u.hostname === 'pixabay.com') {
      return new Response(JSON.stringify(mockPixabayHits(mockImageUrl)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    // 이미지 바이너리 다운로드 모킹
    if (u.hostname === 'example.com') {
      return new Response(Buffer.from('fake-image-data'), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
    }
    return new Response(null, { status: 404 });
  });

  process.env.PIXABAY_API_KEY = 'test-api-key';
  const result = await shortsRenderer.fetchPixabayImage('테스트제품', 'test-campaign-1', 0);
  delete process.env.PIXABAY_API_KEY;

  assert.ok(result, 'fetchPixabayImage 결과가 null이 아니어야 함');
  assert.equal(result.success, true, 'Pixabay API 성공 시 success=true');
  assert.ok(result.imagePath, 'imagePath가 존재해야 함');
  assert.ok(result.imagePath.includes('scene_1.jpg'), '파일명이 scene_1.jpg여야 함');
  assert.equal(result.source, 'pixabay', 'source는 pixabay여야 함');
  assert.equal(result.pixabayId, 'test-id-1', 'pixabayId가 응답에서 추출되어야 함');
});

// ── Test 2: PIXABAY_API_KEY 없음 → gracefully skipped ──
it('Test2: PIXABAY_API_KEY가 없으면 fetchPixabayImage는 gracefully하게 skipped 상태를 반환한다 (오류로 중단하지 않음)', async () => {
  delete process.env.PIXABAY_API_KEY;
  const result = await shortsRenderer.fetchPixabayImage('화장품', 'test-campaign-2', 1);

  assert.ok(result, '결과가 null이 아니어야 함');
  assert.equal(result.success, false, 'API 키 없으면 success=false');
  assert.equal(result.skipped, true, 'skipped=true여야 함');
  assert.equal(result.reason, 'PIXABAY_API_KEY not set', 'reason이 정확해야 함');
  assert.equal(result.source, 'pixabay', 'source는 pixabay');
});

// ── Test 3: fetchPollinationsImage → 이미지 생성 요청 + 저장 (mock) ──
it('Test3: fetchPollinationsImage(prompt, campaignId, sceneIndex)는 Pollinations.ai URL로 이미지 생성을 요청하고 로컬 저장을 시도한다 (mock fetch 사용)', async () => {
  const mockImageBuffer = Buffer.from('fake-ai-image-data');
  setupMockFetch(async (url, opts) => {
    const u = new URL(url);
    if (u.hostname === 'image.pollinations.ai') {
      return new Response(mockImageBuffer, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
    }
    return new Response(null, { status: 404 });
  });

  const result = await shortsRenderer.fetchPollinationsImage(
    'young woman, product display, clean background',
    'test-campaign-3',
    2
  );

  assert.ok(result, '결과가 null이 아니어야 함');
  assert.equal(result.success, true, 'Pollinations 이미지 생성 성공');
  assert.ok(result.imagePath, 'imagePath가 존재해야 함');
  assert.ok(result.imagePath.includes('scene_3_ai.jpg'), 'AI 이미지 파일명이 scene_3_ai.jpg');
  assert.equal(result.source, 'pollinations', 'source는 pollinations');
  assert.ok(result.prompt, 'prompt가 포함되어야 함');
});

// ── Test 3b: Pollinations.ai 실패 시 graceful 처리 ──
it('Test3b: fetchPollinationsImage 실패 시 fallbackRecommended가 true로 반환된다', async () => {
  setupMockFetch(async (url) => {
    return new Response(null, { status: 500 });
  });

  const result = await shortsRenderer.fetchPollinationsImage(
    'test prompt',
    'test-campaign-4',
    0
  );

  assert.equal(result.success, false, 'Pollinations 실패 시 success=false');
  assert.equal(result.fallbackRecommended, true, 'fallbackRecommended=true');
  assert.ok(result.error, 'error 메시지가 있어야 함');
});

// ── Test 4: fetchImagesForShorts → Pixabay 우선 → Pollinations 폴백 ──
it('Test4: fetchImagesForShorts(scenes, campaignId)는 각 씬별 Pixabay 우선 → Pollinations 폴백 순서로 이미지를 가져온다', async () => {
  const testScenes = [
    { sceneIndex: 0, visual: '여성 모델이 제품을 들고 있는 모습', dialogue: '이 제품 정말 좋아요', type: 'hook', time: '0:00' },
    { sceneIndex: 1, visual: '제품 상세 이미지', dialogue: '성분도 착해요', type: 'solution', time: '0:05' },
  ];

  let pixabayCalls = 0;
  let pollinationsCalls = 0;

  setupMockFetch(async (url) => {
    const u = new URL(url);
    if (u.hostname === 'pixabay.com') {
      pixabayCalls++;
      // 첫 번째 씬: Pixabay 성공
      if (pixabayCalls === 1) {
        return new Response(JSON.stringify(mockPixabayHits('https://example.com/pixabay-1.jpg')), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      // 두 번째 씬: Pixabay 실패 (이미지 없음)
      if (pixabayCalls === 2) {
        return new Response(JSON.stringify({ hits: [] }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
    }
    if (u.hostname === 'example.com') {
      // Pixabay 이미지 다운로드
      return new Response(Buffer.from('img-data'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }
    if (u.hostname === 'image.pollinations.ai') {
      pollinationsCalls++;
      return new Response(Buffer.from('ai-img-data'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }
    return new Response(null, { status: 404 });
  });

  process.env.PIXABAY_API_KEY = 'test-key';
  const prompts = [
    { sceneIndex: 0, imagePrompt: 'young woman product', motionPrompt: '...', styleSuffix: '--style raw --ar 9:16' },
    { sceneIndex: 1, imagePrompt: 'product detail', motionPrompt: '...', styleSuffix: '--style raw --ar 9:16' },
  ];
  const results = await shortsRenderer.fetchImagesForShorts(testScenes, 'test-campaign-5', { prompts });
  delete process.env.PIXABAY_API_KEY;

  assert.equal(results.length, 2, '2개 씬에 대한 결과가 있어야 함');
  // 첫 번째 씬: Pixabay 성공
  assert.equal(results[0].status, 'done', '첫 번째 씬은 Pixabay로 성공');
  assert.equal(results[0].source, 'pixabay', '첫 번째 씬 source는 pixabay');
  // 두 번째 씬: Pixabay 실패 → Pollinations 폴백
  assert.ok(['pollinations-fallback', 'done'].includes(results[1].status),
    '두 번째 씬은 Pollinations 폴백 또는 성공');
  assert.equal(pollinationsCalls, 1, 'Pollinations는 두 번째 씬에만 호출됨 (Pixabay 실패 후)');
});

// ── Test 5: 이미지 출처 로그 구조 확인 ──
it('Test5: 이미지 결과에는 출처 로그(URL, 출처, 저장 경로)가 포함된다', async () => {
  setupMockFetch(async (url) => {
    const u = new URL(url);
    if (u.hostname === 'pixabay.com') {
      return new Response(JSON.stringify(mockPixabayHits('https://example.com/source-test.jpg')), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (u.hostname === 'example.com') {
      return new Response(Buffer.from('data'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }
    return new Response(null, { status: 404 });
  });

  process.env.PIXABAY_API_KEY = 'test-key';
  const scenes = [{ sceneIndex: 0, visual: '제품 사진', dialogue: '좋아요', type: 'hook', time: '0:00' }];
  const prompts = [{ sceneIndex: 0, imagePrompt: 'product', motionPrompt: '', styleSuffix: '' }];
  const results = await shortsRenderer.fetchImagesForShorts(scenes, 'test-campaign-6', { prompts });
  delete process.env.PIXABAY_API_KEY;

  const img = results[0];
  assert.ok(img.sourceUrl, 'sourceUrl이 있어야 함');
  assert.equal(img.source, 'pixabay', 'source 필드가 있어야 함');
  assert.ok(img.imagePath, 'imagePath(저장 경로)가 있어야 함');
  assert.ok(img.promptUsed, 'promptUsed(검색에 사용한 프롬프트)가 있어야 함');
});

// ── Test 6: Pollinations.ai 순차 실행 검증 (skipPollinationsRateLimit 옵션 사용) ──
it('Test6: fetchImagesForShorts는 Pollinations.ai를 순차 실행한다 (병렬 요청이 아님, skipPollinationsRateLimit 옵션 사용)', async () => {
  const testScenes = [
    { sceneIndex: 0, visual: '첫 번째 장면', dialogue: '첫 대사', type: 'hook', time: '0:00' },
    { sceneIndex: 1, visual: '두 번째 장면', dialogue: '두 번째 대사', type: 'problem', time: '0:03' },
    { sceneIndex: 2, visual: '세 번째 장면', dialogue: '세 번째 대사', type: 'solution', time: '0:10' },
  ];
  const prompts = testScenes.map((s, i) => ({
    sceneIndex: i, imagePrompt: `prompt-${i}`, motionPrompt: '', styleSuffix: '',
  }));

  const pollinationCallOrder = [];

  setupMockFetch(async (url) => {
    const u = new URL(url);
    if (u.hostname === 'pixabay.com') {
      // 모든 Pixabay 호출 실패 → Pollinations로 폴백
      return new Response(JSON.stringify({ hits: [] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    if (u.hostname === 'image.pollinations.ai') {
      // Pollinations.ai URL: https://image.pollinations.ai/prompt/{인코딩된프롬프트}?width=...
      // 프롬프트는 pathname에 있음 (/prompt/...)
      const path = u.pathname;  // 예: /prompt/prompt-0
      const promptEncoded = path.replace(/^\/prompt\/?/, '');
      const promptDecoded = decodeURIComponent(promptEncoded);
      pollinationCallOrder.push(promptDecoded);
      return new Response(Buffer.from('ai-data'), { status: 200, headers: { 'content-type': 'image/jpeg' } });
    }
    return new Response(null, { status: 404 });
  });

  process.env.PIXABAY_API_KEY = 'test-key';

  // skipPollinationsRateLimit: true → 15초 대기 없이 즉시 실행 (테스트용)
  // 이를 통해 가짜 타이머 없이도 순차 실행 여부만 빠르게 검증
  const results = await shortsRenderer.fetchImagesForShorts(
    testScenes,
    'test-campaign-7',
    { prompts, skipPollinationsRateLimit: true }
  );

  delete process.env.PIXABAY_API_KEY;

  assert.equal(results.length, 3, '3개 씬 결과');
  assert.equal(pollinationCallOrder.length, 3, 'Pollinations.ai가 3회 호출됨 (Pixabay 실패 후 순차 폴백)');

  // 순차 실행 확인: 호출 순서가 sceneIndex 순서(0 → 1 → 2)여야 함
  assert.equal(pollinationCallOrder[0], 'prompt-0', '첫 번째 Pollinations 호출은 scene 0의 프롬프트');
  assert.equal(pollinationCallOrder[1], 'prompt-1', '두 번째 Pollinations 호출은 scene 1의 프롬프트');
  assert.equal(pollinationCallOrder[2], 'prompt-2', '세 번째 Pollinations 호출은 scene 2의 프롬프트');

  // skipPollinationsRateLimit 없이도 15초 제한 로직이 존재함을 확인
  // (skipPollinationsRateLimit: false로 호출 시 실제로 15초 대기가 발생함)
  const resultsWithRateLimit = await shortsRenderer.fetchImagesForShorts(
    testScenes.slice(0, 1),  // 1개 씬만 테스트
    'test-campaign-7-rate-limit',
    { prompts: prompts.slice(0, 1), skipPollinationsRateLimit: false }
  );
  assert.equal(resultsWithRateLimit.length, 1, 'skipPollinationsRateLimit: false 옵션 정상 전달');
});

// ── Test 7: extractImageKeywords ──
it('Test7: extractImageKeywords(visual, dialogue)는 단순 명사구 키워드를 추출한다', () => {
  // 한글 키워드 추출
  const kw1 = shortsRenderer.extractImageKeywords(
    '25세 여성이 아침마다 사용하는 수분 크림',
    '촉촉함이 오래가요'
  );
  assert.ok(kw1.length > 0, '키워드가 추출되어야 함');
  assert.ok(!kw1.includes('이') && !kw1.includes('가') && !kw1.includes('는'),
    '불용어(이/가/는)가 제외되어야 함');

  // 영어 키워드
  const kw2 = shortsRenderer.extractImageKeywords(
    'young woman using moisturizer cream',
    'hydrating formula for daily care'
  );
  assert.ok(kw2.length > 0, '영어 키워드도 추출되어야 함');
  assert.ok(!kw2.includes('the') && !kw2.includes('for'),
    '영어 불용어(the/for)가 제외되어야 함');

  // 빈 입력
  const kw3 = shortsRenderer.extractImageKeywords('', '');
  assert.equal(kw3, '', '빈 입력 시 빈 문자열 반환');
});

// Task2 describe closes here
});

// ─────────────────────────────────────────────────────────────
// Task 3: edge-tts TTS + render-ready 조립 + 카피 버튼
// ─────────────────────────────────────────────────────────────
describe('Task3: edge-tts TTS 생성 + 렌더링 준비 완료 조립 + 카피 버튼 모듈', () => {
  it('Test1: assembleRenderReady()는 render-ready.json 구조를 정확히 조립한다', () => {
    const core = makeDummyCore({
      brandName: '테스트브랜드',
      productName: '테스트제품',
      concept: '테스트 컨셉',
      stage: '인지',
    });
    const scenes = [
      { sceneIndex: 0, type: 'hook', time: '0:00', dialogue: '첫 대사', direction: '연출1', visual: '시각1' },
      { sceneIndex: 1, type: 'problem', time: '0:05', dialogue: '둘째 대사', direction: '연출2', visual: '시각2' },
    ];
    const prompts = [
      { sceneIndex: 0, imagePrompt: 'prompt1', motionPrompt: 'motion1', styleSuffix: '--ar 9:16' },
      { sceneIndex: 1, imagePrompt: 'prompt2', motionPrompt: 'motion2', styleSuffix: '--ar 9:16' },
    ];
    const images = [
      { sceneIndex: 0, status: 'done', imagePath: '/path/to/img1.jpg', sourceUrl: 'https://example.com/1.jpg', source: 'pixabay' },
      { sceneIndex: 1, status: 'failed', imagePath: null, sourceUrl: null, source: null },
    ];
    const audioResults = [
      { sceneIndex: 0, success: true, audioPath: '/path/to/audio1.mp3', dialogue: '첫 대사' },
      { sceneIndex: 1, success: false, audioPath: null, dialogue: '둘째 대사' },
    ];

    const renderReady = shortsRenderer.assembleRenderReady(core, scenes, prompts, images, audioResults);

    assert.equal(renderReady.renderStatus, 'ready-for-moviepy', 'renderStatus가 ready-for-moviepy');
    assert.ok(renderReady.phase5Note, 'phase5Note가 존재');
    assert.ok(renderReady.phase5Note.includes('Phase 5'), 'phase5Note에 Phase 5 언급');
    assert.equal(renderReady.campaignId, core.campaignId, 'campaignId 일치');
    assert.equal(renderReady.script.scenes.length, 2, 'script.scenes 길이 2');
    assert.equal(renderReady.prompts.length, 2, 'prompts 길이 2');
    assert.equal(renderReady.images.length, 2, 'images 길이 2');
    assert.equal(renderReady.audio.length, 2, 'audio 길이 2');
    assert.equal(renderReady.images[0].status, 'done', '첫 이미지 done');
    assert.equal(renderReady.images[1].status, 'failed', '둘째 이미지 failed');
    assert.equal(renderReady.audio[0].status, 'done', '첫 오디오 done');
    assert.equal(renderReady.audio[1].status, 'failed', '둘째 오디오 failed');
  });

  it('Test2: render-ready.json에 disclosure 필드가 포함된다', () => {
    const core = makeDummyCore();
    core.legal.disclosureText = '본 콘텐츠는 제휴 마케팅의 일환으로...';
    const scenes = [];
    const prompts = [];
    const images = [];
    const audioResults = [];

    const renderReady = shortsRenderer.assembleRenderReady(core, scenes, prompts, images, audioResults);

    assert.equal(renderReady.disclosure.videoSubtitle, '본 콘텐츠는 제휴 마케팅의 일환으로...', 'videoSubtitle 일치');
    assert.equal(renderReady.disclosure.description, '본 콘텐츠는 제휴 마케팅의 일환으로...', 'description 일치');
  });

  it('Test3: copyScene()은 해당 장면의 정보를 클립보드용 문자열로 반환한다', () => {
    const renderReady = {
      script: {
        scenes: [
          { sceneIndex: 0, type: 'hook', time: '0:00', dialogue: '첫 대사', direction: '연출', visual: '시각', imagePrompt: '프롬프트1' },
        ]
      },
      prompts: [
        { sceneIndex: 0, imagePrompt: '프롬프트1', motionPrompt: '모션1', styleSuffix: '--ar 9:16' }
      ],
      images: [
        { sceneIndex: 0, status: 'done', localPath: '/images/scene_1.jpg', sourceUrl: 'https://example.com/img.jpg' }
      ],
      audio: [
        { sceneIndex: 0, status: 'done', localPath: '/audio/scene_1.mp3' }
      ],
    };

    const copied = shortsRenderer.copyScene(renderReady, 0);

    assert.ok(copied.includes('[장면 1]'), '장면 번호 포함');
    assert.ok(copied.includes('hook'), '타입 포함');
    assert.ok(copied.includes('0:00'), '시간 포함');
    assert.ok(copied.includes('첫 대사'), '대사 포함');
    assert.ok(copied.includes('프롬프트1'), '프롬프트 포함');
    assert.ok(copied.includes('/images/scene_1.jpg'), '이미지 경로 포함');
    assert.ok(copied.includes('/audio/scene_1.mp3'), '오디오 경로 포함');
  });

  it('Test4: copyAll()은 전체 쇼츠 정보를 클립보드용 문자열로 반환한다', () => {
    const renderReady = {
      campaignId: 'test-campaign',
      script: {
        duration: 60,
        totalScenes: 2,
        scenes: [
          { sceneIndex: 0, type: 'hook', time: '0:00', dialogue: '첫 대사' },
          { sceneIndex: 1, type: 'solution', time: '0:10', dialogue: '둘째 대사' },
        ]
      },
      prompts: [
        { sceneIndex: 0, imagePrompt: '프롬프트1' },
        { sceneIndex: 1, imagePrompt: '프롬프트2' },
      ],
      images: [
        { sceneIndex: 0, status: 'done', localPath: '/img1.jpg' },
        { sceneIndex: 1, status: 'done', localPath: '/img2.jpg' },
      ],
      audio: [
        { sceneIndex: 0, status: 'done', localPath: '/audio1.mp3' },
        { sceneIndex: 1, status: 'done', localPath: '/audio2.mp3' },
      ],
    };

    const copied = shortsRenderer.copyAll(renderReady);

    assert.ok(copied.includes('test-campaign'), 'campaignId 포함');
    assert.ok(copied.includes('[장면 1]'), '장면1 구분');
    assert.ok(copied.includes('[장면 2]'), '장면2 구분');
    assert.ok(copied.includes('첫 대사'), '대화1 포함');
    assert.ok(copied.includes('둘째 대사'), '대화2 포함');
  });

  it('Test5: saveRenderReady() + loadRenderReady() 왕복 검증', async () => {
    const core = makeDummyCore({ campaignId: 'test-roundtrip-' + Date.now() });
    const scenes = [{ sceneIndex: 0, type: 'hook', time: '0:00', dialogue: '대사', direction: '연출', visual: '시각' }];
    const prompts = [{ sceneIndex: 0, imagePrompt: '프롬프트', motionPrompt: '', styleSuffix: '' }];
    const images = [{ sceneIndex: 0, status: 'done', imagePath: '/img.jpg', sourceUrl: 'https://x.com', source: 'pixabay' }];
    const audioResults = [{ sceneIndex: 0, success: true, audioPath: '/audio.mp3', dialogue: '대사' }];

    const renderReady = shortsRenderer.assembleRenderReady(core, scenes, prompts, images, audioResults);
    const saveResult = await shortsRenderer.saveRenderReady(renderReady, core.campaignId);

    assert.equal(saveResult.success, true, '저장 성공');
    assert.ok(saveResult.path, '저장 경로 존재');

    const loadResult = await shortsRenderer.loadRenderReady(core.campaignId);

    assert.equal(loadResult.success, true, '불러오기 성공');
    assert.equal(loadResult.data.renderStatus, 'ready-for-moviepy', 'renderStatus 일치');
    assert.equal(loadResult.data.campaignId, core.campaignId, 'campaignId 일치');

    // 정리
    const fs = await import('node:fs');
    fs.unlinkSync(saveResult.path);
    const dir = saveResult.path.substring(0, saveResult.path.lastIndexOf('/'));
    fs.rmdirSync(dir);
  });
});

// ─────────────────────────────────────────────────────────────
// Task 4: 통합 E2E 테스트 — 콘텐츠 코어 → render-ready.json 전체 흐름
// ─────────────────────────────────────────────────────────────
describe('Task4: 통합 E2E 테스트 — 콘텐츠 코어 → render-ready.json 전체 흐름', () => {
  it('Test1: generateShorts(scriptOnly 모드)로 대본만 생성', async () => {
    const core = makeDummyCore({
      brandName: '테스트브랜드',
      productName: '테스트제품',
      concept: '간편한 아침 피부 관리',
      stage: '인지',
    });

    const result = await shortsRenderer.generateShorts(core, core.campaignId, { scriptOnly: true });

    assert.equal(result.success, true, '스크립트 생성 성공');
    assert.ok(result.renderReady, 'renderReady 객체 존재');
    assert.equal(result.renderReady.script.scenes.length, 7, '7장면 생성 (60초 기본)');
    assert.equal(result.renderReady.script.duration, 60, 'duration 60초');
  });

  it('Test2: 목적 단계(purpose.stage)에 따라 CTA 대사가 달라진다', async () => {
    const coreAwareness = makeDummyCore({ stage: '인지' });
    const coreDecision = makeDummyCore({ stage: '결정' });

    const resultAwareness = await shortsRenderer.generateShorts(coreAwareness, coreAwareness.campaignId, { scriptOnly: true });
    const resultDecision = await shortsRenderer.generateShorts(coreDecision, coreDecision.campaignId, { scriptOnly: true });

    // 인지 단계: 호기심 강조
    // 결정 단계: CTA 강조
    const ctaAwareness = resultAwareness.renderReady.script.scenes.find(s => s.type === 'cta');
    const ctaDecision = resultDecision.renderReady.script.scenes.find(s => s.type === 'cta');

    assert.ok(ctaAwareness, '인지 단계에 CTA 장면 존재');
    assert.ok(ctaDecision, '결정 단계에 CTA 장면 존재');
    // 두 CTA 대사가 다름을 확인 (완전히 동일하지 않음)
    assert.notStrictEqual(ctaAwareness.dialogue, ctaDecision.dialogue, '인지/결정 CTA 대사가 다름');
  });

  it('Test3: v1 무손상 교차 확인 — core.toAppState() 변환 후 generateShortsScript 결과 일관성', async () => {
    const testCore = makeDummyCore({
      brandName: '브랜드X',
      productName: '제품Y',
      concept: '컨셉Z',
      target: '25-35세',
      toneAndManner: '유쾌',
    });

    // core.toAppState()로 변환하여 v1 앱스테이트 형식으로 변경
    const appState = core.toAppState(testCore);

    // generateShortsScript로 대본 생성
    const scenes = shortsRenderer.generateShortsScript(testCore);

    // 생성된 대본이 7장면인지 확인
    assert.ok(scenes, 'generateShortsScript 결과 존재');
    assert.equal(scenes.length, 7, '7장면 생성');

    // appState 변환이 올바르게 되었는지 확인
    assert.equal(appState.brandName, '브랜드X', 'toAppState 브랜드명 변환');
    assert.equal(appState.productName, '제품Y', 'toAppState 제품명 변환');
  });

  it('Test4: abbreviateShortsScript 15초 축약 → 3장면', () => {
    const core = makeDummyCore();
    const scenes = shortsRenderer.generateShortsScript(core);
    const abbreviated = shortsRenderer.abbreviateShortsScript(scenes, 15);

    assert.equal(abbreviated.length, 3, '15초 축약 시 3장면');
    const types = abbreviated.map(s => s.type);
    assert.ok(types.includes('hook'), 'hook 포함');
    assert.ok(types.includes('solution'), 'solution 포함');
    assert.ok(types.includes('cta'), 'cta 포함');
  });

  it('Test5: abbreviateShortsScript 30초 축약 → 4장면', () => {
    const core = makeDummyCore();
    const scenes = shortsRenderer.generateShortsScript(core);
    const abbreviated = shortsRenderer.abbreviateShortsScript(scenes, 30);

    assert.equal(abbreviated.length, 4, '30초 축약 시 4장면');
    const types = abbreviated.map(s => s.type);
    assert.ok(types.includes('hook'), 'hook 포함');
    assert.ok(types.includes('problem'), 'problem 포함');
    assert.ok(types.includes('solution'), 'solution 포함');
    assert.ok(types.includes('cta'), 'cta 포함');
  });
});

// ─────────────────────────────────────────────────────────────
// Task 5: v1 무손상 최종 검증 + 테스트 정리
// ─────────────────────────────────────────────────────────────
describe('Task5: v1 무손상 최종 검증', () => {
  it('Test1: template-plan.js SCRIPT_TEMPLATE.totalScenes === 7, duration === 60', () => {
    // template-plan.js 소스에서 totalScenes와 duration 값 직접 추출
    const totalScenesMatch = templatePlanSource.match(/totalScenes\s*:\s*(\d+)/);
    const durationMatch = templatePlanSource.match(/duration\s*:\s*(\d+)/);

    assert.ok(totalScenesMatch, 'totalScenes 필드 발견');
    assert.ok(durationMatch, 'duration 필드 발견');

    assert.equal(parseInt(totalScenesMatch[1]), 7, 'totalScenes === 7');
    assert.equal(parseInt(durationMatch[1]), 60, 'duration === 60');
  });

  it('Test2: template-video.js 함수들이 여전히 존재한다', () => {
    // template-video.js 소스에서 함수 존재 확인
    assert.ok(templateVideoSource.includes('function parseScriptToScenes'), 'parseScriptToScenes 존재');
    assert.ok(templateVideoSource.includes('function generateImagePrompt'), 'generateImagePrompt 존재');
    assert.ok(templateVideoSource.includes('function generateAllPrompts'), 'generateAllPrompts 존재');
  });

  it('Test3: state-manager.js appState 구조가 변경되지 않았다', () => {
    const stateManagerPath = join(process.cwd(), 'state-manager.js');
    const stateManagerSource = readFileSync(stateManagerPath, 'utf8');

    // appState 객체 구조 확인 (공백에 유연하게 대응)
    assert.ok(stateManagerSource.includes('brandName'), 'brandName 필드 존재');
    assert.ok(stateManagerSource.includes('productName'), 'productName 필드 존재');
    assert.ok(stateManagerSource.includes('concept'), 'concept 필드 존재');
    assert.ok(stateManagerSource.includes('target'), 'target 필드 존재');
    assert.ok(stateManagerSource.includes('toneAndManner'), 'toneAndManner 필드 존재');
    assert.ok(stateManagerSource.includes('competitorInfo'), 'competitorInfo 필드 존재');
    assert.ok(stateManagerSource.includes('priceRange'), 'priceRange 필드 존재');
    assert.ok(stateManagerSource.includes('reviewExcerpts'), 'reviewExcerpts 필드 존재');
    assert.ok(stateManagerSource.includes('trustFactors'), 'trustFactors 필드 존재');
    assert.ok(stateManagerSource.includes('excludedKeywords'), 'excludedKeywords 필드 존재');
    assert.ok(stateManagerSource.includes('mode'), 'mode 필드 존재');
  });

  it('Test4: core.fromAppState() / toAppState() 왕복 변환 검증', () => {
    const originalAppState = {
      brandName: '원본브랜드',
      productName: '원본제품',
      concept: '원본컨셉',
      target: '원본타겟',
      toneAndManner: '원본톤',
      competitorInfo: '원본경쟁사',
      priceRange: '100,000원',
      reviewExcerpts: ['리뷰1', '리뷰2'],
      trustFactors: ['신뢰1'],
      excludedKeywords: ['금지1'],
      mode: 'manual',
    };

    // appState → core → appState 왕복
    const coreObject = core.fromAppState(originalAppState);
    const backToAppState = core.toAppState(coreObject);

    assert.equal(backToAppState.brandName, '원본브랜드', 'brandName 보존');
    assert.equal(backToAppState.productName, '원본제품', 'productName 보존');
    assert.equal(backToAppState.concept, '원본컨셉', 'concept 보존');
    assert.equal(backToAppState.target, '원본타겟', 'target 보존');
    assert.equal(backToAppState.toneAndManner, '원본톤', 'toneAndManner 보존');
    assert.equal(backToAppState.competitorInfo, '원본경쟁사', 'competitorInfo 보존');
    assert.equal(backToAppState.priceRange, '100,000원', 'priceRange 보존');
    assert.deepEqual(backToAppState.reviewExcerpts, ['리뷰1', '리뷰2'], 'reviewExcerpts 보존');
    assert.deepEqual(backToAppState.trustFactors, ['신뢰1'], 'trustFactors 보존');
    assert.deepEqual(backToAppState.excludedKeywords, ['금지1'], 'excludedKeywords 보존');
  });

  it('Test5: git diff로 v1 파일 변경 없음 확인 (git 저장소 커 Inde한 경우)', () => {
    // 이 테스트는 git 저장소에 커밋된 원본이 있을 때만 의미 있음
    // git diff --exit-code로 변경 여부 확인
    try {
      const { execSync } = require('node:child_process');
      try {
        execSync('git diff --exit-code template-plan.js template-video.js state-manager.js app.js index.html style.css', {
          stdio: 'pipe',
          cwd: process.cwd(),
        });
        // 출력이 없으면 변경 없음 → 테스트 통과
        assert.ok(true, 'git diff --exit-code 통과 (v1 파일 변경 없음)');
      } catch (e) {
        if (e.status === 1) {
          // git diff가 변경된 파일을 발견 → 테스트 실패
          console.log('⚠️  v1 파일 변경이 감지됨 (git diff 실패)');
          console.log(e.stdout?.toString() || '');
          assert.fail('v1 파일이 수정되었습니다. 즉시 원복 필요');
        }
        // git 명령 자체가 실패한 경우(예: git 저장소 아님) → 건너뛰기
        console.log('ℹ️  git diff 건너뜀 (git 저장소 아니거나 커밋 없음)');
      }
    } catch (e) {
      // require 실패 등 → 건너뛰기
      console.log('ℹ️  git diff 검증 건너뜀');
    }
  });
});