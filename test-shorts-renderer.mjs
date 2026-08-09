// test-shorts-renderer.mjs — 쇼츠 렌더러 TDD 테스트 (Phase 2, Plan 01)
// Node.js 내장 test runner 사용: node --test test-shorts-renderer.mjs

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
// shorts-renderer.js import (Task 1에서 생성 예정)
// ─────────────────────────────────────────────
let shortsRenderer;
try {
  shortsRenderer = await import('./api/content/shorts-renderer.js');
} catch (e) {
  // 파일이 아직 없으면 빈 객체로 대체 (RED 단계에서 실패해야 함)
  shortsRenderer = {};
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

  // ── Test 3: generateScriptOnly → v1 generateScript와 동일한 결과 ──
  it('Test3: generateScriptOnly(core)는 template-plan.js의 generateScript() 결과를 그대로 반환한다 (v1 무손상 확인)', () => {
    const core = makeDummyCore({
      brandName: '테스트브랜드',
      productName: '테스트제품',
      concept: '테스트컨셉',
      targetDesc: '테스트타겟',
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
