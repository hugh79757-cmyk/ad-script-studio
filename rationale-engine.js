/**
 * @file rationale-engine.js
 * @description 당위성 근거 생성 엔진 (그라운딩 규칙 적용 버전).
 * 
 * 그라운딩(Grounding) 규칙:
 * - 모든 근거는 실제 입력값에 기반해야 함 (허위 근거 금지)
 * - 근거 문장 끝에 "근거: [실제 입력값 필드명]" 인용 태그 필수
 * - 필수 입력값이 없으면 원칙을 생성 목록에서 완전히 제외
 * - UI에도 실제 입력 데이터 기반임을 명시
 * 
 * 참조: https://github.com/coreyhaines31/marketingskills/blob/main/skills/ad-creative/SKILL.md
 * Grounded Inputs 섹션 원칙 적용
 */

// ============================================================================
// 원칙 정의 (유형, 필수/선택/미사용 입력값 포함)
// ============================================================================

/**
 * 26개 마케팅 원칙 상수 (shortform-copywriting.md와 정확히 일치)
 * 각 원칙에 type, requiredInputs, optionalInputs, unusedInputs 필드 추가
 */
var PRINCIPLES = [
  // === TYPE_HOOK: 짧은 영상 광고에 적합한 후킹 작성 원칙 (1-1~1-9) ===
  { id: '1-1', name: '첫 3초가 광고의 존재를 결정한다', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'], description: '비디오 훅은 시각 액션, VO 첫 말, 캡션 텍스트 세 가지의 동시 조합이다.', example: '시각: 주문 취소 확인 메일 화면 / 음성: "이거 하나로 바꿨어요" / 캡션: "구독 취소 버튼 하나로"' },
  { id: '1-2', name: '호기심 갭(Curiosity gap)', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'], description: '핵심 명사를 숨겨 정보의 공백으로 끝까지 보게 한다.', example: '"이 문제의 진짜 원인을 알려주는 사람은 아무도 없어요."' },
  { id: '1-3', name: '대담한 주장(Bold claim)', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews', 'concept'], unusedInputs: ['price', 'competitor'], description: '구체적이고 반증 가능하게 주장하여 검증 욕구를 만든다.', example: '"하루 2분, 30일이면 충분합니다."' },
  { id: '1-4', name: '1인칭 고백(First-person confession)', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews', 'concept'], unusedInputs: ['price', 'competitor'], description: '살아있는 디테일이 없으면 가짜로 읽힌다.', example: '"저는 이 제품을 3년 동안 완전히 잘못 쓰고 있었어요."' },
  { id: '1-5', name: '대조 / 전후(Contrast / before-after)', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'], description: '두 상태를 첫 비트에 보여줘 변화를 뚜렷하게 한다.', example: '"3개월 전: 매일 영수증 정리에 47분. 지금: 월요일 아침 3분이면 끝."' },
  { id: '1-6', name: '공감 / POV', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'], description: '초구체적 상황을 미러링하여 "이거 나잖아"를 느끼게 한다.', example: '"POV: 새벽 1시, 아직도 다음 주 배송 준비를 하고 있는 당신."' },
  { id: '1-7', name: '증거 우선(Proof-first)', type: 'TYPE_HOOK', requiredInputs: ['target', 'concept'], optionalInputs: [], unusedInputs: ['price', 'competitor'], description: '영수증·결과 화면을 맨 앞에 배치하여 자랑한다.', example: '주문 취소 확인 화면 + "월 20만 원 → 월 4만 원."' },
  { id: '1-8', name: '훅 다양성', type: 'TYPE_HOOK', requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'], description: '세그먼트 × 동기 매트릭스로 서로 다른 훅을 쓴다.', example: '"명절 전 3kg이 고민인 분" / "운동 없이 3kg" / "거울 보기 싫어지는 사람"' },
  { id: '1-9', name: '15~30초 영상 구조 안에서 훅의 자리', type: 'TYPE_HOOK', requiredInputs: ['target', 'concept'], optionalInputs: [], unusedInputs: ['price', 'competitor'], description: '문제 → 자극 → 해결 → CTA 순서로 배치한다.', example: '[0-3초] 훅 → [3-15초] 자극 → [15-25초] 해결 → [25-30초] CTA' },

  // === TYPE_CTA: 전환율을 높이는 CTA 문구 패턴 (2-1~2-7) ===
  { id: '2-1', name: '행동 동사 + 받는 것 공식', type: 'TYPE_CTA', requiredInputs: ['price'], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'], description: '약한 CTA를 버리고 구체적 결과를 주는 강한 CTA를 사용한다.', example: '"지금 무료 체험 시작하기" (X: "가입하기")' },
  { id: '2-2', name: '하나의 CTA, 단일 행동', type: 'TYPE_CTA', requiredInputs: [], optionalInputs: ['trustFactors', 'price'], unusedInputs: ['reviews'], description: '선택지를 늘리지 말고 하나의 행동만 요청한다.', example: '"지금 주문하러 가기" 하나만 넣기' },
  { id: '2-3', name: '긴급성·희소성은 진짜일 때만', type: 'TYPE_CTA', requiredInputs: [], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'], description: '진짜가 아닌 긴급성은 신뢰를 깨뜨린다.', example: '"선착순 500명까지 무료배송" (실제 수량 제한이 있을 때만)' },
  { id: '2-4', name: '대화형 CTA', type: 'TYPE_CTA', requiredInputs: ['trustFactors'], optionalInputs: [], unusedInputs: ['reviews'], description: '하드셀 대신 대화형으로 전달하여 이탈을 막는다.', example: '"코드 WELCOME10 입력하면 첫 주문 10% 할인돼요"' },
  { id: '2-5', name: '사회적 증거와 CTA 결합', type: 'TYPE_CTA', requiredInputs: ['price'], optionalInputs: [], unusedInputs: ['reviews'], description: '증거 → CTA 순서로 마지막 행동 요청의 부담을 낮춘다.', example: '"이미 10,000+ 팀이 쓰고 있어요. 지금 무료로 시작하세요."' },
  { id: '2-6', name: '위험 제거(risk reversal)', type: 'TYPE_CTA', requiredInputs: ['price'], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'], description: '환불 보장·무료 체험으로 CTA 마찰을 제거한다.', example: '"30일 안에 맘에 안 들면 전액 환불."' },
  { id: '2-7', name: '영상은 단일 CTA 라인으로 끝내라', type: 'TYPE_CTA', requiredInputs: [], optionalInputs: ['target'], unusedInputs: ['reviews'], description: '마지막 비트는 CTA 한 줄로 마무리한다.', example: '"오늘 밤, 이 링크로 첫 주문 20% 할인받으세요."' },

  // === TYPE_PSYCH: 타겟 고객의 심리적 트리거 (3-1~3-10) ===
  { id: '3-1', name: '고객보다 더 잘 문제를 말하기', type: 'TYPE_PSYCH', requiredInputs: ['reviews'], optionalInputs: ['trustFactors'], unusedInputs: ['price'], description: '인정을 이끌어내어 해결책 제시를 자연스럽게 만든다.', example: '"매일 밤 1시간씩 인보이스 쫓아다니는 그 기분, 아시죠?"' },
  { id: '3-2', name: '이미 있는 욕망·공포를 채널링하라', type: 'TYPE_PSYCH', requiredInputs: ['trustFactors'], optionalInputs: [], unusedInputs: ['reviews', 'price'], description: '카피는 욕망을 만들 수 없다. 기존의 것에 연결하라.', example: '"거울 볼 때마다 늘어나는 주름, 이제는 지켜보지만 마세요."' },
  { id: '3-3', name: '손실 회피 프레이밍', type: 'TYPE_PSYCH', requiredInputs: ['competitor'], optionalInputs: ['price'], unusedInputs: ['reviews'], description: '"얻는 것"보다 "놓치는 것"을 강조하여 행동 압박을 높인다.', example: '"이걸 안 바꾸면, 1년에 40만 원을 그냥 버리게 됩니다."' },
  { id: '3-4', name: '통증을 정확한 숫자로 구체화하라', type: 'TYPE_PSYCH', requiredInputs: ['price'], optionalInputs: ['reviews'], unusedInputs: [], description: '수치화된 통증이 인식·기억·신뢰를 모두 높인다.', example: '"매일 47분을 영수증 정리에 써요. 일주일이면 5시간 반."' },
  { id: '3-5', name: '질문형 문제 제시', type: 'TYPE_PSYCH', requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'], description: '고객이 실제로 검색에 입력하는 질문을 묻는다.', example: '"왜 매일 저녁마다 배가 더부룩할까요?"' },
  { id: '3-6', name: 'Stop [통증]. Start [즐거움]. 구조', type: 'TYPE_PSYCH', requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'], description: '통증 제거와 욕구 충족을 한 문장에 대조 배치한다.', example: '"인보이스 쫓는 일은 그만. 제때 받는 삶을 시작하세요."' },
  { id: '3-7', name: '사회적 증거로 문제의 보편성을 증명하라', type: 'TYPE_PSYCH', requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'], description: '많은 사람이 같은 문제를 겪었다는 증거를 제시한다.', example: '"1만 개 팀이 이미 이 문제를 해결했어요."' },
  { id: '3-8', name: '현상 유지(무행동) 자체를 문제로 제시하라', type: 'TYPE_PSYCH', requiredInputs: ['competitor'], optionalInputs: ['price'], unusedInputs: ['reviews'], description: '무행동의 결과를 구체화하여 변화를 촉진한다.', example: '"아무것도 안 바꾸는 게 가장 비싼 선택이에요."' },
  { id: '3-9', name: '동기는 리뷰·댓글에서 그대로 가져와라', type: 'TYPE_PSYCH', requiredInputs: ['reviews'], optionalInputs: [], unusedInputs: ['price', 'competitor'], description: '고객의 말 그대로(verbatim)를 사용하여 마케터 의역보다 강력하다.', example: '리뷰 원문: "매번 세제 통에 남은 게 제일 아까웠어요" → 그대로 사용' },
  { id: '3-10', name: '정체성 욕망 활용', type: 'TYPE_PSYCH', requiredInputs: ['target'], optionalInputs: ['concept'], unusedInputs: ['price', 'competitor'], description: '"되고 싶은 나"를 그려주어 동기를 완성한다.', example: '"헬스장에 가기 싫은 사람도, 6개월 뒤엔 \'운동하세요?\' 소리를 듣게 됩니다."' }
];

// ============================================================================
// 입력값 매핑 및 유틸리티
// ============================================================================

/**
 * state 객체를 inputs 객체로 변환
 * @param {Object} state - appState 객체
 * @returns {Object} inputs 객체
 */
function mapStateToInputs(state) {
  return {
    target: state.target || '',
    concept: state.concept || '',
    reviews: state.reviewExcerpts || [],
    price: state.priceRange || '',
    competitor: state.competitorInfo || '',
    trustFactors: state.trustFactors || []
  };
}

/**
 * 필수 입력값 확인
 * @param {Array} requiredInputs - 필수 입력값 키 목록
 * @param {Object} inputs - 입력값 객체
 * @returns {boolean} 모든 필수 입력값이 있는지
 */
function hasRequiredInputs(requiredInputs, inputs) {
  if (!requiredInputs || requiredInputs.length === 0) return true;
  
  return requiredInputs.every(key => {
    const value = inputs[key];
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  });
}

/**
 * 필드명을 한국어 레이블로 변환
 * @param {string} fieldKey - 필드 키
 * @returns {string} 한국어 레이블
 */
function getFieldLabel(fieldKey) {
  const labels = {
    target: '타겟',
    concept: '컨셉',
    reviews: '리뷰 발췌',
    price: '가격대',
    competitor: '경쟁사',
    trustFactors: '브랜드 신뢰요소'
  };
  return labels[fieldKey] || fieldKey;
}

/**
 * 인용 태그 생성 (출처 구분 포함)
 * @param {Array} usedFields - 사용된 필드 키 목록
 * @param {Object} fieldSources - 필드별 출처 맵 (선택)
 * @returns {string} 인용 태그 문자열
 */
function generateGroundingTag(usedFields, fieldSources) {
  if (!usedFields || usedFields.length === 0) return '';
  
  const labels = usedFields.map(f => {
    const label = getFieldLabel(f);
    // 출처가 있으면 표시 (관리자용 — PDF에서는 미표시)
    if (fieldSources && fieldSources[f]) {
      const sourceLabel = fieldSources[f] === 'auto-research' ? '자동조사' : '사용자입력';
      return `${label}[${sourceLabel}]`;
    }
    return label;
  });
  
  return ` (근거: ${labels.join(', ')})`;
}

/**
 * 인용 태그 생성 (PDF용 — 출처 구분 없이 깔끔하게)
 * @param {Array} usedFields - 사용된 필드 키 목록
 * @returns {string} 인용 태그 문자열
 */
function generatePDFGroundingTag(usedFields) {
  if (!usedFields || usedFields.length === 0) return '';
  const labels = usedFields.map(f => getFieldLabel(f));
  return ` (근거: ${labels.join(', ')})`;
}

// ============================================================================
// 유형별 근거 생성 함수 (그라운딩 규칙 적용)
// ============================================================================

/**
 * TYPE_HOOK: 훅 작성 원칙 근거 생성
 * @returns {{ reason: string, usedFields: Array, citations: Array }} 근거, 사용된 필드, 인용 출처
 */
function generateHookRationale(principle, inputs, brandName) {
  let reason = '';
  let usedFields = [];
  let citations = [];
  
  // 1. 타겟 기반 (필수)
  if (inputs.target) {
    usedFields.push('target');
    const targetPhrases = {
      '1-1': `${inputs.target}이/가 자주 겪는 문제를 언급하되 핵심 해결책은 숨겨 시청을 유지합니다`,
      '1-2': `첫 3초 내에 ${inputs.target}의 시선을 사로잡기 위해 강렬한 메시지를 배치합니다`,
      '1-3': `${inputs.target}의 감정에 직접 호소하여 브랜드와의 유대감을 형성합니다`,
      '1-4': `${inputs.target}의 실제 경험을 스토리로 구성하여 자연스럽게 메시지를 전달합니다`,
      '1-5': `${inputs.target}이 공감할 수 있는 상황을 제시하여 "나도 그렇다"는 반응을 유도합니다`,
      '1-6': `${inputs.target}에게 질문을 던져 스스로 생각하게 만들고 몰입도를 높입니다`,
      '1-7': `${inputs.target}이 익숙한 비유를 통해 제품의 핵심 가치를 쉽게 전달합니다`,
      '1-8': `${inputs.target}의 마음을 움직이는 감동적인 요소를 삽입하여 기억에 남게 합니다`,
      '1-9': `${inputs.target}이 모르던 제품의 비밀을 공개하는 듯한 호기심을 자극합니다`
    };
    reason = targetPhrases[principle.id] || `${inputs.target}의 관심을 끌기 위해 필요합니다`;
  }
  
  // 2. 리뷰 기반 (선택) - 리뷰가 있을 때만 인용
  if (inputs.reviews && inputs.reviews.length > 0) {
    usedFields.push('reviews');
    const reviewSnippet = inputs.reviews[0].substring(0, 25);
    citations.push({ text: reviewSnippet, sourceField: 'reviews' });
    const reviewPhrases = {
      '1-1': `실제 리뷰에서 "${reviewSnippet}"라고 언급된 문제를 활용합니다`,
      '1-2': `리뷰에서 반복되는 "${reviewSnippet}" 표현을 첫 훅에 적용합니다`,
      '1-3': `고객 리뷰 "${reviewSnippet}"에서 느껴지는 감정을 강조합니다`,
      '1-4': `리뷰 "${reviewSnippet}"를 바탕으로 고객 스토리를 구성합니다`,
      '1-5': `"${reviewSnippet}"라고 말하는 고객의 공감대를 형성합니다`,
      '1-6': `리뷰에서 발견된 "${reviewSnippet}" 고민을 질문으로 전환합니다`,
      '1-8': `"${reviewSnippet}"라는 고객의 감동을 극대화합니다`,
      '1-9': `리뷰에서 알게 된 "${reviewSnippet}" 비밀을 강조합니다`
    };
    if (reviewPhrases[principle.id]) {
      reason += `. ${reviewPhrases[principle.id]}`;
    }
  }
  
  // 허위 근거 방지: reason이 비어있으면 기본 문구 (입력값 기반)
  if (!reason) {
    reason = `${brandName || '브랜드'}의 메시지를 효과적으로 전달하기 위해 적용되었습니다`;
  }
  
  return { reason, usedFields, citations };
}

/**
 * TYPE_CTA: CTA 공식 근거 생성
 * @returns {{ reason: string, usedFields: Array, citations: Array }} 근거, 사용된 필드, 인용 출처
 */
function generateCTARationale(principle, inputs, brandName) {
  let reason = '';
  let usedFields = [];
  let citations = [];
  
  // 1. 가격대 기반 (필수인 경우)
  if (inputs.price) {
    usedFields.push('price');
    citations.push({ text: inputs.price, sourceField: 'price' });
    const pricePhrases = {
      '2-1': `${inputs.price} 가격대에서 한정된 수량/기간을 강조하여 구매를 촉진합니다`,
      '2-5': `${inputs.price} 가격대에서 "지금 당장"이라는 긴급성을 부여합니다`,
      '2-6': `${inputs.price} 가격대에서 명확한 행동(구매, 신청)을 유도합니다`,
      '3-4': `${inputs.price} 가격대를 기반으로 구매 망설임의 구체적 비용을 계산합니다`,
      '3-8': `${inputs.price} 가격대에서 경쟁사 대비 가성비를 강조합니다`
    };
    reason = pricePhrases[principle.id] || `${inputs.price} 가격대에서 구매 장벽을 낮추는 데 기여합니다`;
  }
  
  // 2. 신뢰요소 기반 (있는 경우)
  if (inputs.trustFactors && inputs.trustFactors.length > 0) {
    usedFields.push('trustFactors');
    const trustText = inputs.trustFactors[0];
    citations.push({ text: trustText, sourceField: 'trustFactors' });
    const trustPhrases = {
      '2-1': `신뢰 요소(${trustText})와 함께 희소성을 강조합니다`,
      '2-2': `${trustText} 같은 신뢰 요소를 제공하여 상호성을 강화합니다`,
      '2-3': `${trustText} 등 기존 신뢰를 바탕으로 추가 동의를 유도합니다`,
      '2-4': `${trustText}을 활용한 전문가/유명인 권위를 형성합니다`,
      '2-6': `${trustText} 신뢰 요소와 함께 구체적 행동을 제시합니다`,
      '3-2': `${trustText}과 같은 공식 인증/수상을 통해 권위를 강화합니다`
    };
    if (trustPhrases[principle.id]) {
      reason += (reason ? '. ' : '') + trustPhrases[principle.id];
    }
  }
  
  // 3. 기본 템플릿 (입력값에 의존하지 않는 원칙)
  if (!reason) {
    const defaultPhrases = {
      '2-2': '제공할 수 있는 것을 명확히 제시하여 상호성을 유도합니다',
      '2-3': '작은 동의부터 시작하여 점진적으로 행동을 유도합니다',
      '2-7': '도전적인 메시지로 행동 변화를 촉진합니다'
    };
    reason = defaultPhrases[principle.id] || `${brandName || '브랜드'}의 행동 유도를 강화합니다`;
  }
  
  return { reason, usedFields, citations };
}

/**
 * TYPE_PSYCH: 심리 트리거 근거 생성
 * @returns {{ reason: string, usedFields: Array, citations: Array }} 근거, 사용된 필드, 인용 출처
 */
function generatePsychRationale(principle, inputs, brandName) {
  let reason = '';
  let usedFields = [];
  let citations = [];
  
  switch (principle.id) {
    case '3-1': // 사회적 증거
      if (inputs.reviews && inputs.reviews.length > 0) {
        usedFields.push('reviews');
        // 리뷰 개수는 파생된 값이므로 인용 목록에 포함하지 않음
        // 대신 첫 번째 리뷰를 인용으로 포함
        citations.push({ text: inputs.reviews[0], sourceField: 'reviews' });
        reason = `실제 고객 ${inputs.reviews.length}건의 리뷰를 인용하여 사회적 증거를 형성합니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-2': // 권위
      if (inputs.trustFactors && inputs.trustFactors.length > 0) {
        usedFields.push('trustFactors');
        citations.push({ text: inputs.trustFactors[0], sourceField: 'trustFactors' });
        reason = `${inputs.trustFactors[0]}과 같은 공식 인증을 통해 전문성과 권위를 강화합니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-3': // 손실 프레이밍
      if (inputs.competitor) {
        usedFields.push('competitor');
        citations.push({ text: inputs.competitor, sourceField: 'competitor' });
        reason = `경쟁 제품(${inputs.competitor})과 비교하여 "놓치면 손해"라는 프레이밍을 적용합니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-4': // 고통 정량화
      if (inputs.price) {
        usedFields.push('price');
        citations.push({ text: inputs.price, sourceField: 'price' });
        reason = `${inputs.price} 가격대를 기반으로 구매 망설임의 구체적 비용(예: 매월 N만원 손해)을 계산합니다`;
      } else if (inputs.reviews && inputs.reviews.length > 0) {
        usedFields.push('reviews');
        reason = `리뷰에서 반복되는 고민을 구체적 수치로 정량화합니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-5': // 단순화
      if (inputs.concept) {
        usedFields.push('concept');
        citations.push({ text: inputs.concept, sourceField: 'concept' });
        reason = `"${inputs.concept}"라는 핵심 컨셉을 3가지 이내로 단순화합니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-6': // 비주얼
      if (inputs.concept) {
        usedFields.push('concept');
        citations.push({ text: inputs.concept, sourceField: 'concept' });
        reason = `"${inputs.concept}"를 시각적 요소로 강조하여 주목도를 높입니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-7': // 리듬
      if (inputs.concept) {
        usedFields.push('concept');
        citations.push({ text: inputs.concept, sourceField: 'concept' });
        reason = `"${inputs.concept}"를 반복과 리듬으로 기억도를 높입니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-8': // 대비
      if (inputs.competitor) {
        usedFields.push('competitor');
        citations.push({ text: inputs.competitor, sourceField: 'competitor' });
        reason = `경쟁 제품(${inputs.competitor})과 비교하여 "${brandName || '제품'}"의 차별점을 명확히 대비시킵니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-9': // 리뷰 표현 인용
      if (inputs.reviews && inputs.reviews.length > 0) {
        usedFields.push('reviews');
        const directQuote = inputs.reviews[0];
        citations.push({ text: directQuote, sourceField: 'reviews' });
        reason = `고객이 실제로 "${directQuote}"라고 표현했기 때문에 이 문구를 대본에 그대로 살렸습니다`;
      } else {
        reason = '';
      }
      break;
      
    case '3-10': // 유머
      if (inputs.target) {
        usedFields.push('target');
        citations.push({ text: inputs.target, sourceField: 'target' });
        reason = `${inputs.target}이 공감할 수 있는 유머 요소를 삽입하여 친근감을 형성합니다`;
      } else {
        reason = '';
      }
      break;
      
    default:
      reason = `${brandName || '브랜드'}의 메시지를 효과적으로 전달하기 위해 적용되었습니다`;
  }
  
  return { reason, usedFields, citations };
}

// ============================================================================
// 메인 근거 생성 함수 (그라운딩 규칙 적용)
// ============================================================================

/**
 * 수동 모드: 원칙 유형별 차별화된 근거 생성 (그라운딩 규칙 적용)
 * 
 * 그라운딩 규칙:
 * 1. 모든 근거는 실제 입력값에 기반
 * 2. 근거 문장 끝에 "근거: [필드명]" 인용 태그 필수
 * 3. 필수 입력값 없으면 원칙 완전 제외
 * 4. 허위 근거 금지
 * 
 * @param {Object} state - appState 객체
 * @param {Array} principles - 원칙 배열 (기본: PRINCIPLES 상수)
 * @returns {Array} 근거 배열 [{ principleId, principleName, type, reason, groundingTag, usedFields, example }]
 */
/**
 * 수동 모드: 원칙 유형별 차별화된 근거 생성 (그라운딩 규칙 적용)
 * 
 * @returns {{ generated: Array, skipped: Array }}
 *   generated: 생성된 근거 배열
 *   skipped: 스킵된 원칙 배열 [{ principleId, principleName, type, reason }]
 */
function generateRationaleManually(state, principles = PRINCIPLES) {
  if (!principles || principles.length === 0) {
    console.warn('[rationale-engine.js] 원칙이 없습니다.');
    return { generated: [], skipped: [] };
  }
  
  const inputs = mapStateToInputs(state);
  const brandName = state.brandName || '브랜드';
  const generated = [];
  const skipped = [];
  
  principles.forEach(principle => {
    // 그라운딩 규칙 3: 필수 입력값 확인 - 없으면 완전히 제외
    if (!hasRequiredInputs(principle.requiredInputs, inputs)) {
      const missingInputs = principle.requiredInputs.filter(key => {
        const value = inputs[key];
        if (Array.isArray(value)) return value.length === 0;
        return !value;
      });
      
      console.warn(
        `⚠️ [${principle.name}] 스킵됨 - 필요 입력값 없음: ${missingInputs.map(getFieldLabel).join(', ')}`
      );
      
      skipped.push({
        principleId: principle.id,
        principleName: principle.name,
        type: principle.type,
        reason: `필수 입력값 없음: ${missingInputs.map(getFieldLabel).join(', ')}`
      });
      return;
    }
    
    // 유형별 근거 생성
    let result = { reason: '', usedFields: [], citations: [] };
    
    switch (principle.type) {
      case 'TYPE_HOOK':
        result = generateHookRationale(principle, inputs, brandName);
        break;
      case 'TYPE_CTA':
        result = generateCTARationale(principle, inputs, brandName);
        break;
      case 'TYPE_PSYCH':
        result = generatePsychRationale(principle, inputs, brandName);
        break;
      default:
        result.reason = `${brandName}의 메시지를 효과적으로 전달하기 위해 적용되었습니다`;
    }
    
    // 그라운딩 규칙 1 & 4: 빈 reason이면 필수 입력값 관련 원칙이므로 제외
    if (!result.reason) {
      console.warn(
        `⚠️ [${principle.name}] 스킵됨 - 필수 입력값 기반 근거 생성 불가`
      );
      skipped.push({
        principleId: principle.id,
        principleName: principle.name,
        type: principle.type,
        reason: '필수 입력값 기반 근거 생성 불가'
      });
      return;
    }
    
    // 그라운딩 규칙 2: 인용 태그 생성 (출처 구분 포함)
    const fieldSources = {};
    if (typeof getFieldSource === 'function') {
      result.usedFields.forEach(f => {
        fieldSources[f] = getFieldSource(f);
      });
    }
    const groundingTag = generateGroundingTag(result.usedFields, fieldSources);
    
    generated.push({
      principleId: principle.id,
      principleName: principle.name,
      type: principle.type,
      reason: result.reason.trim() + groundingTag,
      usedFields: result.usedFields,
      citations: result.citations || [],
      example: principle.example || '',
      excluded: false
    });
  });
  
  return { generated, skipped };
}

// ============================================================================
// 기존 함수들 (유지)
// ============================================================================

function getPrinciples() {
  return [...PRINCIPLES];
}

function getPrincipleStats() {
  const stats = {
    TYPE_HOOK: { count: 0, principles: [] },
    TYPE_CTA: { count: 0, principles: [] },
    TYPE_PSYCH: { count: 0, principles: [] }
  };
  
  PRINCIPLES.forEach(p => {
    if (stats[p.type]) {
      stats[p.type].count++;
      stats[p.type].principles.push(p.name);
    }
  });
  
  return stats;
}

function generateRationalePrompt(state, principles = PRINCIPLES) {
  const principlesText = principles.map(p => 
    `${p.id}. ${p.name} [${p.type}]: ${p.description}`
  ).join('\n');
  
  return `
당신은 마케팅 전문가입니다. 아래 제품 정보와 마케팅 원칙을 분석하여,
각 원칙이 이 제품에 왜 필요한지 논리적 근거를 작성해주세요.

## 제품 정보
- 브랜드명: ${state.brandName || '미정'}
- 제품명: ${state.productName || '미정'}
- 타겟: ${state.target || '미정'}
- 컨셉: ${state.concept || '미정'}
- 경쟁 제품: ${state.competitorInfo || '미정'}
- 가격대: ${state.priceRange || '미정'}
- 리뷰 발췌: ${state.reviewExcerpts ? state.reviewExcerpts.join('; ') : '미정'}
- 브랜드 신뢰 요소: ${state.trustFactors ? state.trustFactors.join(', ') : '미정'}

## 마케팅 원칙 (유형별)
${principlesText}

## 출력 형식
각 원칙에 대해 아래 형식으로 작성해주세요:
{
  "principleId": 원칙 번호,
  "principleName": "원칙 이름",
  "type": "원칙 유형",
  "reason": "왜 이 제품에 이 원칙이 필요한지 1~2문장 (근거 필드 포함)",
  "example": "실제 대본에서 어떻게 구현되었는지 1줄"
}
  `.trim();
}

function parseRationaleResponse(apiResponse) {
  try {
    const jsonMatch = apiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(apiResponse);
  } catch (error) {
    console.warn('[rationale-engine.js] API 응답 파싱 실패:', error);
    return [];
  }
}

/**
 * 당위성 근거 HTML 카드 생성 (그라운딩 표시 포함)
 */
function renderRationaleCards(rationale) {
  const container = document.getElementById('strategy');
  if (!container) {
    console.warn('[rationale-engine.js] 결과 컨테이너를 찾을 수 없습니다.');
    return;
  }
  
  if (!rationale || rationale.length === 0) {
    container.innerHTML = '<div class="empty-state">당위성 근거가 없습니다. "생성" 버튼을 클릭해주세요.</div>';
    return;
  }
  
  // 유형별 색상 매핑
  const typeColors = {
    'TYPE_HOOK': '#4CAF50',
    'TYPE_CTA': '#2196F3',
    'TYPE_PSYCH': '#FF9800'
  };
  
  const typeLabels = {
    'TYPE_HOOK': '훅',
    'TYPE_CTA': 'CTA',
    'TYPE_PSYCH': '심리'
  };
  
  // 사용된 필드별 하이라이트 색상
  const fieldColors = {
    target: '#E8F5E9',
    concept: '#E3F2FD',
    reviews: '#FFF3E0',
    price: '#F3E5F5',
    competitor: '#FFEBEE',
    trustFactors: '#E0F2F1'
  };
  
  container.innerHTML = `
    <div class="rationale-section">
      <h3>당위성 근거 — 왜 이 원칙인가</h3>
      <div class="rationale-notice" style="background-color: #e8f5e9; padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 12px; color: #2e7d32;">
        ✓ 이 근거는 실제 입력하신 데이터에 기반합니다
      </div>
      <div class="rationale-cards">
        ${rationale.map(item => `
          <div class="rationale-card" style="border-left: 4px solid ${typeColors[item.type] || '#666'}">
            <div class="card-header">
              <span class="principle-id">${item.principleId}</span>
              <span class="principle-name">${item.principleName}</span>
              <span class="principle-type" style="background-color: ${typeColors[item.type] || '#666'}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">
                ${typeLabels[item.type] || item.type}
              </span>
            </div>
            <div class="card-reason">${item.reason}</div>
            ${item.usedFields && item.usedFields.length > 0 ? `
              <div class="card-grounding" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
                <span style="font-size: 10px; color: #666;">참조 필드: </span>
                ${item.usedFields.map(field => `
                  <span style="display: inline-block; background-color: ${fieldColors[field] || '#f5f5f5'}; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 4px; border: 1px solid #e0e0e0;">
                    ${getFieldLabel(field)}
                  </span>
                `).join('')}
              </div>
            ` : ''}
            ${item.example ? `<div class="card-example" style="font-size: 11px; color: #888; margin-top: 4px;">구현 예시: ${item.example}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateRationaleSummary(rationale) {
  if (!rationale || rationale.length === 0) {
    return '당위성 근거가 없습니다.';
  }
  
  const summaryLines = rationale.map(item => 
    `[${item.principleId}] ${item.principleName} (${item.type}): ${item.reason}`
  );
  
  return summaryLines.join('\n\n');
}

// ============================================================================
// 글로벌 스코프 노출
// ============================================================================

if (typeof window !== 'undefined') {
  window.PRINCIPLES = PRINCIPLES;
  window.getPrinciples = getPrinciples;
  window.getPrincipleStats = getPrincipleStats;
  window.generateRationaleManually = generateRationaleManually;
  window.generateRationalePrompt = generateRationalePrompt;
  window.parseRationaleResponse = parseRationaleResponse;
  window.renderRationaleCards = renderRationaleCards;
  window.generateRationaleSummary = generateRationaleSummary;
  window.getFieldLabel = getFieldLabel;
  window.generateGroundingTag = generateGroundingTag;
  window.generatePDFGroundingTag = generatePDFGroundingTag;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PRINCIPLES,
    getPrinciples,
    getPrincipleStats,
    generateRationaleManually,
    generateRationalePrompt,
    parseRationaleResponse,
    renderRationaleCards,
    generateRationaleSummary,
    getFieldLabel,
    generateGroundingTag,
    generatePDFGroundingTag
  };
}
