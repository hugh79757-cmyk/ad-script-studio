/**
 * @file api/research.js
 * @description Vercel serverless function — Tavily Search API를 이용한 자동 조사
 * 
 * POST /api/research
 * Body: { brandName: string, productName: string }
 * 
 * Environment: TAVILY_API_KEY (Vercel Secret)
 * 
 * 4개 쿼리를 순차 실행:
 * 1. "{제품명} 경쟁사 제품 3개"
 * 2. "{제품명} 가격대"
 * 3. "{제품명} 리뷰 반복되는 표현"
 * 4. "{브랜드명} 수상내역 인증 판매량"
 * 
 * 신뢰도 임계값:
 * - 검색 결과에 제품명/브랜드명이 포함되지 않으면 빈 값 반환
 * - 관련 없는 검색 결과를 억지로 채우지 않음
 */

// ============================================================================
// Tavily Search API 호출
// ============================================================================

/**
 * Tavily Search API 호출
 * @param {string} query - 검색 쿼리
 * @param {string} apiKey - Tavily API 키
 * @returns {Promise<Object>} 검색 결과
 */
async function tavilySearch(query, apiKey) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
      include_raw_content: false
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tavily API 오류: ${response.status} — ${errText}`);
  }

  return response.json();
}

// ============================================================================
// 관련성 검사 — 검색 결과가 실제 제품과 관련있는지 확인
// ============================================================================

/**
 * 검색 결과가 대상 제품/브랜드와 관련있는지 확인
 * @param {Object} tavilyResult - Tavily 검색 결과
 * @param {string} productName - 제품명
 * @param {string} brandName - 브랜드명
 * @returns {boolean} 관련성 있으면 true
 */
function isRelevantResult(tavilyResult, productName, brandName) {
  const answer = (tavilyResult.answer || '').toLowerCase();
  const results = tavilyResult.results || [];
  const allText = [
    answer,
    ...results.map(r => `${r.title || ''} ${r.content || ''}`)
  ].join(' ').toLowerCase();
  
  // 제품명의 핵심 단어 추출 (2자 이상)
  const productWords = (productName || '').toLowerCase()
    .split(/[\s]+/)
    .filter(w => w.length >= 2);
  
  // 브랜드명의 핵심 단어 추출 (2자 이상)
  const brandWords = (brandName || '').toLowerCase()
    .split(/[\s]+/)
    .filter(w => w.length >= 2);
  
  const searchTerms = [...productWords, ...brandWords].filter(w => w.length > 0);
  
  if (searchTerms.length === 0) return true; // 검사할 대상 없으면 통과
  
  // 검색 결과에 검색 대상 키워드가 최소 1개 이상 포함되어야 관련성 인정
  const hasMatch = searchTerms.some(term => allText.includes(term));
  
  return hasMatch;
}

// ============================================================================
// 결과 파싱 — 검색 결과를 구조화된 데이터로 변환
// ============================================================================

/**
 * 경쟁사 정보 추출
 * @param {Object} tavilyResult - Tavily 검색 결과
 * @param {string} productName - 제품명
 * @param {string} brandName - 브랜드명
 * @returns {string} 경쟁사 정보 텍스트 (관련 없으면 빈 문자열)
 */
function parseCompetitors(tavilyResult, productName, brandName) {
  // 관련성 검사
  if (!isRelevantResult(tavilyResult, productName, brandName)) {
    console.log('[research.js] parseCompetitors: 검색 결과가 대상과 무관 — 빈 값 반환');
    return '';
  }
  
  const answer = tavilyResult.answer || '';
  const results = tavilyResult.results || [];
  
  // answer에서 경쟁사명 추출 시도
  if (answer.length > 10) {
    return answer.substring(0, 500);
  }
  
  // answer가 없으면 상위 결과 조합
  const topResults = results.slice(0, 3).map(r => {
    const title = r.title || '';
    const content = (r.content || '').substring(0, 200);
    return `${title}: ${content}`;
  }).filter(t => t.length > 5);
  
  return topResults.join('\n') || '';
}

/**
 * 가격대 정보 추출
 * @param {Object} tavilyResult - Tavily 검색 결과
 * @param {string} productName - 제품명
 * @param {string} brandName - 브랜드명
 * @returns {string} 가격대 텍스트 (관련 없으면 빈 문자열)
 */
function parsePriceRange(tavilyResult, productName, brandName) {
  // 관련성 검사
  if (!isRelevantResult(tavilyResult, productName, brandName)) {
    console.log('[research.js] parsePriceRange: 검색 결과가 대상과 무관 — 빈 값 반환');
    return '';
  }
  
  const answer = tavilyResult.answer || '';
  const results = tavilyResult.results || [];
  const allText = [answer, ...results.map(r => r.content || '')].join(' ');
  
  // 가격 패턴 매칭: "XX,XXX원", "XX만원", "$XX" 등
  const pricePatterns = allText.match(/[\d,]+원|[\d]+만원|\$[\d,]+|₩[\d,]+/g) || [];
  
  if (pricePatterns.length > 0) {
    const unique = [...new Set(pricePatterns)].slice(0, 3);
    return `검색된 가격 정보: ${unique.join(', ')}` + 
           (answer ? `\n${answer.substring(0, 300)}` : '');
  }
  
  return answer.substring(0, 500) || '';
}

/**
 * 리뷰 표현 추출
 * @param {Object} tavilyResult - Tavily 검색 결과
 * @param {string} productName - 제품명
 * @param {string} brandName - 브랜드명
 * @returns {string[]} 리뷰 발췌 배열 (관련 없으면 빈 배열)
 */
function parseReviews(tavilyResult, productName, brandName) {
  // 관련성 검사
  if (!isRelevantResult(tavilyResult, productName, brandName)) {
    console.log('[research.js] parseReviews: 검색 결과가 대상과 무관 — 빈 값 반환');
    return [];
  }
  
  const answer = tavilyResult.answer || '';
  const results = tavilyResult.results || [];
  const allText = [answer, ...results.map(r => r.content || '')].join(' ');
  
  const reviews = [];
  
  // 따옴표로 감싸진 표현 추출
  const quotedMatches = allText.match(/["「『"'][^"」』"']+["」』"']/g) || [];
  quotedMatches.forEach(match => {
    const cleaned = match.replace(/^["「『"']|["」』"']$/g, '').trim();
    if (cleaned.length > 5 && cleaned.length < 200) {
      reviews.push(cleaned);
    }
  });
  
  // 따옴표가 없으면 문장 단위로 분리하여 유용한 표현 추출
  if (reviews.length === 0) {
    const sentences = allText.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    const reviewKeywords = ['좋아요', '최고', '추천', '만족', '사용', '느낌', '후기', '평', '리뷰'];
    const reviewSentences = sentences.filter(s => 
      reviewKeywords.some(kw => s.includes(kw))
    );
    reviewSentences.slice(0, 5).forEach(s => {
      reviews.push(s.trim().substring(0, 200));
    });
  }
  
  return reviews.slice(0, 5);
}

/**
 * 브랜드 신뢰요소 추출
 * @param {Object} tavilyResult - Tavily 검색 결과
 * @param {string} productName - 제품명
 * @param {string} brandName - 브랜드명
 * @returns {string[]} 신뢰요소 배열 (관련 없으면 빈 배열)
 */
function parseTrustFactors(tavilyResult, productName, brandName) {
  // 관련성 검사 — 브랜드명 기준
  if (!isRelevantResult(tavilyResult, productName, brandName)) {
    console.log('[research.js] parseTrustFactors: 검색 결과가 대상과 무관 — 빈 값 반환');
    return [];
  }
  
  const answer = tavilyResult.answer || '';
  const results = tavilyResult.results || [];
  const allText = [answer, ...results.map(r => r.content || '')].join(' ');
  
  const factors = [];
  
  // 신뢰 키워드 매칭
  const trustPatterns = [
    /수상[^.]{0,50}/g,
    /인증[^.]{0,50}/g,
    /판매[량수][^.]{0,50}/g,
    /고객[수만][^.]{0,50}/g,
    /[1-9]\d*,?\d{3}\+\s*(고객|판매|이용)/g,
    /식약처[^.]{0,30}/g,
    /ISO[^.]{0,30}/g,
    /특허[^.]{0,30}/g,
    /추천[^.]{0,30}/g
  ];
  
  trustPatterns.forEach(pattern => {
    const matches = allText.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim().substring(0, 100);
      if (cleaned.length > 3 && !factors.includes(cleaned)) {
        factors.push(cleaned);
      }
    });
  });
  
  // answer에서 신뢰 요소 추출
  if (factors.length === 0 && answer.length > 5) {
    const sentences = answer.split(/[.!?\n]+/);
    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length > 5 && trimmed.length < 100) {
        factors.push(trimmed);
      }
    });
  }
  
  return [...new Set(factors)].slice(0, 5);
}

// ============================================================================
// 메인 핸들러
// ============================================================================

/**
 * Vercel Serverless Function 핸들러
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // API 키 확인
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'TAVILY_API_KEY가 설정되지 않았습니다. Vercel 환경변수에서 설정해주세요.',
      hint: 'https://tavily.com 에서 API 키를 발급받으세요'
    });
  }
  
  const { brandName, productName } = req.body;
  if (!brandName && !productName) {
    return res.status(400).json({ error: 'brandName 또는 productName이 필요합니다.' });
  }
  
  const target = productName || brandName;
  
  try {
    // 4개 쿼리 실행
    const queries = [
      { key: 'competitors', query: `${target} 경쟁사 제품 3개`, parser: parseCompetitors },
      { key: 'priceRange', query: `${target} 가격대`, parser: parsePriceRange },
      { key: 'reviews', query: `${target} 리뷰 반복되는 표현`, parser: parseReviews },
      { key: 'trustFactors', query: `${brandName} 수상내역 인증 판매량`, parser: parseTrustFactors }
    ];
    
    const results = {};
    const errors = [];
    const relevanceLog = [];
    
    for (const q of queries) {
      try {
        const tavilyResult = await tavilySearch(q.query, apiKey);
        const relevant = isRelevantResult(tavilyResult, productName, brandName);
        relevanceLog.push({ query: q.query, relevant });
        
        // 파서에 productName, brandName 전달하여 관련성 검사 포함
        results[q.key] = q.parser(tavilyResult, productName, brandName);
      } catch (err) {
        console.error(`[research.js] "${q.query}" 검색 실패:`, err.message);
        errors.push({ query: q.query, error: err.message });
        // 실패 시 빈 값
        const emptyVal = q.key === 'reviews' || q.key === 'trustFactors' ? [] : '';
        results[q.key] = emptyVal;
      }
    }
    
    return res.status(200).json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      relevance: relevanceLog,
      source: 'tavily'
    });
    
  } catch (error) {
    console.error('[research.js] 전체 오류:', error);
    return res.status(500).json({
      error: error.message || '자동 조사 중 오류가 발생했습니다.'
    });
  }
}
