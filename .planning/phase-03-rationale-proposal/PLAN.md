# PLAN — Phase 3: 당위성 엔진 + 설득형 제안서 문서화 ⭐ 핵심

> Phase: 3
> Requirements: R8, R9, R10, R25, R26, R27
> Mode: default (horizontal layers)

## Goal
제품별 맞춤 당위성 근거를 생성하고, "감이 아니라 논리로 만든다"는 걸 증명하는 설득형 제안서 PDF를 출력한다. **이 프로젝트의 진짜 핵심.**

## Success Criteria
- [ ] 26개 원칙이 시스템 프롬프트에 주입됨 (R8)
- [ ] 원칙 카드가 단순 나열이 아닌, 제품의 실제 입력값을 근거로 "왜 이 제품에는 이 원칙이 필요한가"를 한두 문장으로 생성 (R9)
- [ ] 수동 모드: 정형화된 문구 템플릿으로 대체 (원칙명 + 간단 근거) (R27)
- [ ] 설득형 제안서 PDF가 아래 순서의 설득 논리를 따름 (R10):
  1. 표지: 브랜드명 + 날짜 + "광고 기획안"
  2. 문제 진단: 타겟이 겪는 문제를 리뷰/데이터 기반으로 짚어줌 (R25)
  3. 전략 및 근거: 크리에이티브 전략 + 어떤 심리적 원칙에 근거하는지 설명
  4. 구현된 크리에이티브: 대본 + 스토리보드
  5. 기대 효과: 수치 보장 불가, 일반적 근거만 서술 (R26)
  6. 부록: 원칙 전체 리스트 + 각각 왜 이 제품에 적용되었는지 근거
- [ ] 문제진단 섹션에 리뷰 발췌 + 타겟 정보가 자동 구성됨 (R25)
- [ ] 기대효과 섹션에 일반적 근거만 서술됨 (수치 보장 금지) (R26)
- [ ] 수동↔자동 전환 시 당위성 근거 영역이 자동으로 업데이트됨 (R27)

---

## Wave 1: 핵심 파일 4개 (병렬 생성)

### Plan 1: skill-loader.js — shortform-copywriting.md fetch + 파싱

**파일:** `skill-loader.js`
**목적:** `skills/custom/shortform-copywriting.md` (26원칙)를 fetch하여 시스템 프롬프트에 주입할 수 있는 형태로 파싱

**구현:**
```javascript
// skill-loader.js — 스킬 파일 로더

/**
 * shortform-copywriting.md 파일을 fetch하여 파싱
 * @returns {Promise<Array>} 26개 원칙 배열
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
    console.warn('스킬 파일 로드 실패, 기본 원칙 사용:', error);
    return getDefaultPrinciples();
  }
}

/**
 * 마크다운에서 원칙 파싱
 * @param {string} markdown - shortform-copywriting.md 내용
 * @returns {Array} 원칙 배열 [{ id, name, description, example }]
 */
function parseSkillFile(markdown) {
  const principles = [];
  const lines = markdown.split('\n');
  let currentPrinciple = null;
  
  for (const line of lines) {
    // 원칙 헤더 매칭 (예: "### 1. 호기심 갭")
    const headerMatch = line.match(/^###\s+(\d+)\.\s+(.+)/);
    if (headerMatch) {
      if (currentPrinciple) {
        principles.push(currentPrinciple);
      }
      currentPrinciple = {
        id: parseInt(headerMatch[1]),
        name: headerMatch[2].trim(),
        description: '',
        example: ''
      };
      continue;
    }
    
    // 설명 매칭
    if (currentPrinciple && line.startsWith('- **설명:**')) {
      currentPrinciple.description = line.replace('- **설명:**', '').trim();
    }
    
    // 예시 매칭
    if (currentPrinciple && line.startsWith('- **예시:**')) {
      currentPrinciple.example = line.replace('- **예시:**', '').trim();
    }
  }
  
  // 마지막 원칙 추가
  if (currentPrinciple) {
    principles.push(currentPrinciple);
  }
  
  return principles;
}

/**
 * 기본 원칙 반환 (파일 로드 실패 시)
 */
function getDefaultPrinciples() {
  return [
    { id: 1, name: '호기심 갭', description: '정보 갭을 이용하여 시청자의 호기심을 자극', example: '이 제품은 말이죠...' },
    { id: 2, name: '첫 3초 훅', description: '첫 3초 내에 시청자의 주목을 끌기', example: '강렬한 비주얼 또는 의문 제기' },
    // ... 나머지 24개 원칙
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

// 전역 노출
window.loadSkillFile = loadSkillFile;
window.parseSkillFile = parseSkillFile;
window.generatePrinciplesPrompt = generatePrinciplesPrompt;
```

**의존성:** 없음 (독립적)
**검증:** 브라우저 콘솔에서 `loadSkillFile().then(principles => console.log(principles.length))` → 26개 원칙 배열 확인

---

### Plan 2: rationale-engine.js — 당위성 근거 생성 로직

**파일:** `rationale-engine.js`
**목적:** 입력값(타겟, 리뷰, 경쟁사, 가격)과 26개 원칙을 연결하여 "왜 이 제품에 이 원칙이 필요한가" 근거를 생성

**구현:**
```javascript
// rationale-engine.js — 당위성 근거 생성 엔진

/**
 * 수동 모드: 정형화된 템플릿으로 근거 생성
 * @param {Object} state - appState 객체
 * @param {Array} principles - 26개 원칙 배열
 * @returns {Array} 근거 배열 [{ principleId, principleName, reason, example }]
 */
function generateRationaleManually(state, principles) {
  return principles.map(principle => {
    // 템플릿 문구 생성
    let reason = '';
    
    // 타겟 기반 근거
    if (state.target) {
      reason = `이 원칙은 ${state.target}의 관심을 끌기 위해 필요합니다.`;
    }
    
    // 리뷰 기반 근거 (리뷰가 있는 경우)
    if (state.reviews && state.reviews.length > 0) {
      const reviewSnippet = state.reviews[0].substring(0, 30) + '...';
      reason += ` 리뷰에서 반복되는 "${reviewSnippet}" 문제를 해결하기 위해 적용되었습니다.`;
    }
    
    // 경쟁사 기반 근거
    if (state.competitorInfo) {
      reason += ` 경쟁 제품(${state.competitorInfo})과의 차별점을 강조하기 위해 사용됩니다.`;
    }
    
    // 가격 기반 근거
    if (state.priceRange) {
      reason += ` ${state.priceRange} 가격대에서 구매 장벽을 낮추는 데 기여합니다.`;
    }
    
    // 근거가 없는 경우 기본 템플릿
    if (!reason) {
      reason = `이 원칙은 ${state.brandName || '브랜드'}의 메시지를 효과적으로 전달하기 위해 적용되었습니다.`;
    }
    
    return {
      principleId: principle.id,
      principleName: principle.name,
      reason: reason.trim(),
      example: principle.example || ''
    };
  });
}

/**
 * 자동 모드: Claude API 프롬프트 생성 (실제 API 호출은 Phase 4)
 * @param {Object} state - appState 객체
 * @param {Array} principles - 26개 원칙 배열
 * @returns {string} Claude API 프롬프트
 */
function generateRationalePrompt(state, principles) {
  const principlesText = principles.map(p => 
    `${p.id}. ${p.name}: ${p.description}`
  ).join('\n');
  
  return `
당신은 마케팅 전문가입니다. 아래 제품 정보와 26개 마케팅 원칙을 분석하여,
각 원칙이 이 제품에 왜 필요한지 논리적 근거를 작성해주세요.

## 제품 정보
- 브랜드명: ${state.brandName || '미정'}
- 제품명: ${state.productName || '미정'}
- 타겟: ${state.target || '미정'}
- 컨셉: ${state.concept || '미정'}
- 경쟁 제품: ${state.competitorInfo || '미정'}
- 가격대: ${state.priceRange || '미정'}
- 리뷰 발췌: ${state.reviews ? state.reviews.join('; ') : '미정'}
- 브랜드 신뢰 요소: ${state.trustFactors ? state.trustFactors.join(', ') : '미정'}

## 26개 마케팅 원칙
${principlesText}

## 출력 형식
각 원칙에 대해 아래 형식으로 작성해주세요:
{
  "principleId": 원칙 번호,
  "principleName": "원칙 이름",
  "reason": "왜 이 제품에 이 원칙이 필요한지 1~2문장",
  "example": "실제 대본에서 어떻게 구현되었는지 1줄"
}
  `.trim();
}

/**
 * API 응답 파싱 (자동 모드)
 * @param {string} apiResponse - Claude API 응답
 * @returns {Array} 근거 배열
 */
function parseRationaleResponse(apiResponse) {
  try {
    // JSON 블록 추출
    const jsonMatch = apiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // 직접 JSON 파싱 시도
    return JSON.parse(apiResponse);
  } catch (error) {
    console.warn('API 응답 파싱 실패:', error);
    return [];
  }
}

/**
 * 당위성 근거 HTML 카드 생성
 * @param {Array} rationale - 근거 배열
 * @returns {string} HTML 문자열
 */
function renderRationaleCards(rationale) {
  if (!rationale || rationale.length === 0) {
    return '<div class="empty-state">당위성 근거가 없습니다</div>';
  }
  
  return `
    <div class="rationale-section">
      <h3>당위성 근거 — 왜 이 원칙인가</h3>
      <div class="rationale-cards">
        ${rationale.map(item => `
          <div class="rationale-card">
            <div class="card-header">
              <span class="principle-id">${item.principleId}</span>
              <span class="principle-name">${item.principleName}</span>
            </div>
            <div class="card-reason">${item.reason}</div>
            ${item.example ? `<div class="card-example">구현 예시: ${item.example}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 전역 노출
window.generateRationaleManually = generateRationaleManually;
window.generateRationalePrompt = generateRationalePrompt;
window.parseRationaleResponse = parseRationaleResponse;
window.renderRationaleCards = renderRationaleCards;
```

**의존성:** skill-loader.js (원칙 배열)
**검증:** 브라우저 콘솔에서 `generateRationaleManually(appState, principles)` → 근거 배열 반환 확인

---

### Plan 3: proposal-pdf.js — 설득형 제안서 PDF 템플릿

**파일:** `proposal-pdf.js`
**목적:** 설득 논리의 흐름을 따르는 제안서 PDF 생성 (표지→문제진단→전략및근거→크리에이티브→기대효과→원칙부록)

**구현:**
```javascript
// proposal-pdf.js — 설득형 제안서 PDF 템플릿

/**
 * 설득형 제안서 PDF 생성
 * @param {Object} data - 제안서 데이터
 * @param {Object} state - appState 객체
 * @param {Array} scenes - 대본 씬 배열
 * @param {Array} rationale - 당위성 근거 배열
 * @param {Array} principles - 26개 원칙 배열
 */
async function downloadProposalPDF(data, state, scenes, rationale, principles) {
  if (!checkJsPdfLoaded()) {
    alert('PDF 라이브러리가 로드되지 않았습니다.');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // 폰트 설정
  await loadKoreanFont();
  
  // 1. 표지
  renderCoverPage(doc, state);
  
  // 2. 문제 진단 (R25)
  doc.addPage();
  renderProblemDiagnosis(doc, state, data);
  
  // 3. 전략 및 근거
  doc.addPage();
  renderStrategyAndRationale(doc, state, rationale);
  
  // 4. 구현된 크리에이티브 (대본 + 스토리보드)
  doc.addPage();
  renderCreativeImplementation(doc, scenes, state);
  
  // 5. 기대 효과 (R26)
  doc.addPage();
  renderExpectedEffects(doc, rationale);
  
  // 6. 부록: 원칙 전체 리스트
  doc.addPage();
  renderPrinciplesAppendix(doc, principles, rationale);
  
  // PDF 다운로드
  const filename = `${state.brandName || 'brand'}_전략제안서_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
}

/**
 * 표지 렌더링
 */
function renderCoverPage(doc, state) {
  // 배경색
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, 210, 297, 'F');
  
  // 로고 영역
  doc.setFillColor(45, 45, 45);
  doc.roundedRect(20, 20, 170, 30, 3, 3, 'F');
  doc.setTextColor(224, 224, 224);
  doc.setFontSize(14);
  doc.text('AD SCRIPT STUDIO', 105, 38, { align: 'center' });
  
  // 제목
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('광고 기획안', 105, 100, { align: 'center' });
  
  // 브랜드명 + 제품명
  doc.setFontSize(16);
  doc.setTextColor(200, 200, 200);
  doc.text(state.brandName || '브랜드명', 105, 120, { align: 'center' });
  doc.text(state.productName || '제품명', 105, 130, { align: 'center' });
  
  // 날짜
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  const today = new Date().toLocaleDateString('ko-KR', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  doc.text(today, 105, 150, { align: 'center' });
  
  // 하단 정보
  doc.setFontSize(10);
  doc.text('감이 아니라 논리로 만든 제안서', 105, 200, { align: 'center' });
}

/**
 * 문제진단 섹션 렌더링 (R25)
 */
function renderProblemDiagnosis(doc, state, data) {
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.text('문제 진단', 20, 30);
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  let y = 45;
  
  // 타겟 문제
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('타겟 고객이 겪는 핵심 문제', 20, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  const problemText = `#${state.target || '고객'}들이 가장 고민하는 것은 ${state.competitorInfo || '해결되지 않은 문제'}입니다.`;
  const problemLines = doc.splitTextToSize(problemText, 170);
  doc.text(problemLines, 20, y);
  y += problemLines.length * 6 + 10;
  
  // 리뷰 기반 문제
  if (state.reviews && state.reviews.length > 0) {
    doc.setFont(undefined, 'bold');
    doc.text('실제 리뷰에서 반복되는 표현', 20, y);
    y += 8;
    
    doc.setFont(undefined, 'normal');
    state.reviews.forEach((review, index) => {
      const reviewText = `"${review}"`;
      const reviewLines = doc.splitTextToSize(reviewText, 160);
      doc.text(reviewLines, 25, y);
      y += reviewLines.length * 6 + 3;
    });
    y += 5;
  }
  
  // 가격/구매 장벽
  if (state.priceRange) {
    doc.setFont(undefined, 'bold');
    doc.text('구매 장벽', 20, y);
    y += 8;
    
    doc.setFont(undefined, 'normal');
    const priceText = `${state.priceRange} 가격대에서 첫 구매 망설임이 발생합니다.`;
    doc.text(priceText, 20, y);
    y += 10;
  }
  
  // 문제의 비용
  doc.setFont(undefined, 'bold');
  doc.text('이 문제를 해결하지 않았을 때의 비용', 20, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  const costText = '적절한 마케팅 없이는 경쟁 제품에 고객을 빼앗기며, 브랜드 인지도는 점차 낮아집니다.';
  const costLines = doc.splitTextToSize(costText, 170);
  doc.text(costLines, 20, y);
}

/**
 * 전략 및 근거 섹션 렌더링
 */
function renderStrategyAndRationale(doc, state, rationale) {
  doc.setFontSize(20);
  doc.text('전략 및 근거', 20, 30);
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  let y = 45;
  
  // 크리에이티브 전략
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('크리에이티브 전략', 20, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  const strategyText = `"${state.concept || '제품의 핵심 가치'}"를 중심으로, ${state.target || '타겟'}의 공감을 끌어내는 스토리텔링 전략을 적용합니다.`;
  const strategyLines = doc.splitTextToSize(strategyText, 170);
  doc.text(strategyLines, 20, y);
  y += strategyLines.length * 6 + 10;
  
  // 적용된 원칙 근거
  doc.setFont(undefined, 'bold');
  doc.text('적용된 심리적 원칙', 20, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  if (rationale && rationale.length > 0) {
    rationale.slice(0, 5).forEach(item => {
      const rationaleText = `${item.principleName}: ${item.reason}`;
      const rationaleLines = doc.splitTextToSize(rationaleText, 165);
      doc.text(rationaleLines, 25, y);
      y += rationaleLines.length * 6 + 4;
    });
  }
  
  // 신뢰 요소
  if (state.trustFactors && state.trustFactors.length > 0) {
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text('브랜드 신뢰 요소', 20, y);
    y += 8;
    
    doc.setFont(undefined, 'normal');
    const trustText = state.trustFactors.join(', ');
    doc.text(trustText, 20, y);
  }
}

/**
 * 구현된 크리에이티브 섹션 렌더링
 */
function renderCreativeImplementation(doc, scenes, state) {
  doc.setFontSize(20);
  doc.text('구현된 크리에이티브', 20, 30);
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  let y = 45;
  
  // 대본 테이블
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('대본', 20, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  scenes.forEach(scene => {
    // 타임라인
    doc.setFont(undefined, 'bold');
    doc.text(`[${scene.time}] ${scene.type.toUpperCase()}`, 20, y);
    y += 6;
    
    // 대사
    doc.setFont(undefined, 'normal');
    const dialogueLines = doc.splitTextToSize(scene.dialogue, 165);
    doc.text(dialogueLines, 25, y);
    y += dialogueLines.length * 5 + 3;
    
    // 연출지시
    doc.setTextColor(100);
    const directionLines = doc.splitTextToSize(`연출: ${scene.direction}`, 165);
    doc.text(directionLines, 25, y);
    y += directionLines.length * 5 + 8;
    
    doc.setTextColor(0);
    
    // 페이지 넘김 검사
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
}

/**
 * 기대효과 섹션 렌더링 (R26)
 */
function renderExpectedEffects(doc, rationale) {
  doc.setFontSize(20);
  doc.text('기대 효과', 20, 30);
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  let y = 45;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  
  // 일반적 근거만 서술 (수치 보장 금지)
  const effects = [
    '첫 3초 훅 전략은 숏폼 광고에서 시청 완료율을 평균 2~3배 향상시킵니다.',
    '1인칭 고백 형식은 광고 거부감을 낮춰 주목도를 높입니다.',
    '데이터 기반 문제 제기는 시청자의 공감과 신뢰를 동시에 형성합니다.',
    '명확한 CTA는 전환율을 높이는 데 필수적입니다.',
    '리뷰 인용은 사회적 증거를 제공하여 구매 결정을 가속화합니다.'
  ];
  
  effects.forEach(effect => {
    const effectLines = doc.splitTextToSize(`• ${effect}`, 170);
    doc.text(effectLines, 20, y);
    y += effectLines.length * 6 + 5;
  });
  
  // 주의사항
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  const disclaimer = '※ 위 효과는 일반적인 마케팅 근거이며, 실제 결과는 제품 및 시장 상황에 따라 달라질 수 있습니다.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, 170);
  doc.text(disclaimerLines, 20, y);
}

/**
 * 부록: 원칙 전체 리스트 렌더링
 */
function renderPrinciplesAppendix(doc, principles, rationale) {
  doc.setFontSize(20);
  doc.text('부록: 마케팅 원칙 전체 리스트', 20, 30);
  
  doc.setDrawColor(200);
  doc.line(20, 35, 190, 35);
  
  let y = 45;
  
  principles.forEach(principle => {
    // 원칙 이름
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${principle.id}. ${principle.name}`, 20, y);
    y += 6;
    
    // 설명
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const descLines = doc.splitTextToSize(principle.description, 165);
    doc.text(descLines, 25, y);
    y += descLines.length * 5 + 3;
    
    // 이 제품에 적용된 근거
    const rationaleItem = rationale.find(r => r.principleId === principle.id);
    if (rationaleItem) {
      doc.setTextColor(80, 80, 80);
      const reasonLines = doc.splitTextToSize(`적용 근거: ${rationaleItem.reason}`, 160);
      doc.text(reasonLines, 30, y);
      y += reasonLines.length * 5 + 5;
      doc.setTextColor(0);
    }
    
    y += 3;
    
    // 페이지 넘김 검사
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
}

// 전역 노출
window.downloadProposalPDF = downloadProposalPDF;
```

**의존성:** pdf.js (jsPDF 로드 상태 확인, 한글 폰트 로드), rationale-engine.js (근거 데이터)
**검증:** 브라우저에서 PDF 다운로드 → 6개 섹션 (표지→문제진단→전략및근거→크리에이티브→기대효과→원칙부록) 확인

---

### Plan 4: app.js 업데이트 — Phase 3 로직 연결

**파일:** `app.js` (기존 파일 업데이트)
**목적:** Phase 3의 스킬 로더, 당위성 엔진, 제안서 PDF를 기존 UI와 연결

**구현 변경:**
```javascript
// 기존 코드 유지...

// === Phase 3 추가 ===

// 11. Phase 3 초기화
function initPhase3() {
  // 스킬 파일 로드
  loadSkillFile().then(principles => {
    window.appPrinciples = principles;
    console.log(`${principles.length}개 원칙 로드 완료`);
  });
  
  // 당위성 근거 생성 버튼 이벤트
  const rationaleBtn = document.getElementById('generateRationaleBtn');
  if (rationaleBtn) {
    rationaleBtn.addEventListener('click', () => {
      const rationale = generateRationaleManually(appState, window.appPrinciples || []);
      renderRationaleCards(rationale);
      window.appRationale = rationale;
    });
  }
  
  // 제안서 PDF 다운로드 버튼 이벤트
  const proposalPdfBtn = document.getElementById('proposalPdfBtn');
  if (proposalPdfBtn) {
    proposalPdfBtn.addEventListener('click', () => {
      if (!window.appRationale) {
        alert('먼저 당위성 근거를 생성해주세요.');
        return;
      }
      downloadProposalPDF(
        {},  // 추가 데이터
        appState,
        window.appScenes || [],
        window.appRationale,
        window.appPrinciples || []
      );
    });
  }
  
  // 수동↔자동 모드 전환 이벤트
  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        // 자동 모드 (Claude API - Phase 4에서 구현)
        alert('자동 모드는 Phase 4에서 구현됩니다.');
        e.target.checked = false;
      } else {
        // 수동 모드
        const rationale = generateRationaleManually(appState, window.appPrinciples || []);
        renderRationaleCards(rationale);
        window.appRationale = rationale;
      }
    });
  }
}

// 12. 대본 생성 시 씬 데이터 저장
function initScriptGeneration() {
  const form = document.getElementById('inputForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = validateRequired();
    
    // 모든 경고 초기화
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
    
    // 에러 표시
    errors.forEach(err => {
      const errorEl = document.querySelector(`.field-error[data-error="${err.field}"]`);
      if (errorEl) errorEl.classList.add('visible');
    });
    
    if (errors.length === 0) {
      // 대본 생성
      const scenes = generateScript(appState);
      window.appScenes = scenes;  // Phase 3에서 사용하기 위해 저장
      renderScriptResult(scenes);
      renderStoryboardResult(scenes);
      showActionButtons();
      
      // Phase 3: 당위성 근거 자동 생성 (수동 모드)
      if (window.appPrinciples) {
        const rationale = generateRationaleManually(appState, window.appPrinciples);
        renderRationaleCards(rationale);
        window.appRationale = rationale;
      }
    }
  });
}

// DOMContentLoaded에 추가
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initScriptGeneration();
  initPhase3();  // Phase 3: 당위성 엔진 초기화
});
```

**의존성:** skill-loader.js, rationale-engine.js, proposal-pdf.js
**검증:** 브라우저에서 대본 생성 → 당위성 근거 카드 표시 → 제안서 PDF 다운로드 확인

---

## Wave 2: 제안서 PDF 레이아웃 디자인 + 섹션 템플릿

### Plan 5: 제안서 PDF 레이아웃 디자인 시스템

**파일:** `proposal-layout.js`
**목적:** 제안서 PDF의 일관된 레이아웃과 스타일 시스템 정의

**구현:**
```javascript
// proposal-layout.js — 제안서 PDF 레이아웃 시스템

/**
 * 제안서 PDF 레이아웃 상수
 */
const PROPOSAL_LAYOUT = {
  // 페이지 설정
  page: {
    width: 210,  // A4 너비 (mm)
    height: 297, // A4 높이 (mm)
    margin: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    contentWidth: 170 // 사용 가능 너비
  },
  
  // 색상 팔레트
  colors: {
    background: { r: 26, g: 26, b: 26 },      // 다크 배경
    cardBackground: { r: 45, g: 45, b: 45 },   // 카드 배경
    textPrimary: { r: 224, g: 224, b: 224 },   // 메인 텍스트
    textSecondary: { r: 150, g: 150, b: 150 }, // 보조 텍스트
    accent: { r: 100, g: 180, b: 255 },        // 강조 색상
    divider: { r: 80, g: 80, b: 80 }           // 구분선
  },
  
  // 폰트 크기
  fontSize: {
    title: 28,
    subtitle: 16,
    heading: 14,
    body: 12,
    caption: 10,
    small: 8
  },
  
  // 섹션 간격
  spacing: {
    sectionGap: 15,
    paragraphGap: 8,
    lineGap: 6,
    smallGap: 4
  }
};

/**
 * 페이지 번호 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {number} pageNum - 현재 페이지 번호
 * @param {number} totalPages - 전체 페이지 수
 */
function renderPageNumber(doc, pageNum, totalPages) {
  const { margin, page } = PROPOSAL_LAYOUT;
  const footerY = page.height - margin.bottom + 5;
  
  doc.setFontSize(PROPOSAL_LAYOUT.fontSize.small);
  doc.setTextColor(PROPOSAL_LAYOUT.colors.textSecondary.r, 
                   PROPOSAL_LAYOUT.colors.textSecondary.g, 
                   PROPOSAL_LAYOUT.colors.textSecondary.b);
  
  doc.text(`${pageNum} / ${totalPages}`, page.width / 2, footerY, { align: 'center' });
}

/**
 * 섹션 구분선 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {number} y - 현재 Y 좌표
 * @returns {number} 구분선 다음 Y 좌표
 */
function renderSectionDivider(doc, y) {
  const { margin, page, colors } = PROPOSAL_LAYOUT;
  
  doc.setDrawColor(colors.divider.r, colors.divider.g, colors.divider.b);
  doc.line(margin.left, y, margin.left + page.contentWidth, y);
  
  return y + PROPOSAL_LAYOUT.spacing.paragraphGap;
}

/**
 * 섹션 헤더 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {string} title - 섹션 제목
 * @param {number} y - 현재 Y 좌표
 * @returns {number} 헤더 다음 Y 좌표
 */
function renderSectionHeader(doc, title, y) {
  const { margin } = PROPOSAL_LAYOUT;
  
  doc.setFontSize(PROPOSAL_LAYOUT.fontSize.heading);
  doc.setFont(undefined, 'bold');
  doc.text(title, margin.left, y);
  
  return y + PROPOSAL_LAYOUT.spacing.paragraphGap;
}

/**
 * 본문 텍스트 렌더링 (자동 줄바꿈)
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {string} text - 텍스트
 * @param {number} y - 현재 Y 좌표
 * @param {Object} options - 옵션 { indent: number, bold: boolean, color: Object }
 * @returns {number} 텍스트 다음 Y 좌표
 */
function renderBodyText(doc, text, y, options = {}) {
  const { margin, page, spacing, colors, fontSize } = PROPOSAL_LAYOUT;
  const { indent = 0, bold = false, color = colors.textPrimary } = options;
  
  doc.setFontSize(fontSize.body);
  doc.setFont(undefined, bold ? 'bold' : 'normal');
  doc.setTextColor(color.r, color.g, color.b);
  
  const wrappedText = doc.splitTextToSize(text, page.contentWidth - indent);
  doc.text(wrappedText, margin.left + indent, y);
  
  return y + wrappedText.length * spacing.lineGap;
}

/**
 * 페이지 넘김 검사
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {number} y - 현재 Y 좌표
 * @param {number} requiredHeight - 필요한 높이
 * @returns {number} 페이지 넘김 후 Y 좌표
 */
function checkPageBreak(doc, y, requiredHeight = 30) {
  const { page, margin } = PROPOSAL_LAYOUT;
  
  if (y + requiredHeight > page.height - margin.bottom) {
    doc.addPage();
    return margin.top;
  }
  
  return y;
}

// 글로벌 스코프 노출
if (typeof window !== 'undefined') {
  window.PROPOSAL_LAYOUT = PROPOSAL_LAYOUT;
  window.renderPageNumber = renderPageNumber;
  window.renderSectionDivider = renderSectionDivider;
  window.renderSectionHeader = renderSectionHeader;
  window.renderBodyText = renderBodyText;
  window.checkPageBreak = checkPageBreak;
}
```

**의존성:** 없음 (독립적)
**검증:** 브라우저 콘솔에서 `PROPOSAL_LAYOUT` 객체 확인

---

### Plan 6: 문제진단 섹션 템플릿 강화

**파일:** `problem-diagnosis-template.js`
**목적:** 리뷰 발췌 + 타겟 정보를 기반으로 문제진단 섹션을 동적으로 구성

**구현:**
```javascript
// problem-diagnosis-template.js — 문제진단 섹션 템플릿

/**
 * 문제진단 섹션 데이터 생성
 * @param {Object} state - appState 객체
 * @returns {Object} 문제진단 데이터 { title, problems, reviews, cost }
 */
function generateProblemDiagnosisData(state) {
  const data = {
    title: '문제 진단',
    problems: [],
    reviews: [],
    cost: ''
  };
  
  // 1. 타겟 기반 문제
  const target = state.target || '고객';
  const competitor = state.competitorInfo || '해결되지 않은 문제';
  
  data.problems.push({
    type: 'target',
    title: '타겟 고객이 겪는 핵심 문제',
    content: `#${target}들이 가장 고민하는 것은 ${competitor}입니다.`
  });
  
  // 2. 리뷰 기반 문제 (있는 경우)
  if (state.reviewExcerpts && state.reviewExcerpts.length > 0) {
    data.reviews = state.reviewExcerpts.slice(0, 3).map(review => ({
      original: review,
      summary: review.length > 50 ? review.substring(0, 50) + '...' : review
    }));
    
    data.problems.push({
      type: 'reviews',
      title: '실제 리뷰에서 반복되는 표현',
      items: data.reviews
    });
  }
  
  // 3. 가격/구매 장벽
  if (state.priceRange) {
    data.problems.push({
      type: 'price',
      title: '구매 장벽',
      content: `${state.priceRange} 가격대에서 첫 구매 망설임이 발생합니다.`
    });
  }
  
  // 4. 문제의 비용
  data.cost = '적절한 마케팅 없이는 경쟁 제품에 고객을 빼앗기며, 브랜드 인지는 점차 낮아집니다.';
  
  return data;
}

/**
 * 문제진단 섹션 HTML 렌더링
 * @param {Object} data - 문제진단 데이터
 * @returns {string} HTML 문자열
 */
function renderProblemDiagnosisHTML(data) {
  let html = `
    <div class="problem-diagnosis-section">
      <h3>${data.title}</h3>
  `;
  
  data.problems.forEach(problem => {
    html += `
      <div class="problem-item">
        <h4>${problem.title}</h4>
    `;
    
    if (problem.content) {
      html += `<p>${problem.content}</p>`;
    }
    
    if (problem.items) {
      html += '<ul class="review-list">';
      problem.items.forEach(item => {
        html += `<li>"${item.original}"</li>`;
      });
      html += '</ul>';
    }
    
    html += '</div>';
  });
  
  if (data.cost) {
    html += `
      <div class="cost-section">
        <h4>이 문제를 해결하지 않았을 때의 비용</h4>
        <p>${data.cost}</p>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

/**
 * 문제진단 섹션 PDF 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Object} data - 문제진단 데이터
 * @param {number} startY - 시작 Y 좌표
 * @returns {number} 종료 Y 좌표
 */
function renderProblemDiagnosisPDF(doc, data, startY) {
  const { margin, spacing } = PROPOSAL_LAYOUT;
  let y = startY;
  
  // 제목
  y = renderSectionHeader(doc, data.title, y);
  y = renderSectionDivider(doc, y);
  
  // 각 문제 항목
  data.problems.forEach(problem => {
    y = checkPageBreak(doc, y, 40);
    
    // 문제 제목
    y = renderBodyText(doc, problem.title, y, { bold: true });
    
    // 문제 내용
    if (problem.content) {
      y = renderBodyText(doc, problem.content, y, { indent: 5 });
    }
    
    // 리뷰 목록
    if (problem.items) {
      problem.items.forEach(item => {
        y = renderBodyText(doc, `"${item.original}"`, y, { 
          indent: 10, 
          color: PROPOSAL_LAYOUT.colors.textSecondary 
        });
      });
    }
    
    y += spacing.smallGap;
  });
  
  // 문제의 비용
  if (data.cost) {
    y = checkPageBreak(doc, y, 30);
    y = renderBodyText(doc, '이 문제를 해결하지 않았을 때의 비용', y, { bold: true });
    y = renderBodyText(doc, data.cost, y, { indent: 5 });
  }
  
  return y;
}

// 글로벌 스코프 노출
if (typeof window !== 'undefined') {
  window.generateProblemDiagnosisData = generateProblemDiagnosisData;
  window.renderProblemDiagnosisHTML = renderProblemDiagnosisHTML;
  window.renderProblemDiagnosisPDF = renderProblemDiagnosisPDF;
}
```

**의존성:** proposal-layout.js (레이아웃 시스템)
**검증:** 브라우저 콘솔에서 `generateProblemDiagnosisData(appState)` 확인

---

### Plan 7: 기대효과 서술 템플릿

**파일:** `expected-effects-template.js`
**목적:** 수치 보장 없이 일반적 근거만 서술하는 기대효과 섹션 템플릿

**구현:**
```javascript
// expected-effects-template.js — 기대효과 서술 템플릿

/**
 * 기대효과 데이터 생성
 * @param {Array} rationale - 당위성 근거 배열
 * @returns {Object} 기대효과 데이터 { title, effects, disclaimer }
 */
function generateExpectedEffectsData(rationale) {
  const data = {
    title: '기대 효과',
    effects: [],
    disclaimer: '※ 위 효과는 일반적인 마케팅 근거이며, 실제 결과는 제품 및 시장 상황에 따라 달라질 수 있습니다.'
  };
  
  // 기본 효과 목록
  const defaultEffects = [
    {
      principle: '첫 3초 훅',
      effect: '첫 3초 훅 전략은 숏폼 광고에서 시청 완료율을 평균 2~3배 향상시킵니다.',
      source: '일반적 마케팅 근거'
    },
    {
      principle: '1인칭 고백',
      effect: '1인칭 고백 형식은 광고 거부감을 낮춰 주목도를 높입니다.',
      source: '일반적 마케팅 근거'
    },
    {
      principle: '데이터 기반 문제 제기',
      effect: '데이터 기반 문제 제기는 시청자의 공감과 신뢰를 동시에 형성합니다.',
      source: '일반적 마케팅 근거'
    },
    {
      principle: '명확한 CTA',
      effect: '명확한 CTA는 전환율을 높이는 데 필수적입니다.',
      source: '일반적 마케팅 근거'
    },
    {
      principle: '리뷰 인용',
      effect: '리뷰 인용은 사회적 증거를 제공하여 구매 결정을 가속화합니다.',
      source: '일반적 마케팅 근거'
    }
  ];
  
  // 기본 효과 사용
  data.effects = defaultEffects;
  
  // 적용된 원칙 효과 추가 (근거가 있는 경우)
  if (rationale && rationale.length > 0) {
    rationale.slice(0, 3).forEach(item => {
      // 이미 있는 원칙은 건너뛰기
      if (!data.effects.find(e => e.principle === item.principleName)) {
        data.effects.push({
          principle: item.principleName,
          effect: item.reason,
          source: '이 제안서 적용 원칙'
        });
      }
    });
  }
  
  return data;
}

/**
 * 기대효과 섹션 HTML 렌더링
 * @param {Object} data - 기대효과 데이터
 * @returns {string} HTML 문자열
 */
function renderExpectedEffectsHTML(data) {
  let html = `
    <div class="expected-effects-section">
      <h3>${data.title}</h3>
      <ul class="effects-list">
  `;
  
  data.effects.forEach(effect => {
    html += `
      <li class="effect-item">
        <span class="effect-principle">${effect.principle}:</span>
        <span class="effect-text">${effect.effect}</span>
        <span class="effect-source">(${effect.source})</span>
      </li>
    `;
  });
  
  html += `
      </ul>
      <div class="disclaimer">${data.disclaimer}</div>
    </div>
  `;
  
  return html;
}

/**
 * 기대효과 섹션 PDF 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Object} data - 기대효과 데이터
 * @param {number} startY - 시작 Y 좌표
 * @returns {number} 종료 Y 좌표
 */
function renderExpectedEffectsPDF(doc, data, startY) {
  const { margin, spacing, colors } = PROPOSAL_LAYOUT;
  let y = startY;
  
  // 제목
  y = renderSectionHeader(doc, data.title, y);
  y = renderSectionDivider(doc, y);
  
  // 효과 목록
  data.effects.forEach(effect => {
    y = checkPageBreak(doc, y, 25);
    
    // 원칙 이름 (볼드)
    y = renderBodyText(doc, `${effect.principle}:`, y, { bold: true, indent: 5 });
    
    // 효과 설명
    y = renderBodyText(doc, effect.effect, y, { indent: 10 });
    
    y += spacing.smallGap;
  });
  
  // 주의사항
  y = checkPageBreak(doc, y, 20);
  y += spacing.paragraphGap;
  doc.setFontSize(PROPOSAL_LAYOUT.fontSize.small);
  doc.setTextColor(colors.textSecondary.r, colors.textSecondary.g, colors.textSecondary.b);
  
  const disclaimerLines = doc.splitTextToSize(data.disclaimer, PROPOSAL_LAYOUT.page.contentWidth);
  doc.text(disclaimerLines, margin.left, y);
  y += disclaimerLines.length * spacing.lineGap;
  
  return y;
}

// 글로벌 스코프 노출
if (typeof window !== 'undefined') {
  window.generateExpectedEffectsData = generateExpectedEffectsData;
  window.renderExpectedEffectsHTML = renderExpectedEffectsHTML;
  window.renderExpectedEffectsPDF = renderExpectedEffectsPDF;
}
```

**의존성:** proposal-layout.js (레이아웃 시스템)
**검증:** 브라우저 콘솔에서 `generateExpectedEffectsData(rationale)` 확인

---

### Plan 8: proposal-pdf.js 업데이트 — 강화된 섹션 템플릿 사용

**파일:** `proposal-pdf.js` (기존 파일 업데이트)
**목적:** Wave 2의 레이아웃 시스템과 섹션 템플릿을 기존 proposal-pdf.js에 통합

**구현 변경:**
```javascript
// 기존 proposal-pdf.js 코드 유지...

/**
 * 설득형 제안서 PDF 생성 (Wave 2 업데이트)
 */
async function downloadProposalPDF(data, state, scenes, rationale, principles) {
  if (!checkJsPdfLoaded()) {
    alert('PDF 라이브러리가 로드되지 않았습니다.');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // 폰트 설정
  try {
    await loadKoreanFont();
    doc.setFont('NotoSansKR');
  } catch (error) {
    console.warn('[proposal-pdf.js] 한글 폰트 로드 실패, 기본 폰트 사용');
  }
  
  // 1. 표지
  renderCoverPage(doc, state);
  
  // 2. 문제 진단 (Wave 2 템플릿 사용)
  doc.addPage();
  const problemData = generateProblemDiagnosisData(state);
  renderProblemDiagnosisPDF(doc, problemData, PROPOSAL_LAYOUT.margin.top);
  
  // 3. 전략 및 근거
  doc.addPage();
  renderStrategyAndRationale(doc, state, rationale);
  
  // 4. 구현된 크리에이티브 (대본 + 스토리보드)
  doc.addPage();
  renderCreativeImplementation(doc, scenes, state);
  
  // 5. 기대 효과 (Wave 2 템플릿 사용)
  doc.addPage();
  const effectsData = generateExpectedEffectsData(rationale);
  renderExpectedEffectsPDF(doc, effectsData, PROPOSAL_LAYOUT.margin.top);
  
  // 6. 부록: 원칙 전체 리스트
  doc.addPage();
  renderPrinciplesAppendix(doc, principles, rationale);
  
  // 페이지 번호 추가
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderPageNumber(doc, i, totalPages);
  }
  
  // PDF 다운로드
  const brandName = state.brandName || 'brand';
  const productName = state.productName || 'product';
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${brandName}_${productName}_전략제안서_${today}.pdf`;
  
  doc.save(filename);
}
```

**의존성:** proposal-layout.js, problem-diagnosis-template.js, expected-effects-template.js
**검증:** 브라우저에서 PDF 다운로드 → 강화된 문제진단/기대효과 섹션 확인

---

## Verification Checklist (Wave 2 업데이트)

### Functional Verification
- [ ] `proposal-layout.js`가 레이아웃 시스템을 정의
- [ ] `problem-diagnosis-template.js`가 문제진단 데이터를 동적으로 생성
- [ ] `expected-effects-template.js`가 기대효과 데이터를 생성
- [ ] `proposal-pdf.js`가 Wave 2 템플릿을 사용하여 PDF 생성
- [ ] 페이지 번호가 모든 페이지에 표시
- [ ] 문제진단 섹션에 리뷰 발췌 + 타겟 정보가 자동 구성
- [ ] 기대효과 섹션에 일반적 근거만 서술 (수치 보장 금지)

### UI Verification
- [ ] 제안서 PDF 레이아웃이 전문적인 디자인
- [ ] 한글 폰트가 깨지지 않고 표시
- [ ] 페이지 번호가 하단 중앙에 표시
- [ ] 섹션 구분선이 일관되게 표시

### Edge Case Verification
- [ ] 리뷰 발췌가 없을 때 "타겟 고객의 일반적 Pain Point" 템플릿 사용
- [ ] 가격 정보가 없을 때 해당 섹션 생략
- [ ] 원칙이 없을 때 기본 효과 목록만 표시

### Functional Verification
- [ ] `skill-loader.js`가 `shortform-copywriting.md`를 fetch하여 26개 원칙을 파싱
- [ ] `rationale-engine.js`가 입력값 기반으로 당위성 근거를 생성
- [ ] 수동 모드에서 정형화된 템플릿 문구로 근거 생성
- [ ] "당위성 근거 생성" 버튼 클릭 시 근거 카드가 결과 영역에 표시
- [ ] "제안서 PDF 다운로드" 버튼 클릭 시 설득형 제안서 PDF 생성
- [ ] 제안서 PDF가 6개 섹션 (표지→문제진단→전략및근거→크리에이티브→기대효과→원칙부록) 포함
- [ ] 문제진단 섹션에 리뷰 발췌 + 타겟 정보가 자동 구성
- [ ] 기대효과 섹션에 일반적 근거만 서술 (수치 보장 금지)
- [ ] 수↔자동 전환 시 당위성 근거 영역이 업데이트됨

### UI Verification
- [ ] 결과 영역에 "당위성 근거" 탭 또는 섹션 표시
- [ ] 근거 카드에 원칙명 + 근거 + 적용 예시 표시
- [ ] 제안서 PDF 레이아웃이 전문적인 디자인 (로고, 일관된 폰트)
- [ ] 한글 폰트가 깨지지 않고 표시

### Edge Case Verification
- [ ] 스킬 파일 로드 실패 시 기본 원칙으로 폴백
- [ ] 입력값이 없을 때 기본 템플릿 문구로 근거 생성
- [ ] 근거가 없을 때 "당위성 근거가 없습니다" 메시지 표시
- [ ] PDF 생성 중 에러 발생 시 사용자에게 알림
