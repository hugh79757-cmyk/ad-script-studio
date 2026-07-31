/**
 * @file problem-diagnosis-template.js
 * @description 문제진단 섹션 템플릿.
 * 리뷰 발췌 + 타겟 정보를 기반으로 문제진단 섹션을 동적으로 구성한다.
 */

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
