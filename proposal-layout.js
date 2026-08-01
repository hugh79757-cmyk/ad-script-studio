/**
 * @file proposal-layout.js
 * @description 제안서 PDF 레이아웃 시스템.
 * 페이지 설정, 색상 팔레트, 폰트 크기, 간격 등을 정의한다.
 */

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
  
  // 페이지 마진 (호환성: page.margin과 동일 값. proposal-pdf.js 등이 PROPOSAL_LAYOUT.margin.* 로 접근)
  margin: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
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
