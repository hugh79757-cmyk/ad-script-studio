/**
 * @file api/generate.js
 * @description Vercel serverless function — 무료 우선 5단계 폴백으로 LLM 호출
 * 
 * POST /api/generate
 * Body: { inputs: { brandName, productName, concept, target, toneAndManner,
 *                    competitorInfo, priceRange, reviewExcerpts, trustFactors, excludedKeywords },
 *         mode: "auto" | "manual" }
 * 
 * Provider Chain (무료 우선):
 * 1. NVIDIA NIM: nvidia/nemotron-3-ultra-550b-a55b (NVIDIA_API_KEY)
 * 2. OpenCode Zen: nemotron-3-ultra-free (OPENCODE_API_KEY)
 * 3. OpenCode Zen: deepseek-v4-flash-free (OPENCODE_API_KEY)
 * 4. OpenCode Zen: mimo-v2.5-free (OPENCODE_API_KEY)
 * 5. Paid DeepSeek: deepseek-v4-flash (DEEPSEEK_API_TOKEN)
 */

// ============================================================================
// 분석 Provider 체인 설정 (무료 우선 폴백)
// ============================================================================

const ANALYSIS_PROVIDERS = [
  { name: 'nvidia-nim', baseUrl: 'https://integrate.api.nvidia.com/v1', apiKeyEnv: 'NVIDIA_API_KEY', model: 'nvidia/nemotron-3-ultra-550b-a55b', free: true },
  { name: 'zen-nemotron', baseUrl: 'https://opencode.ai/zen/v1', apiKeyEnv: 'OPENCODE_API_KEY', model: 'nemotron-3-ultra-free', free: true },
  { name: 'zen-deepseek-free', baseUrl: 'https://opencode.ai/zen/v1', apiKeyEnv: 'OPENCODE_API_KEY', model: 'deepseek-v4-flash-free', free: true },
  { name: 'zen-mimo', baseUrl: 'https://opencode.ai/zen/v1', apiKeyEnv: 'OPENCODE_API_KEY', model: 'mimo-v2.5-free', free: true },
  { name: 'deepseek-paid', baseUrl: 'https://api.deepseek.com/v1', apiKeyEnv: 'DEEPSEEK_API_TOKEN', model: 'deepseek-v4-flash', free: false }
];

// ============================================================================
// 전역 데드라인 / provider 타임아웃 상수 (2026-08-01 추가)
// ============================================================================
// 배경: fetch()에 타임아웃이 없어 AI provider가 hang되면 Vercel maxDuration(300s)까지
// 무기한 대기 후 강제 종료됨 (실측: 프로덕션 E2E 1차 시도 240s에서 멈춤).
// 반면 정상 성공 케이스도 75~126s가 걸리는 경우가 있어(느린 무료 티어 provider),
// 고정된 짧은 타임아웃(예: 30s)은 정상 응답을 오탐으로 끊어 폴백 체인을 낭비한다.
// → 남은 예산(remainingMs)과 provider별 상한(PER_PROVIDER_CAP_MS) 중 작은 값을
//   각 fetch의 타임아웃으로 동적 적용한다.

/** Vercel maxDuration=300s 기준, 여유분을 두어 260s까지 시도 */
const GLOBAL_DEADLINE_MS = 260_000;
/** 남은 예산이 이 값 미만이면 fetch를 시도하지 않고 즉시 다음 provider로 */
const MIN_ATTEMPT_MS = 15_000;
/** 한 provider가 아무리 느려도 이 값을 넘길 수 없음 (관찰된 정상 지연 최대 126s 여유분) */
const PER_PROVIDER_CAP_MS = 150_000;

// ============================================================================
// 26 마케팅 원칙 (shortform-copywriting.md 기반)
// ============================================================================

const MARKETING_PRINCIPLES = `
## 숏폼 광고 카피라이팅 26원칙

### 섹션 1: 훅(Hook) 작성 원칙 (1-1~1-9)

1-1. 첫 3초가 광고의 존재를 결정한다 — 훅은 시각 액션, VO 첫 말, 캡션 텍스트 세 가지의 동시 조합. 세 슬롯이 같은 말을 하면 낭비(no-duplication rule). 무음 시청을 전제로 캡션은 필수.

1-2. 호기심 갭(Curiosity gap) — 핵심 명사를 숨겨 정보의 공백으로 끝까지 보게 한다(Zeigarnik 효과). 반드시 광고 안에서 해소되어야 함(해소 안 하면 클릭베이트→CVR 손해).

1-3. 대담한 주장(Bold claim) — 구체적이고 반증 가능하게. 막연한 수사("최고", "혁신적")는 신뢰 실패. 구체성은 신뢰를 만들고, 모호함은 신뢰를 죽인다.

1-4. 1인칭 고백(First-person confession) — 살아있는 디테일(lived-in detail) 없으면 가짜로 읽힌다. 직접 경험에서 나온 숫자·장면·감정을 넣을 것.

1-5. 대조 / 전후(Contrast / before-after) — 두 상태를 첫 비트에 보여줘 변화를 뚜렷하게 인지시킨다. 건강·뷰티·금융 등 규제 영역은 플랫폼 정책 확인 필요.

1-6. 공감 / POV — 초구체적 상황을 미러링. "POV: 3시인데 네 번째 커피"처럼 특정성 자체가 메커니즘. 일반적 POV는 눈에 보이지 않음.

1-7. 증거 우선(Proof-first) — 영수증·결과 화면을 맨 앞에. 스스로 자랑하는 결과가 가장 강한 사회적 증거.

1-8. 훅 다양성 — 세그먼트 × 동기 매트릭스로 써라. 서로 다른 훅은 서로 다른 시청자 집단에 도달.

1-9. 15~30초 영상 구조 — 훅(0~3초) → 온램프(3~15초) → 해결(15~25초) → CTA(25~30초).

### 섹션 2: CTA(Call To Action) 문구 패턴 (2-1~2-7)

2-1. 약한 CTA를 버리고 "행동 동사 + 받는 것" 공식 — [Action Verb] + [What They Get] + [Qualifier if needed].

2-2. 하나의 CTA, 단일 행동 — Hick's Law에 따라 선택지가 늘면 결정 시간 증가·이탈 증가.

2-3. 긴급성·희소성은 "진짜일 때만" — 진짜가 아닌 긴급성은 한 번 들통나면 신뢰 붕괴.

2-4. 대화형 CTA — 하드셀 대신 대화형으로 전달. "코드 FREEPACK 입력하면 첫 팩 무료"가 효과적.

2-5. 사회적 증거와 CTA 결합 — [대담한 주장] → [증거] → [긴급성 있는 CTA] 순서.

2-6. 위험 제거(risk reversal) — 환불 보장·무료 체험·무약정으로 CTA 마찰 제거.

2-7. 영상은 단일 CTA 라인으로 끝내라 — 마지막 비트는 CTA 한 줄로 마무리.

### 섹션 3: 심리적 트리거 (3-1~3-10)

3-1. 고객보다 "더 잘" 문제를 말하기 — ① 고객보다 정확하게 문제를 말하고 ② "그거 딱 내 상황" 인식을 만들고 ③ 무행동 비용을 암시.

3-2. 욕망을 만들지 말고, 이미 있는 욕망·공포를 채널링하라 — 새로운 욕망 만들기 실패, 기존 통증·공포·욕망에 연결하는 카피가 전환됨.

3-3. 손실 회피 프레이밍 — "얻는 것"보다 "놓치는 것"이 약 2배 강하게 작동(Prospect Theory).

3-4. 통증을 정확한 숫자로 구체화하라 — 구체적·정확한 디테일은 신뢰를 만들고, 모호한 주장은 죽인다.

3-5. 질문형 문제 제시 — 고객이 검색창에 입력하는 바로 그 질문을 묻는 것이 가장 강한 훅.

3-6. "Stop [통증]. Start [즐거움]." 구조 — 통증 제거와 욕구 충족을 한 문장에 대조 배치.

3-7. 사회적 증거로 문제의 보편성을 증명하라 — "많은 사람이 같은 문제를 겪었다"는 증거. 발명은 금지, 실제 리뷰·수치만 사용.

3-8. 현상 유지(무행동) 자체를 문제로 제시하라 — 가장 큰 경쟁자는 경쟁사가 아닌 현상 유지. 무행동의 결과를 구체화.

3-9. 동기는 리뷰·댓글에서 그대로 가져와라 — 리뷰·댓글 원문 언어가 마케터 의역보다 항상 잘 통함. 발명된 주장·통계·증언은 금지.

3-10. 정체성 욕망 활용 — "되고 싶은 나"를 문제 제시 단계부터 그려주면 동기가 완성됨.

### 공통 적용 규칙
- 모든 주장·수치·증언은 실제 데이터(리뷰, 판매 기록, 테스트 결과)에서 가져올 것. 발명은 금지.
- 캡션은 무음 시청 전제. 화면 텍스트는 한 번에 2줄 이하·줄당 3~5단어.
- 무성 오토플레이 고려. 브랜드/상품명은 화면(포스터·캡션)에도 넣을 것.
- 테스트 우선순위: 훅/앵글(영향 최대) → 헤드라인 → 핵심 혜택 → CTA → 보조 증거.
`.trim();

// ============================================================================
// 시스템 프롬프트 구성
// ============================================================================

/**
 * 시스템 프롬프트 생성 — 26원칙 + 사용자 입력값 컨텍스트
 * @param {Object} inputs - 사용자 입력값
 * @returns {string} 시스템 프롬프트
 */
function buildSystemPrompt(inputs) {
  const inputContext = buildInputContext(inputs);

  return `당신은 숏폼(15~60초) 광고 전문 카피라이터입니다.
아래 26개 마케팅 원칙을 반드시 적용하여 전략 제안서를 작성합니다.

${MARKETING_PRINCIPLES}

---

## 사용자 제공 데이터

${inputContext}

---

## 출력 형식

아래 JSON 구조로 출력하십시오:

{
  "strategy": {
    "overview": "전략 개요 (2~3문장)",
    "targetAudience": "타겟 고객 분석",
    "keyMessage": "핵심 메시지",
    "toneAndManner": "톤앤매너 분석",
    "competitorAnalysis": "경쟁사 분석 (제공된 경우)",
    "differentiation": "차별화 포인트"
  },
  "script": {
    "duration": "60",
    "scenes": [
      {
        "time": "0-3초",
        "type": "훅",
        "dialogue": "대사",
        "direction": "연출지시"
      }
    ]
  },
  "rationale": [
    {
      "principleId": "원칙 번호 (예: 1-1)",
      "principleName": "원칙 이름",
      "type": "TYPE_HOOK | TYPE_CTA | TYPE_PSYCH",
      "reason": "이 제품에 이 원칙이 필요한 이유 (근거 필드 포함)",
      "groundingTag": "근거: [사용된 필드명]",
      "usedFields": ["target", "reviews"],
      "example": "구현 예시 문자열",
      "citations": [
        { "text": "리뷰/신뢰요소 원문 중 인용한 부분", "sourceField": "reviews | trustFactors" }
      ]
    }
  ]
}

중요:
- 모든 근거는 반드시 제공된 입력값에 기반할 것 (허위 근거 금지)
- **rationale 배열은 반드시 1개 이상 포함할 것** (입력값이 적어도 target/concept/toneAndManner 기반으로 최소 3개 원칙 적용)
- 입력값이 없는 필드는 해당 원칙을 rationale에서 제외할 것
- 대사는 한국어로 작성
- 연출지시는 구체적이고 실행 가능한 수준으로
- 각 씬은 시각(비주얼), 음성(VO), 캡션을 별도로 기술
- **각 rationale 항목에 반드시 citations 배열을 포함하고, reason에서 인용한 리뷰/신뢰요소 원문의 출처(sourceField: reviews 또는 trustFactors)를 명시할 것**
- **citations 배열의 각 항목은 반드시 독립된 객체여야 하며, 한 객체에 하나의 인용만 포함할 것**
- **sourceField는 오직 "reviews" 또는 "trustFactors"만 허용됨** (target, concept, price 등 다른 필드는 인용 금지)
- citations의 text는 원본 입력값(reviewExcerpts 배열 요소 또는 trustFactors 배열 요소)에서 **그대로 복사**할 것 (의역/생성/요약/결합 금지)
- **리뷰/신뢰요소가 없는 경우 citations는 빈 배열 []로 둘 것** (다른 필드 인용으로 대체 금지)
`;
}

/**
 * 사용자 입력값을 시스템 프롬프트에 주입할 텍스트로 변환
 * @param {Object} inputs - 사용자 입력값
 * @returns {string} 입력 컨텍스트 텍스트
 */
function buildInputContext(inputs) {
  const lines = [];
  
  if (inputs.brandName) lines.push(`- 브랜드명: ${inputs.brandName}`);
  if (inputs.productName) lines.push(`- 제품명: ${inputs.productName}`);
  if (inputs.concept) lines.push(`- 컨셉: ${inputs.concept}`);
  if (inputs.target) lines.push(`- 타겟: ${inputs.target}`);
  if (inputs.toneAndManner) lines.push(`- 톤앤매너: ${inputs.toneAndManner}`);
  if (inputs.competitorInfo) lines.push(`- 경쟁사/차이점: ${inputs.competitorInfo}`);
  if (inputs.priceRange) lines.push(`- 가격대: ${inputs.priceRange}`);
  if (inputs.reviewExcerpts && inputs.reviewExcerpts.length > 0) {
    lines.push(`- 리뷰 발췌:`);
    inputs.reviewExcerpts.forEach(r => lines.push(`  - "${r}"`));
  }
  if (inputs.trustFactors && inputs.trustFactors.length > 0) {
    lines.push(`- 브랜드 신뢰요소: ${inputs.trustFactors.join(', ')}`);
  }
  if (inputs.excludedKeywords && inputs.excludedKeywords.length > 0) {
    lines.push(`- 제외키워드: ${inputs.excludedKeywords.join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : '(입력값 없음)';
}

// ============================================================================
// 사용자 프롬프트 생성
// ============================================================================

/**
 * 사용자 프롬프트 생성 — Claude에 전달할 최종 요청
 * @param {Object} inputs - 사용자 입력값
 * @param {string} mode - "auto" | "manual"
 * @returns {string} 사용자 프롬프트
 */
function generateUserPrompt(inputs, mode = 'auto') {
  const productName = inputs.productName || '제품';
  const brandName = inputs.brandName || '브랜드';
  
  return `다음 제품에 대한 숏폼 광고 전략 제안서를 작성해주세요.

제품: ${brandName}의 ${productName}
타겟: ${inputs.target || '일반 소비자'}
컨셉: ${inputs.concept || '(미제공)'}
톤앤매너: ${inputs.toneAndManner || '(미선택)'}

${inputs.competitorInfo ? `경쟁 제품 정보: ${inputs.competitorInfo}` : ''}
${inputs.priceRange ? `가격대: ${inputs.priceRange}` : ''}
${inputs.reviewExcerpts && inputs.reviewExcerpts.length > 0
    ? `고객 리뷰:\n${inputs.reviewExcerpts.map(r => `- "${r}"`).join('\n')}`
    : ''}
${inputs.trustFactors && inputs.trustFactors.length > 0
    ? `신뢰 요소: ${inputs.trustFactors.join(', ')}`
    : ''}
${inputs.excludedKeywords && inputs.excludedKeywords.length > 0
    ? `사용 금지 키워드: ${inputs.excludedKeywords.join(', ')}`
    : ''}

위 정보를 바탕으로:
1. 전략 개요 (타겟 분석, 핵심 메시지, 차별화 포인트)
2. 60초 숏폼 광고 대본 (5~7개 씬, 각 씬에 시간/타입/대사/연출지시)
3. 당위성 근거 (어떤 원칙을 왜 적용했는지, 입력값 기반으로만)

반드시 JSON 형식으로 출력해주세요.`;
}

// ============================================================================
// API 응답 파싱 (Claude + OpenAI 호환)
// ============================================================================

/**
 * LLM API 응답에서 구조화된 결과 추출 (Anthropic + OpenAI 호환)
 * @param {Object} data - API 응답 (Anthropic 또는 OpenAI 호환)
 * @param {Object} inputs - 사용자 입력값 (citations 보완용)
 * @returns {Object} 파싱된 결과
 */
function parseApiResponse(data, inputs = {}) {
  // Anthropic: content[0].text
  // OpenAI 호환: choices[0].message.content
  let text = data.content?.[0]?.text || '';
  
  if (!text) {
    const choice = data.choices?.[0];
    const msg = choice?.message || {};
    text = msg.content || '';
  }
  
  // JSON 블록 추출 시도
  let parsed = null;
  
  // ```json ... ``` 블록 추출
  const jsonBlockMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) {
    try {
      parsed = JSON.parse(jsonBlockMatch[1]);
    } catch (e) {
      // 파싱 실패 시 전체 텍스트 시도
    }
  }
  
  // 직접 JSON 파싱 시도
  if (!parsed) {
    try {
      // JSON 시작/끝 탐지
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      }
    } catch (e) {
      // 파싱 실패
    }
  }
  
  // 파싱 성공 시 구조화된 결과 반환
  if (parsed && parsed.strategy && parsed.script) {
    // rationale을 수동 모드 포맷으로 정규화 (inputs 전달로 citations 보완)
    const normalizedRationale = normalizeRationale(parsed.rationale || [], inputs);
    return {
      success: true,
      strategy: parsed.strategy,
      script: parsed.script,
      rationale: normalizedRationale,
      rawText: text,
      model: data.model,
      usage: data.usage
    };
  }
  
  // 파싱 실패 시 원시 텍스트 반환
  return {
    success: false,
    rawText: text,
    model: data.model,
    usage: data.usage,
    error: '응답을 JSON으로 파싱할 수 없습니다.'
  };
}

/**
 * LLM rationale 출력을 수동 모드 포맷으로 정규화
 * @param {Array} rationale - LLM이 반환한 rationale 배열
 * @param {Object} inputs - 사용자 입력값 (citations 보완용)
 * @returns {Array} 수동 모드 포맷으로 변환된 배열
 */
function normalizeRationale(rationale, inputs = {}) {
  if (!Array.isArray(rationale)) return [];
  
  return rationale.map(item => {
    // groundingTag를 reason에 병합 (수동 모드 방식)
    const reason = item.reason || '';
    const groundingTag = item.groundingTag || '';
    const mergedReason = groundingTag ? `${reason} ${groundingTag}` : reason;
    
    // citations 보완: 없으면 usedFields 기반으로 생성
    let citations = item.citations || [];
    if (!Array.isArray(citations) || citations.length === 0) {
      citations = buildCitationsFromFields(item.usedFields || [], inputs);
    }
    
    return {
      principleId: item.principleId || '',
      principleName: item.principleName || '',
      type: item.type || 'TYPE_HOOK',
      reason: mergedReason,
      usedFields: Array.isArray(item.usedFields) ? item.usedFields : [],
      example: item.example || '',
      citations: citations,
      excluded: false
    };
  });
}

/**
 * usedFields와 inputs를 기반으로 citations 생성
 * @param {Array} usedFields - 사용된 필드 목록
 * @param {Object} inputs - 사용자 입력값
 * @returns {Array} citations 배열
 */
function buildCitationsFromFields(usedFields, inputs) {
  const citations = [];
  
  // 리뷰 인용
  if (usedFields.includes('reviews') && inputs.reviewExcerpts && inputs.reviewExcerpts.length > 0) {
    citations.push({
      text: inputs.reviewExcerpts[0],
      sourceField: 'reviews'
    });
  }
  
  // 신뢰요소 인용
  if (usedFields.includes('trustFactors') && inputs.trustFactors && inputs.trustFactors.length > 0) {
    citations.push({
      text: inputs.trustFactors[0],
      sourceField: 'trustFactors'
    });
  }
  
  return citations;
}

// ============================================================================
// 재시도 로직
// ============================================================================

/**
 * 지수 백오프 재시도
 * @param {Function} fn - 실행할 비동기 함수
 * @param {number} maxRetries - 최대 재시도 횟수
 * @returns {Promise} 실행 결과
 */
async function withRetry(fn, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // rate limit 에러인 경우 대기
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'] || Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }
      
      // 기타 에러는 즉시 중단
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// 메인 핸들러
// ============================================================================

/**
 * Vercel Serverless Function 핸들러
 * @param {Object} req - Next.js API 요청
 * @param {Object} res - Next.js API 응답
 */
export default async function handler(req, res) {
  // CORS 헤더 설정 (로컬 개발 지원)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST 메서드만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // API 키 검증 (최소 하나의 분석 provider 키 필요)
  const missingKeys = [];
  const hasAnalysisKey = ANALYSIS_PROVIDERS.some(p => process.env[p.apiKeyEnv]);
  if (!hasAnalysisKey) {
    missingKeys.push('NVIDIA_API_KEY 또는 OPENCODE_API_KEY 또는 DEEPSEEK_API_TOKEN');
  }
  if (missingKeys.length > 0) {
    return res.status(500).json({
      error: `필수 API 키가 설정되지 않았습니다: ${missingKeys.join(', ')}. Vercel 환경변수에서 설정해주세요.`
    });
  }
  
  // 요청 바디 검증
  const { inputs, mode } = req.body;
  if (!inputs) {
    return res.status(400).json({ error: 'inputs 필드가 필요합니다.' });
  }
  
  // 시스템 프롬프트 구성 (26원칙 포함)
  const systemPrompt = buildSystemPrompt(inputs);
  
  // 사용자 프롬프트 생성
  const userPrompt = generateUserPrompt(inputs, mode);
  
  // Provider 체인 호출 (무료 우선 폴백)
  // 데드라인 로직 (2026-08-01): 전역 데드라인 대비 남은 예산을 계산해
  // 각 provider fetch에 동적 타임아웃을 적용. 예산이 최소 임계값 미만이면
  // fetch를 시도하지 않고 다음 provider로 넘어간다.
  let data;
  try {
    const startTime = Date.now();
    // 각 provider별 실패 원인 수집 (최종 에러 응답에 포함)
    const providerFailures = [];
    
    data = await withRetry(async () => {
      for (const provider of ANALYSIS_PROVIDERS) {
        const providerKey = process.env[provider.apiKeyEnv];
        if (!providerKey) {
          providerFailures.push({ provider: provider.name, cause: 'skipped-no-api-key' });
          continue; // 키 없으면 다음 provider로
        }
        
        // 남은 예산 계산
        const remainingMs = GLOBAL_DEADLINE_MS - (Date.now() - startTime);
        if (remainingMs < MIN_ATTEMPT_MS) {
          providerFailures.push({ provider: provider.name, cause: `skipped-deadline (remainingMs=${remainingMs})` });
          console.warn(`[api/generate.js] Provider ${provider.name} 스킵: 전역 데드라인 소진 (남은 예산 ${remainingMs}ms < ${MIN_ATTEMPT_MS}ms)`);
          continue; // fetch 자체를 시도하지 않음
        }
        
        // 동적 타임아웃: 남은 예산과 provider 상한 중 작은 값
        const timeoutMs = Math.min(remainingMs, PER_PROVIDER_CAP_MS);
        
        try {
          const response = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${providerKey}`
            },
            body: JSON.stringify({
              model: provider.model,
              max_tokens: 4096,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            }),
            // 타임아웃: 남은 예산과 provider 상한 중 작은 값
            signal: AbortSignal.timeout(timeoutMs)
          });
          
          if (response.ok) {
            const result = await response.json();
            // 성공 시 provider 정보 추가
            result._provider = provider.name;
            result._free = provider.free;
            return result;
          }
          
          // HTTP 에러인 경우 다음 provider 시도
          const bodyText = await response.text().catch(() => '');
          providerFailures.push({ provider: provider.name, cause: `error status=${response.status}`, detail: bodyText.substring(0, 200) });
          console.warn(`[api/generate.js] Provider ${provider.name} error status=${response.status}, 다음 provider 시도`);
        } catch (err) {
          // 타임아웃(abort)과 실제 네트워크 에러 구분
          if (err.name === 'TimeoutError' || err.name === 'AbortError' || (err.cause && err.cause.name === 'TimeoutError')) {
            const elapsed = Date.now() - startTime;
            providerFailures.push({ provider: provider.name, cause: `timeout after ${timeoutMs}ms (elapsed ${elapsed}ms)` });
            console.warn(`[api/generate.js] Provider ${provider.name} timeout after ${timeoutMs}ms, 다음 provider 시도`);
          } else {
            providerFailures.push({ provider: provider.name, cause: `network error: ${err.message}` });
            console.warn(`[api/generate.js] Provider ${provider.name} 네트워크 에러: ${err.message}, 다음 provider 시도`);
          }
        }
      }
      
      // 모든 provider 실패
      const failureSummary = providerFailures.map(f => `${f.provider}=${f.cause}`).join(', ');
      throw new Error(`모든 분석 provider 실패 (${failureSummary})`);
    });
    
    // API 에러 확인 (일부 provider가 error 필드 반환할 수 있음)
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // 응답 파싱
    const result = parseApiResponse(data, inputs);
    
    // 성공 응답
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('[api/generate.js] API Error:', error);
    
    // 에러 유형별 응답 (공통)
    if (error.status === 401 || error.message?.includes('Unauthorized') || error.message?.includes('invalid') || error.message?.includes('Invalid')) {
      return res.status(500).json({ error: 'API 키가 유효하지 않습니다. 환경변수를 확인해주세요.' });
    }
    if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('Rate limit')) {
      return res.status(429).json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
    }
    if (error.status === 529 || error.status === 503 || error.message?.includes('overload') || error.message?.includes('overloaded')) {
      return res.status(503).json({ error: 'API 서비스가 과부하 상태입니다. 잠시 후 다시 시도해주세요.' });
    }
    
    return res.status(500).json({ 
      error: error.message || '서버 내부 오류가 발생했습니다.' 
    });
  }
}
