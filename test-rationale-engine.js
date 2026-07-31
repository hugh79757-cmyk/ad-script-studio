/**
 * @file test-rationale-engine.js
 * @description rationale-engine.js 검증 테스트 (그라운딩 + 인용 정확성 검증)
 */

// ============================================================================
// 유틸리티 함수
// ============================================================================

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]!==b[j-1]?1:0));
  return dp[m][n];
}

function calcSimilarity(a, b) {
  if (a === b) return 100;
  if (!a.length || !b.length) return 0;
  return ((Math.max(a.length, b.length) - levenshteinDistance(a, b)) / Math.max(a.length, b.length)) * 100;
}

function avgSimilarity(arr) {
  let t = 0, c = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) { t += calcSimilarity(arr[i].reason, arr[j].reason); c++; }
  return c ? t / c : 0;
}

function hasTag(r) { return /\(근거:\s*[가-힣,\s]+\)/.test(r); }

function extractFields(r) {
  const m = r.match(/\(근거:\s*([가-힣,\s]+)\)/);
  return m ? m[1].split(',').map(s => s.trim()) : [];
}

function labelToKey(l) {
  return { '타겟':'target','컨셉':'concept','리뷰 발췌':'reviews','가격대':'price','경쟁사':'competitor','브랜드 신뢰요소':'trustFactors' }[l] || l;
}

function stateToInputs(s) {
  return { target: s.target||'', concept: s.concept||'', reviews: s.reviewExcerpts||[],
           price: s.priceRange||'', competitor: s.competitorInfo||'', trustFactors: s.trustFactors||[] };
}

/**
 * 인용 텍스트가 원본 입력값에 존재하는지 검사 (90% 이상 유사도)
 */
function checkCitationAccuracy(citation, inputs) {
  const { text, sourceField } = citation;
  const originalValues = inputs[sourceField];
  
  if (!originalValues) {
    return { found: false, bestSimilarity: 0, bestMatch: '', reason: '출처 필드 없음' };
  }
  
  // 배열인 경우 각 요소와 비교
  const valuesToCheck = Array.isArray(originalValues) ? originalValues : [originalValues];
  
  let bestSimilarity = 0;
  let bestMatch = '';
  
  for (const original of valuesToCheck) {
    if (!original) continue;
    
    // 정확히 일치
    if (text === original) {
      return { found: true, bestSimilarity: 100, bestMatch: original, reason: '정확히 일치' };
    }
    
    // 포함 관계 검사
    if (original.includes(text) || text.includes(original)) {
      const sim = calcSimilarity(text, original);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = original;
      }
    }
    
    // 유사도 검사
    const sim = calcSimilarity(text, original);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = original;
    }
  }
  
  return {
    found: bestSimilarity >= 90,
    bestSimilarity,
    bestMatch,
    reason: bestSimilarity >= 90 ? '90% 이상 유사' : '유사도 부족'
  };
}

// ============================================================================
// rationale-engine.js 로드
// ============================================================================

const fs = require('fs');
const path = require('path');
const engineSrc = fs.readFileSync(path.join(__dirname, 'rationale-engine.js'), 'utf8');

const safeSrc = engineSrc.replace(
  /if\s*\(typeof module[\s\S]*?module\.exports\s*=\s*\{[\s\S]*?\}\s*;\s*\}/m,
  '/* module.exports skipped for eval */'
);
eval(safeSrc);

// ============================================================================
// 테스트 데이터
// ============================================================================

const base = { brandName:'테스트브랜드', productName:'수분크림', concept:'건조한 피부를 위한 진정 크림',
               target:'30대 건성 피부 여성', toneAndManner:'신뢰감 있는' };

const caseA = { ...base, competitorInfo:'A사 크림', priceRange:'35000원',
  reviewExcerpts:['바르고 자고 일어나면 당김이 없어요','겨울에도 안 트더라고요','향이 세지 않아서 좋아요'],
  trustFactors:['피부과 테스트 완료','5만개 판매'], excludedKeywords:['즉효','완치'] };

const caseB = { ...base, competitorInfo:'', priceRange:'', reviewExcerpts:[], trustFactors:[], excludedKeywords:[] };

// ============================================================================
// 실행
// ============================================================================

console.log('='.repeat(80));
console.log('RATIONALE ENGINE 검증 테스트 (그라운딩 + 인용 정확성)');
console.log('='.repeat(80));

const resultA = generateRationaleManually(caseA);
const resultB = generateRationaleManually(caseB);
const rA = resultA.generated;
const rB = resultB.generated;
const skippedA = resultA.skipped;
const skippedB = resultB.skipped;
const inA = stateToInputs(caseA);
const inB = stateToInputs(caseB);

const totalPrinciples = PRINCIPLES.length;

// ============================================================================
// 검증 0: 케이스 A 생성/스킵 현황
// ============================================================================

console.log(`\n📊 케이스 A 생성 현황: ${totalPrinciples}개 중 ${rA.length}개 생성, ${skippedA.length}개 스킵`);

if (skippedA.length > 0) {
  console.log('\n  스킵된 원칙 목록:');
  skippedA.forEach(s => {
    console.log(`    - [${s.principleId}] ${s.principleName} (${s.type}): ${s.reason}`);
  });
}

// 5개 이상 스킵 시 requiredInputs 검토
if (skippedA.length >= 5) {
  console.log(`\n⚠️ 케이스 A에서 ${skippedA.length}개 원칙 스킵됨 (5개 이상)`);
  console.log('  → requiredInputs 조건이 너무 엄격한지 검토 필요:');
  
  const skipReasons = {};
  skippedA.forEach(s => {
    const key = s.reason;
    if (!skipReasons[key]) skipReasons[key] = [];
    skipReasons[key].push(s.principleName);
  });
  
  Object.entries(skipReasons).forEach(([reason, principles]) => {
    console.log(`\n  원인: ${reason}`);
    console.log(`  해당 원칙: ${principles.join(', ')}`);
    console.log('  검토: 이 원칙들의 필수 조건을 OR로 완화할 수 있는지 확인');
  });
}

console.log(`\n📊 케이스 B 생성 현황: ${totalPrinciples}개 중 ${rB.length}개 생성, ${skippedB.length}개 스킵`);

// ============================================================================
// 검증 1: 인용 태그
// ============================================================================

console.log('\n--- 검증 1: 인용 태그 ---');
let tagOk = 0;
rA.forEach(r => { if (hasTag(r.reason)) { tagOk++; } else { console.log(`  [✗] ${r.principleName}`); } });
console.log(`결과: ${tagOk}/${rA.length}`);

// ============================================================================
// 검증 2: 원칙 제외
// ============================================================================

console.log('\n--- 검증 2: 케이스 B 원칙 제외 ---');
const excluded = rA.filter(a => !rB.find(b => b.principleId === a.principleId));
console.log(`제외: ${excluded.length}개`);
excluded.forEach(e => console.log(`  - ${e.principleName} (${e.type})`));

// ============================================================================
// 검증 3: 허위 근거
// ============================================================================

console.log('\n--- 검증 3: 허위 근거 ---');
let falseG = 0;
rA.forEach(r => {
  const fields = extractFields(r.reason).map(labelToKey);
  const bad = fields.filter(f => { const v = inA[f]; return Array.isArray(v) ? !v.length : !v; });
  if (bad.length) { falseG++; console.log(`  [✗] ${r.principleName}: ${bad.join(',')}`); }
});
console.log(`허위 근거: ${falseG}개`);

// ============================================================================
// 검증 4: 리뷰 허위 인용 (케이스 B)
// ============================================================================

console.log('\n--- 검증 4: 케이스 B 리뷰 허위 인용 ---');
let falseR = 0;
rB.forEach(r => {
  const fields = extractFields(r.reason).map(labelToKey);
  if (fields.includes('reviews') && !inB.reviews.length) { falseR++; console.log(`  [✗] ${r.principleName}`); }
});
console.log(`리뷰 허위 인용: ${falseR}개`);

// ============================================================================
// 검증 5: 인용 정확성 (citations 필드 기반 검증)
// ============================================================================

console.log('\n--- 검증 5: 인용 정확성 (citations 필드 검증) ---');
console.log('  기준: citations의 텍스트가 원본 입력값과 90% 이상 유사해야 함');

let falseCitationCount = 0;
const falseCitations = [];

rA.forEach(r => {
  if (!r.citations || r.citations.length === 0) return;
  
  r.citations.forEach(citation => {
    const result = checkCitationAccuracy(citation, inA);
    
    if (!result.found) {
      falseCitationCount++;
      falseCitations.push({
        principleName: r.principleName,
        citationText: citation.text,
        sourceField: citation.sourceField,
        bestSimilarity: result.bestSimilarity,
        bestMatch: result.bestMatch,
        reason: result.reason
      });
      console.log(`  ⚠️ 허위 인용 의심: ${r.principleName} - "${citation.text}" (출처: ${citation.sourceField}, 유사도: ${result.bestSimilarity.toFixed(1)}%)`);
    }
  });
});

if (falseCitationCount === 0) {
  console.log('  ✅ 모든 인용이 원본과 일치');
} else {
  console.log(`\n  ⚠️ 허위 인용 의심: ${falseCitationCount}건`);
}

// ============================================================================
// 검증 6: 유사도
// ============================================================================

console.log('\n--- 검증 6: 유사도 ---');
const sim = avgSimilarity(rA);
console.log(`평균 유사도: ${sim.toFixed(1)}% (목표: 40% 이하)`);
console.log(sim <= 40 ? '✅ 목표 달성' : '⚠️ 미달성');

// ============================================================================
// 상세 출력
// ============================================================================

console.log('\n=== 케이스 A 상세 ===');
rA.forEach(r => {
  console.log(`[${r.principleId}] ${r.principleName}`);
  console.log(`  근거: ${r.reason}`);
  if (r.citations && r.citations.length > 0) {
    console.log(`  인용: ${r.citations.map(c => `"${c.text}" (${c.sourceField})`).join(', ')}`);
  }
});

console.log('\n=== 케이스 B 상세 ===');
rB.forEach(r => {
  console.log(`[${r.principleId}] ${r.principleName}`);
  console.log(`  근거: ${r.reason}`);
  if (r.citations && r.citations.length > 0) {
    console.log(`  인용: ${r.citations.map(c => `"${c.text}" (${c.sourceField})`).join(', ')}`);
  }
});

// ============================================================================
// 최종 판정
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('🎯 최종 판정');
console.log('='.repeat(80));

const allTagsOk = tagOk === rA.length;
const noFalseGrounding = falseG === 0;
const noFalseReview = falseR === 0;
const noFalseCitation = falseCitationCount === 0;
const exclusionWorks = excluded.length > 0;
const similarityOk = sim <= 40;

console.log(`\n  인용 태그: ${allTagsOk ? '✅' : '❌'} (${tagOk}/${rA.length})`);
console.log(`  허위 근거: ${noFalseGrounding ? '✅' : '❌'} (${falseG}개)`);
console.log(`  리뷰 허위 인용: ${noFalseReview ? '✅' : '❌'} (${falseR}개)`);
console.log(`  인용 정확성: ${noFalseCitation ? '✅' : '⚠️'} (${falseCitationCount}건 의심)`);
console.log(`  원칙 제외: ${exclusionWorks ? '✅' : '❌'} (${excluded.length}개 제외)`);
console.log(`  유사도: ${similarityOk ? '✅' : '❌'} (${sim.toFixed(1)}%)`);

const allPass = allTagsOk && noFalseGrounding && noFalseReview && noFalseCitation && exclusionWorks && similarityOk;
console.log(`\n  ${allPass ? '✅ 그라운딩 규칙 + 인용 정확성 검증 완료' : '⚠️ 일부 미충족'}`);
console.log('='.repeat(80));
