/**
 * @file skill-loader.js
 * @description shortform-copywriting.md 파일을 fetch하여 파싱하는 모듈.
 * 26개 마케팅 원칙을 로드하여 시스템 프롬프트에 주입할 수 있는 형태로 제공한다.
 */

/**
 * shortform-copywriting.md 파일을 fetch하여 파싱
 * @returns {Promise<Array>} 26개 원칙 배열 [{ id, name, type, description, example, requiredInputs, optionalInputs, unusedInputs }]
 */
async function loadSkillFile() {
  try {
    const response = await fetch('skills/custom/shortform-copywriting.md');
    if (!response.ok) {
      throw new Error('스킬 파일 로드 실패');
    }
    const markdown = await response.text();
    return parseSkillFile(markdown);
  } catch (error) {
    console.warn('[skill-loader.js] 스킬 파일 로드 실패, 기본 원칙 사용:', error);
    return getDefaultPrinciples();
  }
}

/**
 * 원칙 ID로 유형 매핑
 * @param {string} id - 원칙 ID (예: "1-1", "2-3")
 * @returns {string} 유형 (TYPE_HOOK, TYPE_CTA, TYPE_PSYCH)
 */
function getPrincipleType(id) {
  if (id.startsWith('1-')) return 'TYPE_HOOK';
  if (id.startsWith('2-')) return 'TYPE_CTA';
  if (id.startsWith('3-')) return 'TYPE_PSYCH';
  return 'TYPE_HOOK';
}

/**
 * 원칙 ID로 필수/선택/미사용 입력값 매핑
 * @param {string} id - 원칙 ID
 * @returns {{ requiredInputs: Array, optionalInputs: Array, unusedInputs: Array }}
 */
function getPrincipleInputs(id) {
  const inputMap = {
    // TYPE_HOOK: 훅 작성 원칙
    '1-1': { requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'] },
    '1-2': { requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'] },
    '1-3': { requiredInputs: ['target'], optionalInputs: ['reviews', 'concept'], unusedInputs: ['price', 'competitor'] },
    '1-4': { requiredInputs: ['target'], optionalInputs: ['reviews', 'concept'], unusedInputs: ['price', 'competitor'] },
    '1-5': { requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'] },
    '1-6': { requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'] },
    '1-7': { requiredInputs: ['target', 'concept'], optionalInputs: [], unusedInputs: ['price', 'competitor'] },
    '1-8': { requiredInputs: ['target'], optionalInputs: ['reviews'], unusedInputs: ['price', 'competitor'] },
    '1-9': { requiredInputs: ['target', 'concept'], optionalInputs: [], unusedInputs: ['price', 'competitor'] },
    // TYPE_CTA: CTA 공식
    '2-1': { requiredInputs: ['price'], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'] },
    '2-2': { requiredInputs: [], optionalInputs: ['trustFactors', 'price'], unusedInputs: ['reviews'] },
    '2-3': { requiredInputs: [], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'] },
    '2-4': { requiredInputs: ['trustFactors'], optionalInputs: [], unusedInputs: ['reviews'] },
    '2-5': { requiredInputs: ['price'], optionalInputs: [], unusedInputs: ['reviews'] },
    '2-6': { requiredInputs: ['price'], optionalInputs: ['trustFactors'], unusedInputs: ['reviews'] },
    '2-7': { requiredInputs: [], optionalInputs: ['target'], unusedInputs: ['reviews'] },
    // TYPE_PSYCH: 심리 트리거
    '3-1': { requiredInputs: ['reviews'], optionalInputs: ['trustFactors'], unusedInputs: ['price'] },
    '3-2': { requiredInputs: ['trustFactors'], optionalInputs: [], unusedInputs: ['reviews', 'price'] },
    '3-3': { requiredInputs: ['competitor'], optionalInputs: ['price'], unusedInputs: ['reviews'] },
    '3-4': { requiredInputs: ['price'], optionalInputs: ['reviews'], unusedInputs: [] },
    '3-5': { requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'] },
    '3-6': { requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'] },
    '3-7': { requiredInputs: ['concept'], optionalInputs: [], unusedInputs: ['price', 'reviews'] },
    '3-8': { requiredInputs: ['competitor'], optionalInputs: ['price'], unusedInputs: ['reviews'] },
    '3-9': { requiredInputs: ['reviews'], optionalInputs: [], unusedInputs: ['price', 'competitor'] },
    '3-10': { requiredInputs: ['target'], optionalInputs: ['concept'], unusedInputs: ['price', 'competitor'] }
  };
  return inputMap[id] || { requiredInputs: [], optionalInputs: [], unusedInputs: [] };
}

/**
 * 마크다운에서 원칙 파싱
 * @param {string} markdown - shortform-copywriting.md 내용
 * @returns {Array} 원칙 배열 [{ id, name, type, description, example, requiredInputs, optionalInputs, unusedInputs }]
 */
function parseSkillFile(markdown) {
  const principles = [];
  const lines = markdown.split('\n');
  let currentPrinciple = null;
  
  for (const line of lines) {
    // 원칙 헤더 매칭 (예: "### 1-1. 첫 3초가..." 또는 "### 1. 호기심 갭")
    // "1-1" 형식과 "1" 형식 모두 지원, "###"(3개)만 매칭 (섹션 제목 "##" 제외)
    const headerMatch = line.match(/^#{3}\s+(\d+(?:-\d+)?)\.\s+(.+)/);
    if (headerMatch) {
      if (currentPrinciple) {
        principles.push(currentPrinciple);
      }
      
      const principleId = headerMatch[1];
      const inputs = getPrincipleInputs(principleId);
      
      currentPrinciple = {
        id: principleId,
        name: headerMatch[2].trim(),
        type: getPrincipleType(principleId),
        description: '',
        example: '',
        requiredInputs: inputs.requiredInputs,
        optionalInputs: inputs.optionalInputs,
        unusedInputs: inputs.unusedInputs
      };
      continue;
    }
    
    // [근거] 섹션 내용을 설명로 사용
    if (currentPrinciple && line.trim() === '[근거]') {
      continue; // 다음 라인에서 설명 추출
    }
    
    if (currentPrinciple && !currentPrinciple.description && line.trim() && !line.startsWith('#') && !line.startsWith('[') && !line.startsWith('---')) {
      currentPrinciple.description = line.trim();
    }
    
    // [예시] 섹션 내용을 예시로 사용
    if (currentPrinciple && line.trim() === '[예시]') {
      continue; // 다음 라인에서 예시 추출
    }
    
    if (currentPrinciple && !currentPrinciple.example && line.startsWith('- ') && line.includes(':')) {
      currentPrinciple.example = line.replace(/^-\s*/, '').trim();
    }
  }
  
  // 마지막 원칙 추가
  if (currentPrinciple) {
    principles.push(currentPrinciple);
  }
  
  // 설명이 없는 원칙에 기본 설명 추가
  return principles.map(p => ({
    ...p,
    description: p.description || `${p.name} 원칙을 적용하여 광고 효과를 극대화합니다.`,
    example: p.example || ''
  }));
}

/**
 * 기본 원칙 반환 (파일 로드 실패 시)
 * @returns {Array} 기본 26개 원칙 배열
 */
function getDefaultPrinciples() {
  return [
    { id: 1, name: '호기심 갭', description: '정보 갭을 이용하여 시청자의 호기심을 자극합니다.', example: '이 제품은 말이죠...' },
    { id: 2, name: '첫 3초 훅', description: '첫 3초 내에 시청자의 주목을 끕니다.', example: '강렬한 비주얼 또는 의문 제기' },
    { id: 3, name: '감정적 연결', description: '감정을 자극하여 브랜드와의 유대감을 형성합니다.', example: '가족, 사랑, 행복 등의 감정 요소' },
    { id: 4, name: '스토리텔링', description: '스토리를 통해 메시지를 자연스럽게 전달합니다.', example: '고객의 여정 스토리' },
    { id: 5, name: '사회적 증거', description: '다른 사람들의 경험을 통해 신뢰를 형성합니다.', example: '리뷰, 후기, 셀러브리티 사용' },
    { id: 6, name: '권위', description: '전문가나 인증을 통해 신뢰를 강화합니다.', example: '의사 추천, 식약처 인증' },
    { id: 7, name: '희소성', description: '한정된 기회를 강조하여 행동을 촉진합니다.', example: '한정판, 마감 임박' },
    { id: 8, name: '상호성', description: '무언가를 제공하여 보답을 유도합니다.', example: '무료 체험, 샘플 제공' },
    { id: 9, name: '일치성', description: '이전 행동과 일치하도록 유도합니다.', example: '작은 동의 → 큰 동의' },
    { id: 10, name: '선호', description: '좋아하는 사람의 영향력을 활용합니다.', example: '인플루언서, 셀러브리티' },
    { id: 11, name: '단순화', description: '정보를 단순화하여 이해도를 높입니다.', example: '핵심 메시지 3가지 이내' },
    { id: 12, name: '비주얼', description: '시각적 요소를 강조하여 주목도를 높입니다.', example: '이미지, 영상, 색상 활용' },
    { id: 13, name: '리듬', description: '반복과 리듬을 통해 기억도를 높입니다.', example: '슬로건, 지그재그, 후크' },
    { id: 14, name: '공감', description: '타겟의 상황에 공감하여 연결을 형성합니다.', example: '당신도 그렇지 않나요?' },
    { id: 15, name: '질문', description: '질문을 통해 사고를 유도합니다.', example: '이런 고민 해보셨나요?' },
    { id: 16, name: '대비', description: '전후 대비를 통해 변화를 강조합니다.', example: '이전 vs 이후' },
    { id: 17, name: '비유', description: '비유를 통해 복잡한 개념을 쉽게 전달합니다.', example: '마치 ~와 같습니다' },
    { id: 18, name: '과장', description: '과장을 통해 인상을 남깁니다.', example: '세계 최초, 역대 최고' },
    { id: 19, name: '유머', description: '유머를 통해 친근감을 형성합니다.', example: '웃음, 재미있는 상황' },
    { id: 20, name: '감동', description: '감동을 통해 기억에 남습니다.', example: '감동적인 스토리, 눈물' },
    { id: 21, name: '도전', description: '도전 의식을 자극합니다.', example: '당신도 할 수 있습니다' },
    { id: 22, name: '비밀', description: '비밀을 공개하는 듯한 느낌을 줍니다.', example: '아무도 모르던 비법' },
    { id: 23, name: '트렌드', description: '최신 트렌드를 활용합니다.', example: '요즘 유행하는' },
    { id: 24, name: '개인화', description: '개인에게 맞는 메시지를 전달합니다.', example: '당신만을 위한' },
    { id: 25, name: '긴급성', description: '지금 당장 행동하도록 유도합니다.', example: '오늘만, 지금 바로' },
    { id: 26, name: '명확한 CTA', description: '명확한 행동 유도를 제시합니다.', example: '지금 구매하세요, 신청하세요' }
  ];
}

/**
 * 시스템 프롬프트용 원칙 텍스트 생성
 * @param {Array} principles - 원칙 배열
 * @returns {string} 시스템 프롬프트에 주입할 텍스트
 */
function generatePrinciplesPrompt(principles) {
  let prompt = '## 적용된 마케팅 원칙\n\n';
  
  for (const principle of principles) {
    prompt += `### ${principle.id}. ${principle.name}\n`;
    prompt += `- 설명: ${principle.description}\n`;
    if (principle.example) {
      prompt += `- 예시: ${principle.example}\n`;
    }
    prompt += '\n';
  }
  
  return prompt;
}

// 글로벌 스코프 노출
if (typeof window !== 'undefined') {
  window.loadSkillFile = loadSkillFile;
  window.parseSkillFile = parseSkillFile;
  window.generatePrinciplesPrompt = generatePrinciplesPrompt;
}
