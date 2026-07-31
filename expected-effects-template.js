/**
 * @file expected-effects-template.js
 * @description 기대효과 서술 템플릿.
 * 수치 보장 없이 일반적 근거만 서술하는 기대효과 섹션을 생성한다.
 */

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
