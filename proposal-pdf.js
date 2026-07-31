/**
 * @file proposal-pdf.js
 * @description 설득형 제안서 PDF 템플릿.
 * 표지→문제진단→전략및근거→크리에이티브→기대효과→원칙부록 순서의 설득 논리를 따른다.
 */

/**
 * 설득형 제안서 PDF 생성 (Wave 2 업데이트)
 * @param {Object} data - 추가 데이터
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

/**
 * 표지 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Object} state - appState 객체
 */
function renderCoverPage(doc, state) {
  // 배경색 (다크테마)
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
  
  // 하단 슬로건
  doc.setFontSize(10);
  doc.text('감이 아니라 논리로 만든 제안서', 105, 200, { align: 'center' });
  
  // 브랜드 신뢰 요소 (있는 경우)
  if (state.trustFactors && state.trustFactors.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(state.trustFactors.join(' | '), 105, 220, { align: 'center' });
  }
}

/**
 * 문제진단 섹션 렌더링 (R25) - Wave 2 템플릿 사용
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Object} state - appState 객체
 * @param {Object} data - 추가 데이터
 */
function renderProblemDiagnosis(doc, state, data) {
  const problemData = generateProblemDiagnosisData(state);
  renderProblemDiagnosisPDF(doc, problemData, PROPOSAL_LAYOUT.margin.top);
}

/**
 * 전략 및 근거 섹션 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Object} state - appState 객체
 * @param {Array} rationale - 당위성 근거 배열
 */
function renderStrategyAndRationale(doc, state, rationale) {
  const marginLeft = 20;
  const contentWidth = 170;
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('전략 및 근거', marginLeft, 30);
  
  doc.setDrawColor(200);
  doc.line(marginLeft, 35, marginLeft + contentWidth, 35);
  
  let y = 45;
  
  // 크리에이티브 전략
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('크리에이티브 전략', marginLeft, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  const conceptText = state.concept || '제품의 핵심 가치';
  const strategyText = `"${conceptText}"를 중심으로, ${state.target || '타겟'}의 공감을 끌어내는 스토리텔링 전략을 적용합니다.`;
  const strategyLines = doc.splitTextToSize(strategyText, contentWidth);
  doc.text(strategyLines, marginLeft, y);
  y += strategyLines.length * 6 + 10;
  
  // 적용된 원칙 근거
  doc.setFont(undefined, 'bold');
  doc.text('적용된 심리적 원칙', marginLeft, y);
  y += 8;
  
  doc.setFont(undefined, 'normal');
  if (rationale && rationale.length > 0) {
    rationale.slice(0, 5).forEach(item => {
      const rationaleText = `${item.principleName}: ${item.reason}`;
      const rationaleLines = doc.splitTextToSize(rationaleText, contentWidth - 10);
      doc.text(rationaleLines, marginLeft + 5, y);
      y += rationaleLines.length * 6 + 4;
    });
  }
  
  // 신뢰 요소
  if (state.trustFactors && state.trustFactors.length > 0) {
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text('브랜드 신뢰 요소', marginLeft, y);
    y += 8;
    
    doc.setFont(undefined, 'normal');
    const trustText = state.trustFactors.join(', ');
    doc.text(trustText, marginLeft, y);
  }
}

/**
 * 구현된 크리에이티브 섹션 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Array} scenes - 대본 씬 배열
 * @param {Object} state - appState 객체
 */
function renderCreativeImplementation(doc, scenes, state) {
  const marginLeft = 20;
  const contentWidth = 170;
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('구현된 크리에이티브', marginLeft, 30);
  
  doc.setDrawColor(200);
  doc.line(marginLeft, 35, marginLeft + contentWidth, 35);
  
  let y = 45;
  
  // 대본 헤더
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('대본', marginLeft, y);
  y += 8;
  
  // 각 씬 렌더링
  scenes.forEach(scene => {
    // 페이지 넘김 검사
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    // 타임라인
    doc.setFont(undefined, 'bold');
    doc.text(`[${scene.time}] ${scene.type.toUpperCase()}`, marginLeft, y);
    y += 6;
    
    // 대사
    doc.setFont(undefined, 'normal');
    const dialogueLines = doc.splitTextToSize(scene.dialogue, contentWidth - 10);
    doc.text(dialogueLines, marginLeft + 5, y);
    y += dialogueLines.length * 5 + 3;
    
    // 연출지시
    doc.setTextColor(100);
    const directionLines = doc.splitTextToSize(`연출: ${scene.direction}`, contentWidth - 10);
    doc.text(directionLines, marginLeft + 5, y);
    y += directionLines.length * 5 + 8;
    
    doc.setTextColor(0);
  });
}

/**
 * 기대효과 섹션 렌더링 (R26) - Wave 2 템플릿 사용
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Array} rationale - 당위성 근거 배열
 */
function renderExpectedEffects(doc, rationale) {
  const effectsData = generateExpectedEffectsData(rationale);
  renderExpectedEffectsPDF(doc, effectsData, PROPOSAL_LAYOUT.margin.top);
}

/**
 * 부록: 원칙 전체 리스트 렌더링
 * @param {jsPDF} doc - jsPDF 인스턴스
 * @param {Array} principles - 26개 원칙 배열
 * @param {Array} rationale - 당위성 근거 배열
 */
function renderPrinciplesAppendix(doc, principles, rationale) {
  const marginLeft = 20;
  const contentWidth = 170;
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('부록: 마케팅 원칙 전체 리스트', marginLeft, 30);
  
  doc.setDrawColor(200);
  doc.line(marginLeft, 35, marginLeft + contentWidth, 35);
  
  let y = 45;
  
  principles.forEach(principle => {
    // 페이지 넘김 검사
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    // 원칙 이름
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${principle.id}. ${principle.name}`, marginLeft, y);
    y += 6;
    
    // 설명
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const descLines = doc.splitTextToSize(principle.description, contentWidth - 10);
    doc.text(descLines, marginLeft + 5, y);
    y += descLines.length * 5 + 3;
    
    // 이 제품에 적용된 근거
    const rationaleItem = rationale.find(r => r.principleId === principle.id);
    if (rationaleItem) {
      doc.setTextColor(80, 80, 80);
      const reasonLines = doc.splitTextToSize(`적용 근거: ${rationaleItem.reason}`, contentWidth - 15);
      doc.text(reasonLines, marginLeft + 10, y);
      y += reasonLines.length * 5 + 5;
      doc.setTextColor(0);
    }
    
    y += 3;
  });
}

// 글로벌 스코프 노출
if (typeof window !== 'undefined') {
  window.downloadProposalPDF = downloadProposalPDF;
}
