/**
 * test-content-core.mjs — 콘텐츠 코어 통합 검증 테스트
 *
 * Covers:
 * 1. 저장 테스트 (saveCore)
 * 2. 불러오기 테스트 (loadCore)
 * 3. 목록 조회 테스트 (listCampaigns)
 * 4. 검증 테스트 (validateCore)
 * 5. 변환 테스트 (fromAppState / toAppState)
 * 6. v1 무손상 확인 (git diff)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import {
  createCampaignDir,
  saveCore,
  loadCore,
  listCampaigns,
  validateCore,
  CORE_SCHEMA,
  fromAppState,
  toAppState,
  generateId
} from './api/content/core.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  assert(ok, `${message} — 기대: ${JSON.stringify(expected)}, 실제: ${JSON.stringify(actual)}`);
}

function assertDeepEqual(actual, expected, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${message} — 기대: ${JSON.stringify(expected)}, 실제: ${JSON.stringify(actual)}`);
}

// ─────────────────────────────────────────────
// 테스트용 임시 디렉토리 설정
// ─────────────────────────────────────────────

const TEST_CAMPAIGNS_DIR = './content/campaigns';

// 테스트 시작 전 정리
function cleanupTestDirs() {
  const ids = ['test-campaign-001', 'test-campaign-002', 'test-campaign-003'];
  for (const id of ids) {
    try { rmSync(`./content/campaigns/${id}`, { recursive: true, force: true }); } catch {}
  }
}

// ─────────────────────────────────────────────
// 시나리오 1: 저장 테스트
// ─────────────────────────────────────────────

console.log('\n【시나리오 1】 저장 테스트');
console.log('─────────────────────────────────────');

cleanupTestDirs();

const testCoreData = {
  campaignId: 'test-campaign-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: '2.0',
  source: 'user',
  product: {
    name: '테스트제품',
    brand: '테스트브랜드',
    category: '전자기기',
    price: '39,000원',
    competitor: '경쟁사A',
    trustFactors: ['식약처인증', '국내제조']
  },
  target: {
    description: '25-35세 직장인 여성',
    painPoints: ['시간 부족', '예산 제한']
  },
  purpose: {
    stage: '인지',
    callToAction: '무료 체험 신청'
  },
  message: {
    concept: '일상을 바꾸는 간편 솔루션',
    tone: '유쾌'
  },
  rationale: {
    principles: [],
    excludedPrinciples: []
  },
  evidence: {
    reviews: [' 정말 좋아요', '강추합니다'],
    viralScripts: [],
    researchSummary: '시장 조사 결과 요약'
  },
  legal: {
    affiliateType: '없음',
    disclosureText: '',
    restrictedClaims: ['싼', '저렴한']
  },
  niche: {
    id: 'pending',
    name: '테스트니치',
    version: '2.0'
  },
  depth: {
    basic: { angle: '처음 접하는 사용자를 위한 소개' },
    applied: { angle: '비교 검토 중인 사용자를 위한 정보' },
    advanced: { angle: '구매 결정 직전 사용자를 위한 설득' }
  }
};

// 1-1. saveCore 호출 → 성공 응답 확인
console.log('1-1. saveCore 정상 호출');
const saveResult = saveCore('test-campaign-001', testCoreData);
assertEqual(saveResult.success, true, 'saveCore 성공 여부');
assert(saveResult.path.includes('test-campaign-001'), 'saveCore 경로 포함 campaignId');
assert(saveResult.path.includes('core.yaml'), 'saveCore 경로 포함 core.yaml');

// 1-2. 저장된 파일 존재 확인
console.log('1-2. 저장된 파일 존재 확인');
const savedFilePath = `./content/campaigns/test-campaign-001/core.yaml`;
assert(existsSync(savedFilePath), 'content/campaigns/test-campaign-001/core.yaml 파일 존재');

// 1-3. 파일 내용이 YAML 포맷인지 확인 (키 존재)
console.log('1-3. YAML 포맷 확인');
const rawContent = readFileSync(savedFilePath, 'utf8');
assert(rawContent.includes('campaignId:'), '파일에 campaignId 키 존재');
assert(rawContent.includes('product:'), '파일에 product 키 존재');
assert(rawContent.includes('purpose:'), '파일에 purpose 키 존재');
assert(rawContent.includes('인지'), '파일에 purpose.stage 값 인지 존재');

// 1-4. path traversal 거부 확인
console.log('1-4. Path traversal 거부');
const traversalResult = saveCore('../evil', { campaignId: '../evil' });
assertEqual(traversalResult.success, false, 'Path traversal(../) 저장 거부');
assert(traversalResult.error.includes('Invalid campaignId'), 'Path traversal 오류 메시지');

const slashResult = saveCore('dir/name', { campaignId: 'dir/name' });
assertEqual(slashResult.success, false, '슬래시 포함 campaignId 저장 거부');

// ─────────────────────────────────────────────
// 시나리오 2: 불러오기 테스트
// ─────────────────────────────────────────────

console.log('\n【시나리오 2】 불러오기 테스트');
console.log('─────────────────────────────────────');

// 2-1. 저장한 캠페인 불러오기 → 원본과 동일한지 확인
console.log('2-1. 저장한 캠페인 불러오기');
const loadResult = loadCore('test-campaign-001');
assertEqual(loadResult.success, true, 'loadCore 성공 여부');
assertDeepEqual(loadResult.data.campaignId, 'test-campaign-001', '불러온 campaignId');
assertDeepEqual(loadResult.data.product.name, '테스트제품', '불러온 product.name');
assertDeepEqual(loadResult.data.purpose.stage, '인지', '불러온 purpose.stage');
assertDeepEqual(loadResult.data.message.tone, '유쾌', '불러온 message.tone');
assertDeepEqual(loadResult.data.evidence.reviews, [' 정말 좋아요', '강추합니다'], '불러온 evidence.reviews');
assertDeepEqual(loadResult.data.depth.basic, { angle: '처음 접하는 사용자를 위한 소개' }, '불러온 depth.basic');

// 2-2. 존재하지 않는 캠페인 불러오기 → 오류 반환 확인
console.log('2-2. 존재하지 않는 캠페인 불러오기');
const missingResult = loadCore('nonexistent-campaign');
assertEqual(missingResult.success, false, '존재하지 않는 캠페인 loadCore 실패');
assert(missingResult.error.includes('not found'), '존재하지 않는 캠페인 오류 메시지');

// 2-3. 잘못된 YAML 파일 처리 (수동 생성) — 실제로는 js-yaml이 유연하게 파싱하므로
//       진짜 파싱 오류를 일으키는 입력으로 테스트
console.log('2-3. 잘못된 YAML 처리 (파싱 예외)');
mkdirSync('./content/campaigns/bad-yaml', { recursive: true });
writeFileSync('./content/campaigns/bad-yaml/core.yaml', '[unclosed bracket', 'utf8');
const badYamlResult = loadCore('bad-yaml');
assertEqual(badYamlResult.success, false, '잘못된 YAML 파싱 실패');
assert(badYamlResult.error.toLowerCase().includes('error') || badYamlResult.error.toLowerCase().includes('parse'), '잘못된 YAML 파싱 오류 메시지');
rmSync('./content/campaigns/bad-yaml', { recursive: true, force: true });

// ─────────────────────────────────────────────
// 시나리오 3: 목록 조회 테스트
// ─────────────────────────────────────────────

console.log('\n【시나리오 3】 목록 조회 테스트');
console.log('─────────────────────────────────────');

// 3-1. 2개 이상 캠페인 저장 후 목록 조회
console.log('3-1. 다중 캠페인 저장 후 목록 조회');
saveCore('test-campaign-002', { ...testCoreData, campaignId: 'test-campaign-002' });
saveCore('test-campaign-003', { ...testCoreData, campaignId: 'test-campaign-003' });

const listResult = listCampaigns();
assertEqual(listResult.success, true, 'listCampaigns 성공 여부');
assert(Array.isArray(listResult.campaigns), 'listCampaigns 결과 배열');
assert(listResult.campaigns.includes('test-campaign-001'), '목록에 test-campaign-001 포함');
assert(listResult.campaigns.includes('test-campaign-002'), '목록에 test-campaign-002 포함');
assert(listResult.campaigns.includes('test-campaign-003'), '목록에 test-campaign-003 포함');
assertEqual(listResult.campaigns.length >= 3, true, '최소 3개 캠페인 목록에 존재');

// ─────────────────────────────────────────────
// 시나리오 4: 검증 테스트 (validateCore)
// ─────────────────────────────────────────────

console.log('\n【시나리오 4】 검증 테스트');
console.log('─────────────────────────────────────');

// 4-1. 필수 필드 누락 시 검증 실패
console.log('4-1. 필수 필드 누락 검증');
const incompleteCore = {
  campaignId: 'partial',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
  // product, target, message, purpose, niche 등 필수 필드 누락
};
const incompleteResult = validateCore(incompleteCore);
assertEqual(incompleteResult.valid, false, '필수 필드 누락 시 검증 실패');
assert(incompleteResult.errors.length > 0, '필수 필드 누락 시 errors 배열 존재');
assert(incompleteResult.errors.some(e => e.includes('product.name')), 'product.name 누락 감지');
assert(incompleteResult.errors.some(e => e.includes('product.brand')), 'product.brand 누락 감지');

// 4-2. purpose.stage 잘못된 값 검증
console.log('4-2. purpose.stage 잘못된 값 검증');
const badStageCore = {
  campaignId: 'bad-stage',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: '2.0',
  product: { name: 'P', brand: 'B' },
  target: { description: 'T' },
  message: { concept: 'C', tone: 'T' },
  purpose: { stage: '삭제', callToAction: '' },
  niche: { id: 'N', name: 'N', version: '2.0' },
  depth: { basic: {}, applied: {}, advanced: {} }
};
const badStageResult = validateCore(badStageCore);
assertEqual(badStageResult.valid, false, '잘못된 purpose.stage 검증 실패');
assert(badStageResult.errors.some(e => e.includes('purpose.stage')), 'purpose.stage 오류 감지');

// 4-3. purpose.stage 올바른 값 검증
console.log('4-3. purpose.stage 올바른 값 검증 (인지/고려/결정)');
for (const stage of ['인지', '고려', '결정']) {
  const validCore = {
    ...badStageCore,
    purpose: { stage, callToAction: '' }
  };
  const result = validateCore(validCore);
  assertEqual(result.valid, true, `purpose.stage=${stage} 검증 통과`);
}

// 4-4. depth.basic이 객체가 아닌 문자열이면 검증 실패
console.log('4-4. depth 구조 타입 검증');
const badDepthCore = {
  campaignId: 'bad-depth',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: '2.0',
  product: { name: 'P', brand: 'B' },
  target: { description: 'T' },
  message: { concept: 'C', tone: 'T' },
  purpose: { stage: '인지', callToAction: '' },
  niche: { id: 'N', name: 'N', version: '2.0' },
  depth: { basic: '문자열안됨', applied: {}, advanced: {} }
};
const badDepthResult = validateCore(badDepthCore);
assertEqual(badDepthResult.valid, false, 'depth.basic 문자열 검증 실패');
assert(badDepthResult.errors.some(e => e.includes('depth.basic')), 'depth.basic 타입 오류 감지');

// 4-5. 정상 코어 검증 통과
console.log('4-5. 정상 코어 검증 통과');
const validCore = {
  campaignId: 'valid-core',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: '2.0',
  source: 'user',
  product: { name: '제품', brand: '브랜드', trustFactors: ['인증'] },
  target: { description: '타겟', painPoints: ['고민1'] },
  purpose: { stage: '고려', callToAction: '구매' },
  message: { concept: '컨셉', tone: '유쾌' },
  rationale: { principles: [], excludedPrinciples: [] },
  evidence: { reviews: ['리뷰1'], viralScripts: [], researchSummary: '' },
  legal: { affiliateType: '없음', disclosureText: '', restrictedClaims: [] },
  niche: { id: 'nic1', name: '니치', version: '2.0' },
  depth: { basic: { a: 1 }, applied: {}, advanced: {} }
};
const validResult = validateCore(validCore);
assertEqual(validResult.valid, true, '정상 코어 검증 통과');
assertEqual(validResult.errors.length, 0, '정상 코어 errors 없음');

// ─────────────────────────────────────────────
// 시나리오 5: 변환 테스트 (fromAppState / toAppState)
// ─────────────────────────────────────────────

console.log('\n【시나리오 5】 변환 테스트');
console.log('─────────────────────────────────────');

// 5-1: 빈 appState → 코어 변환
console.log('5-1. 빈 appState → 코어 변환');
const emptyState = {
  brandName: '', productName: '', concept: '', target: '', toneAndManner: '',
  competitorInfo: '', priceRange: '', reviewExcerpts: [], trustFactors: [], excludedKeywords: []
};
const coreFromEmpty = fromAppState(emptyState);
assertEqual(coreFromEmpty.product.brand, '', '빈 appState → product.brand 빈 문자열');
assertEqual(coreFromEmpty.product.name, '', '빈 appState → product.name 빈 문자열');
assertEqual(coreFromEmpty.message.concept, '', '빈 appState → message.concept 빈 문자열');
assertEqual(coreFromEmpty.target.description, '', '빈 appState → target.description 빈 문자열');
assertEqual(coreFromEmpty.message.tone, '진지', '빈 appState → message.tone 기본값 진지');
assertEqual(coreFromEmpty.product.competitor, '', '빈 appState → product.competitor 빈 문자열');
assertEqual(coreFromEmpty.product.price, '', '빈 appState → product.price 빈 문자열');
assert(Array.isArray(coreFromEmpty.evidence.reviews), '빈 appState → evidence.reviews 배열');
assertEqual(coreFromEmpty.evidence.reviews.length, 0, '빈 appState → evidence.reviews 빈 배열');
assert(Array.isArray(coreFromEmpty.product.trustFactors), '빈 appState → product.trustFactors 배열');
assertEqual(coreFromEmpty.product.trustFactors.length, 0, '빈 appState → product.trustFactors 빈 배열');
assert(Array.isArray(coreFromEmpty.legal.restrictedClaims), '빈 appState → legal.restrictedClaims 배열');
assertEqual(coreFromEmpty.legal.restrictedClaims.length, 0, '빈 appState → legal.restrictedClaims 빈 배열');
assertEqual(coreFromEmpty.purpose.stage, '인지', '빈 appState → purpose.stage 기본값 인지');
assert(typeof coreFromEmpty.depth.basic === 'object', '빈 appState → depth.basic 객체');
assert(typeof coreFromEmpty.depth.applied === 'object', '빈 appState → depth.applied 객체');
assert(typeof coreFromEmpty.depth.advanced === 'object', '빈 appState → depth.advanced 객체');
assertEqual(coreFromEmpty.niche.id, 'pending', '빈 appState → niche.id 기본값 pending');
assertEqual(coreFromEmpty.schemaVersion, '2.0', '빈 appState → schemaVersion 2.0');

// 5-2: 값 있는 appState → 코어 변환
console.log('5-2. 값 있는 appState → 코어 변환');
const filledState = {
  brandName: '테스트브랜드',
  productName: '테스트제품',
  concept: '핵심컨셉',
  target: '25-35세 여성',
  toneAndManner: '유쾌',
  competitorInfo: '경쟁사A',
  priceRange: '39,000원',
  reviewExcerpts: ['좋아요', '강추'],
  trustFactors: ['식약처인증'],
  excludedKeywords: ['싼', '저렴한']
};
const coreFromFilled = fromAppState(filledState);
assertEqual(coreFromFilled.product.brand, '테스트브랜드', 'brandName → product.brand 매핑');
assertEqual(coreFromFilled.product.name, '테스트제품', 'productName → product.name 매핑');
assertEqual(coreFromFilled.message.concept, '핵심컨셉', 'concept → message.concept 매핑');
assertEqual(coreFromFilled.target.description, '25-35세 여성', 'target → target.description 매핑');
assertEqual(coreFromFilled.message.tone, '유쾌', 'toneAndManner → message.tone 매핑');
assertEqual(coreFromFilled.product.competitor, '경쟁사A', 'competitorInfo → product.competitor 매핑');
assertEqual(coreFromFilled.product.price, '39,000원', 'priceRange → product.price 매핑');
assertEqual(coreFromFilled.evidence.reviews.length, 2, 'reviewExcerpts → evidence.reviews 길이');
assertEqual(coreFromFilled.evidence.reviews[0], '좋아요', 'reviewExcerpts[0] 매핑');
assertEqual(coreFromFilled.evidence.reviews[1], '강추', 'reviewExcerpts[1] 매핑');
assertEqual(coreFromFilled.product.trustFactors.length, 1, 'trustFactors → product.trustFactors 길이');
assertEqual(coreFromFilled.product.trustFactors[0], '식약처인증', 'trustFactors[0] 매핑');
assertEqual(coreFromFilled.legal.restrictedClaims.length, 2, 'excludedKeywords → legal.restrictedClaims 길이');
assertEqual(coreFromFilled.legal.restrictedClaims[0], '싼', 'excludedKeywords[0] 매핑');
assertEqual(coreFromFilled.legal.restrictedClaims[1], '저렴한', 'excludedKeywords[1] 매핑');

// 5-3: toAppState 역변환
console.log('5-3. toAppState 역변환');
const backToState = toAppState(coreFromFilled);
assertEqual(backToState.brandName, '테스트브랜드', 'toAppState brandName');
assertEqual(backToState.productName, '테스트제품', 'toAppState productName');
assertEqual(backToState.concept, '핵심컨셉', 'toAppState concept');
assertEqual(backToState.target, '25-35세 여성', 'toAppState target');
assertEqual(backToState.toneAndManner, '유쾌', 'toAppState toneAndManner');
assertEqual(backToState.competitorInfo, '경쟁사A', 'toAppState competitorInfo');
assertEqual(backToState.priceRange, '39,000원', 'toAppState priceRange');
assertEqual(backToState.reviewExcerpts.length, 2, 'toAppState reviewExcerpts 길이');
assertEqual(backToState.reviewExcerpts[0], '좋아요', 'toAppState reviewExcerpts[0]');
assertEqual(backToState.trustFactors.length, 1, 'toAppState trustFactors 길이');
assertEqual(backToState.trustFactors[0], '식약처인증', 'toAppState trustFactors[0]');
assertEqual(backToState.excludedKeywords.length, 2, 'toAppState excludedKeywords 길이');
assertEqual(backToState.mode, 'manual', 'toAppState mode 기본값 manual');

// 5-4: 왕복 변환 (fromAppState → toAppState) 주요 필드 일치 확인
console.log('5-4. 왕복 변환 주요 필드 일치');
const roundTrip = toAppState(fromAppState(filledState));
assertEqual(roundTrip.brandName, filledState.brandName, '왕복 brandName');
assertEqual(roundTrip.productName, filledState.productName, '왕복 productName');
assertEqual(roundTrip.concept, filledState.concept, '왕복 concept');
assertEqual(roundTrip.target, filledState.target, '왕복 target');
assertEqual(roundTrip.toneAndManner, filledState.toneAndManner, '왕복 toneAndManner');
assertEqual(roundTrip.competitorInfo, filledState.competitorInfo, '왕복 competitorInfo');
assertEqual(roundTrip.priceRange, filledState.priceRange, '왕복 priceRange');
assertDeepEqual(roundTrip.reviewExcerpts, filledState.reviewExcerpts, '왕복 reviewExcerpts');
assertDeepEqual(roundTrip.trustFactors, filledState.trustFactors, '왕복 trustFactors');
assertDeepEqual(roundTrip.excludedKeywords, filledState.excludedKeywords, '왕복 excludedKeywords');

// 5-5: fromAppState 결과물이 validateCore를 통과하는지 (구조적으로는 유효)
console.log('5-5. fromAppState 결과물 validateCore 검사');
const coreFromApp = fromAppState(filledState);
// niche.name이 'pending'이 아닌 빈 문자열('')로 설정되어 있어 검증 오류 발생
// (niche.id는 'pending'이지만 niche.name은 ''이므로 필수 필드 누락)
const validationResult = validateCore(coreFromApp);
assertEqual(validationResult.valid, false, 'fromAppState 결과물 validateCore 실패 (niche.name 빈 값)');
assert(validationResult.errors.some(e => e.includes('niche.name')), 'niche.name 누락 감지');

// ─────────────────────────────────────────────
// 시나리오 6: v1 무손상 확인
// ─────────────────────────────────────────────

console.log('\n【시나리오 6】 v1 무손상 확인');
console.log('─────────────────────────────────────');

const v1Files = ['index.html', 'app.js', 'state-manager.js'];
let v1Undamaged = true;

for (const file of v1Files) {
  try {
    const diff = execSync(`git diff --quiet HEAD -- ${file}`, { cwd: './' }).toString();
    // diff가 비어있으면 변경 없음
    console.log(`  ✓ ${file}: 변경 없음 (git diff 청정)`);
  } catch {
    // diff가 있으면 오류 발생
    v1Undamaged = false;
    console.error(`  ✗ ${file}: 변경 감지됨!`);
  }
}

assert(v1Undamaged, 'v1 파일(index.html, app.js, state-manager.js) 무손상');

// v1 파일에 콘텐츠 코어 관련 코드 중복 없음 확인
for (const file of v1Files) {
  const content = readFileSync(file, 'utf8');
  const hasCoreCode = content.includes('fromAppState') || content.includes('toAppState') || content.includes('CORE_SCHEMA');
  assert(!hasCoreCode, `${file}에 콘텐츠 코어 코드 중복 없음`);
}

// ─────────────────────────────────────────────
// 결과 출력
// ─────────────────────────────────────────────

console.log('\n─────────────────────────────────────');
console.log(`테스트 결과: ${passed} 통과 / ${failed} 실패 / ${passed + failed} 전체`);
console.log('─────────────────────────────────────');

if (failures.length > 0) {
  console.error('\n실패 상세:');
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
}

// 테스트용 디렉토리 정리
cleanupTestDirs();

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✓ 모든 테스트 통과');
  process.exit(0);
}
