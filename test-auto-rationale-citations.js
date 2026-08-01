/**
 * @file test-auto-rationale-citations.js
 * @description 자동 모드 rationale의 citations 검증 (test-rationale-engine.js 로직 재사용)
 * 로컬 vercel dev 서버(http://localhost:3001/api/generate) 호출 필요
 */

// ============================================================================
// test-rationale-engine.js에서 가져온 유틸리티
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

function checkCitationAccuracy(citation, inputs) {
  const { text, sourceField } = citation;
  const originalValues = inputs[sourceField];
  
  if (!originalValues) {
    return { found: false, bestSimilarity: 0, bestMatch: '', reason: '출처 필드 없음' };
  }
  
  const valuesToCheck = Array.isArray(originalValues) ? originalValues : [originalValues];
  let bestSimilarity = 0;
  let bestMatch = '';
  
  for (const original of valuesToCheck) {
    if (!original) continue;
    
    if (text === original) {
      return { found: true, bestSimilarity: 100, bestMatch: original, reason: '정확히 일치' };
    }
    
    if (original.includes(text) || text.includes(original)) {
      const sim = calcSimilarity(text, original);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatch = original;
      }
    }
    
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
// 테스트 케이스
// ============================================================================

const TEST_CASES = [
  {
    name: '풍부한 데이터 (리뷰+신뢰요소+가격+경쟁사)',
    inputs: {
      brandName: '테스트브랜드',
      productName: '수분크림',
      concept: '건조한 피부를 위한 진정 크림',
      target: '30대 건성 피부 여성',
      toneAndManner: '신뢰감 있는',
      competitorInfo: 'A사 크림',
      priceRange: '35,000원',
      reviewExcerpts: [
        '바르고 자고 일어나면 당김이 없어요',
        '겨울에도 안 트더라고요',
        '향이 세지 않아서 좋아요'
      ],
      trustFactors: ['피부과 테스트 완료', '5만개 판매'],
      excludedKeywords: ['즉효', '완치']
    }
  },
  {
    name: '최소 데이터 (타겟만)',
    inputs: {
      brandName: '테스트브랜드',
      productName: '수분크림',
      concept: '건조한 피부를 위한 진정 크림',
      target: '30대 건성 피부 여성',
      toneAndManner: '신뢰감 있는',
      competitorInfo: '',
      priceRange: '',
      reviewExcerpts: [],
      trustFactors: [],
      excludedKeywords: []
    }
  }
];

const BASE_URL = 'https://ad-script-studio.vercel.app';

// ============================================================================
// 실행
// ============================================================================

async function runTest() {
  console.log('='.repeat(80));
  console.log('자동 모드 rationale citations 검증 테스트');
  console.log('='.repeat(80));
  console.log(`대상 서버: ${BASE_URL}/api/generate`);
  console.log('모드: auto');
  console.log('');
  
  let allPassed = true;
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📋 테스트: ${testCase.name}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: testCase.inputs, mode: 'auto' })
      });
      
      if (!response.ok) {
        const err = await response.json();
        console.log(`❌ HTTP ${response.status}: ${err.error || 'Unknown error'}`);
        allPassed = false;
        continue;
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.log(`❌ API 응답 실패: ${result.error}`);
        allPassed = false;
        continue;
      }
      
      const rationale = result.rationale || [];
      console.log(`✅ 생성된 rationale: ${rationale.length}개`);
      
      // 검증 1: citations 필드 존재
      console.log('\n--- 검증 1: citations 필드 존재 ---');
      let hasCitations = 0;
      rationale.forEach((r, i) => {
        if (Array.isArray(r.citations) && r.citations.length > 0) {
          hasCitations++;
        } else {
          console.log(`  [${i}] ${r.principleName}: citations 없음 또는 빈 배열`);
        }
      });
      console.log(`결과: ${hasCitations}/${rationale.length}개 원칙에 citations 있음`);
      
      // 검증 2: citations 구조 (text, sourceField)
      console.log('\n--- 검증 2: citations 구조 ---');
      let structOk = 0;
      rationale.forEach(r => {
        if (Array.isArray(r.citations)) {
          let ok = true;
          r.citations.forEach(c => {
            if (!c.text || !c.sourceField) ok = false;
            if (!['reviews', 'trustFactors'].includes(c.sourceField)) ok = false;
          });
          if (ok && r.citations.length > 0) structOk++;
        }
      });
      console.log(`결과: ${structOk}/${rationale.length}개 올바른 구조`);
      
      // 검증 3: 인용 정확성 (90% 이상 유사도)
      console.log('\n--- 검증 3: 인용 정확성 (90% 유사도 기준) ---');
      const inputs = testCase.inputs;
      let falseCitations = [];
      
      rationale.forEach(r => {
        if (!Array.isArray(r.citations)) return;
        r.citations.forEach(citation => {
          const validation = checkCitationAccuracy(citation, {
            reviews: inputs.reviewExcerpts || [],
            trustFactors: inputs.trustFactors || []
          });
          
          if (!validation.found) {
            falseCitations.push({
              principleName: r.principleName,
              citationText: citation.text,
              sourceField: citation.sourceField,
              bestSimilarity: validation.bestSimilarity,
              bestMatch: validation.bestMatch
            });
            console.log(`  ⚠️ [${r.principleName}] "${citation.text}" (${citation.sourceField})`);
            console.log(`      유사도: ${validation.bestSimilarity.toFixed(1)}%, 최적매치: "${validation.bestMatch}"`);
          }
        });
      });
      
      if (falseCitations.length === 0) {
        console.log('  ✅ 모든 인용이 원본과 90% 이상 일치');
      } else {
        console.log(`  ⚠️ 허위 인용 의심: ${falseCitations.length}건`);
        allPassed = false;
      }
      
      // 검증 4: usedFields와 citations sourceField 일치
      console.log('\n--- 검증 4: usedFields ↔ citations sourceField 일치 ---');
      let mismatchCount = 0;
      rationale.forEach(r => {
        if (!Array.isArray(r.citations)) return;
        const used = r.usedFields || [];
        r.citations.forEach(c => {
          if (!used.includes(c.sourceField)) {
            console.log(`  ⚠️ [${r.principleName}] citations.sourceField(${c.sourceField}) ∉ usedFields(${used.join(',')})`);
            mismatchCount++;
          }
        });
      });
      if (mismatchCount === 0) {
        console.log('  ✅ 모든 citations가 usedFields와 일치');
      } else {
        console.log(`  ⚠️ 불일치: ${mismatchCount}건`);
      }
      
      // 상세 출력
      console.log('\n--- 상세 출력 ---');
      rationale.forEach(r => {
        console.log(`[${r.principleId}] ${r.principleName} (${r.type})`);
        console.log(`  reason: ${r.reason.substring(0, 100)}...`);
        console.log(`  usedFields: [${r.usedFields.join(', ')}]`);
        console.log(`  citations: ${r.citations.map(c => `"${c.text}"(${c.sourceField})`).join(', ')}`);
        console.log('');
      });
      
    } catch (err) {
      console.log(`❌ 테스트 실행 오류: ${err.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(allPassed ? '✅ 모든 테스트 통과' : '⚠️ 일부 테스트 실패');
  console.log('='.repeat(80));
  
  process.exit(allPassed ? 0 : 1);
}

runTest();