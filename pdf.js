/**
 * @file pdf.js
 * @description jsPDF wrapper for client-side PDF generation with Korean font support.
 */

/**
 * Checks whether jsPDF is loaded on window.
 * @returns {boolean} true if window.jspdf is defined
 */
function checkJsPdfLoaded() {
  return typeof window.jspdf !== 'undefined';
}

/**
 * Loads Korean (NotoSansKR) font from CDN and registers it with jsPDF.
 * @returns {Promise<boolean>} true if font loaded and registered successfully
 */
async function loadKoreanFont() {
  try {
    const fontUrl =
      'https://cdn.jsdelivr.net/gh/projectnoonun/noonfonts_one@1.0/NotoSansKR-Regular.woff';

    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Font fetch failed: ${response.status} ${response.statusText}`);
    }

    const fontData = await response.arrayBuffer();

    if (!checkJsPdfLoaded()) {
      throw new Error('jsPDF is not loaded. Cannot register Korean font.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add the font to jsPDF using the raw font data.
    // jsPDF addFont accepts the font file as a string or ArrayBuffer;
    // using a data URI with base64-encoded content provides broader compatibility.
    const base64 = arrayBufferToBase64(fontData);
    const dataUri = `url(data:font/woff;charset=utf-8;base64,${base64})`;

    doc.addFileToVFS('NotoSansKR-Regular.woff', base64);
    doc.addFont('NotoSansKR-Regular.woff', 'NotoSansKR', 'normal');
    doc.setFont('NotoSansKR');

    console.log('[pdf.js] Korean font loaded and registered successfully.');
    return true;
  } catch (error) {
    console.error('[pdf.js] Failed to load Korean font:', error);
    return false;
  }
}

/**
 * Converts an ArrayBuffer to a base64-encoded string.
 * @param {ArrayBuffer} buffer
 * @returns {string} Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to avoid stack issues
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    const chunkBinary = String.fromCharCode.apply(null, chunk);
    binary += chunkBinary;
  }

  return btoa(binary);
}

/**
 * Generates and downloads a PDF for an advertising script.
 *
 * @param {Array<Object>} scenes - Array of scene objects
 * @param {Object} state - Application state containing brand/product/target info
 * @param {string} [title='광고 기획안'] - Document title
 * @returns {Promise<void>}
 */
async function downloadScriptPDF(scenes, state, title = '광고 기획안') {
  if (!checkJsPdfLoaded()) {
    alert('jsPDF가 로드되지 않았습니다. PDF를 생성할 수 없습니다.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Korean font should already be registered; fall back to a safe font if not.
  try {
    doc.setFont('NotoSansKR');
  } catch {
    // Font not yet registered; proceed with default font (Korean may render incorrectly).
    console.warn('[pdf.js] NotoSansKR font not found. Using default font.');
  }

  const marginLeft = 20;
  const contentWidth = 170;
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(title, marginLeft, y);
  y += 12;

  // Brand / Product / Target info
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const brand = state?.brandName || '';
  const product = state?.productName || '';
  const target = state?.target || '';

  if (brand) {
    doc.text(`브랜드: ${brand}`, marginLeft, y);
    y += 6;
  }
  if (product) {
    doc.text(`제품: ${product}`, marginLeft, y);
    y += 6;
  }
  if (target) {
    doc.text(`타겟: ${target}`, marginLeft, y);
    y += 6;
  }

  y += 4;

  // Divider line
  doc.setDrawColor(200);
  doc.line(marginLeft, y, marginLeft + contentWidth, y);
  y += 8;

  // Section header
  const sectionHeaderFontSize = 14;
  // Loop through scenes
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Page break check
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Scene time label + type (bold)
    const timeLabel = `[${scene.time || ''}] ${scene.type || ''}`;
    doc.setFontSize(sectionHeaderFontSize);
    doc.setFont(undefined, 'bold');
    doc.text(timeLabel, marginLeft, y);
    y += 7;

    // Dialogue text (normal, word-wrapped at 170mm)
    if (scene.dialogue) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0);
      const wrappedDialogue = doc.splitTextToSize(scene.dialogue, contentWidth);
      const dialogueHeight = doc.getTextDimensions(wrappedDialogue).h;

      if (y + dialogueHeight > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(wrappedDialogue, marginLeft, y);
      y += dialogueHeight + 3;
    }

    // Direction text (gray, prefixed with "연출: ")
    if (scene.direction) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const directionText = `연출: ${scene.direction}`;
      const wrappedDirection = doc.splitTextToSize(directionText, contentWidth);
      const directionHeight = doc.getTextDimensions(wrappedDirection).h;

      if (y + directionHeight > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(wrappedDirection, marginLeft, y);
      y += directionHeight + 2;
      doc.setTextColor(0);
    }

    y += 4;
  }

  // Footer: generation date (ko-KR) + "AD SCRIPT STUDIO"
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footerY = 290;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);

    const generatedDate = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const footerLeft = `${generatedDate} 생성`;
    const footerRight = 'AD SCRIPT STUDIO';

    doc.text(footerLeft, marginLeft, footerY);
    doc.text(footerRight, marginLeft + contentWidth, footerY, { align: 'right' });

    doc.setTextColor(0);
  }

  // Save the PDF
  const brandName = state?.brandName || 'brand';
  const productName = state?.productName || 'product';
  const fileName = `${brandName}_${productName}_기획안.pdf`;

  doc.save(fileName);
}

// Expose to global scope
window.downloadScriptPDF = downloadScriptPDF;
