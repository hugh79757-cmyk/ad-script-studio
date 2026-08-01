// 로컬 검증: jsPDF CDN 수정 + PDF 다운로드 (수동 모드 — API 불필요)
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

(async () => {
  console.log('=== 로컬 jsPDF + PDF 다운로드 검증 ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  
  const fontRequests = [];
  page.on('response', response => {
    const url = response.url();
    if (url.includes('jspdf') || url.includes('fontsource') || url.includes('.woff')) {
      fontRequests.push({ url, status: response.status() });
      console.log(`[CDN] ${response.status()} ${url}`);
    }
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('jspdf') || url.includes('fontsource') || url.includes('.woff')) {
      console.log(`[CDN FAIL] ${url} → ${request.failure()?.errorText}`);
    }
  });
  page.on('dialog', async dialog => {
    console.log(`[Dialog ${dialog.type()}] ${dialog.message()}`);
    await dialog.dismiss();
  });
  page.on('pageerror', err => console.error('[PageError]', err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('pdf') || msg.text().includes('font')) {
      console.log(`[Browser ${msg.type()}] ${msg.text()}`);
    }
  });
  
  try {
    // 로컬 서버에서 페이지 로드 (수동 모드 테스트)
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 페이지 로드 완료');
    
    // jsPDF 로드 확인
    const libState = await page.evaluate(() => ({
      jspdf: typeof window.jspdf,
      downloadProposalPDF: typeof window.downloadProposalPDF,
      loadKoreanFont: typeof window.loadKoreanFont,
    }));
    console.log('🔍 라이브러리 상태:', JSON.stringify(libState));
    
    if (libState.jspdf !== 'object' && libState.jspdf !== 'function') {
      throw new Error('jsPDF가 로드되지 않음 — CDN 수정 실패');
    }
    console.log('✅ jsPDF 로드 성공!');
    
    // 수동 모드 확인 (modeToggle unchecked = manual)
    const modeChecked = await page.$eval('#modeToggle', el => el.checked).catch(() => false);
    if (modeChecked) {
      await page.click('.mode-toggle-container .toggle-switch');
      await page.waitForTimeout(300);
      console.log('✅ 수동 모드로 전환');
    } else {
      console.log('✅ 수동 모드 확인');
    }
    
    // 입력값 채우기
    await page.fill('#brandName', '라네즈');
    await page.fill('#productName', '워터뱅크 크림');
    await page.fill('#concept', '하루 종일 촉촉한 수분 크림');
    await page.fill('#target', '2030 건성 피부 여성');
    await page.selectOption('#toneAndManner', '진지');
    await page.fill('#competitorInfo', '키엘 울트라 페이셜 크림');
    await page.fill('#priceRange', '32,000원');
    await page.fill('#reviewExcerpts', '바르고 자면 아침까지 촉촉해요\n겨울에도 안 트더라고요');
    await page.fill('.tag-input', '피부과 테스트 완료');
    await page.press('.tag-input', 'Enter');
    await page.fill('.tag-input', '100만개 판매');
    await page.press('.tag-input', 'Enter');
    
    // 수동 모드 생성 (템플릿 기반 — API 불필요)
    console.log('\n🔄 수동 모드로 제안서 생성 중...');
    await page.click('.generate-btn');
    
    // 결과 대기 (수동 모드라 즉시 완료)
    await page.waitForTimeout(2000);
    
    const windowData = await page.evaluate(() => ({
      hasAppRationale: !!window.appRationale,
      hasAppScenes: !!window.appScenes,
      appScenesLength: window.appScenes ? window.appScenes.length : 0,
      appRationaleCount: window.appRationale?.generated?.length ?? null,
      proposalPdfBtnExists: !!document.getElementById('proposalPdfBtn'),
      strategyLen: document.getElementById('strategy')?.innerText.length || 0,
    }));
    console.log('🔍 window 상태:', JSON.stringify(windowData));
    
    // PDF 버튼 클릭 → 다운로드 대기
    console.log('\n🔄 PDF 버튼 클릭, 다운로드 대기 (60초)...');
    const btnExists = await page.$('#proposalPdfBtn');
    if (!btnExists) {
      throw new Error('PDF 버튼 없음');
    }
    
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await btnExists.click();
    const download = await downloadPromise;
    console.log(`✅ PDF 다운로드 발생! 파일명: ${download.suggestedFilename()}`);
    
    const path = `/tmp/local-proposal-${Date.now()}.pdf`;
    await download.saveAs(path);
    console.log(`✅ 저장 완료: ${path} (${fs.statSync(path).size} bytes)`);
    
    // PDF 텍스트 확인
    try {
      const text = execSync(`pdftotext "${path}" -`, { encoding: 'utf8', timeout: 10000 });
      const hasKorean = /[가-힣]/.test(text);
      console.log(`\n${hasKorean ? '✅' : '❌'} 한글 포함: ${hasKorean}`);
      const keywords = ['라네즈', '전략', '제안서', '근거'];
      keywords.forEach(k => {
        console.log(`  ${text.includes(k) ? '✅' : '❌'} "${k}": ${text.includes(k) ? '포함됨' : '없음'}`);
      });
      console.log('\n=== PDF 텍스트 (처음 500자) ===');
      console.log(text.substring(0, 500));
    } catch (e) {
      console.log('⚠️ pdftotext 오류:', e.message);
    }
    
    await browser.close();
    console.log('\n=== 로컬 검증 완료 ===');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 검증 실패:', err.message);
    console.log('폰트/JS CDN 요청 기록:');
    fontRequests.forEach(f => console.log(`  [${f.status}] ${f.url}`));
    await browser.close();
    process.exit(1);
  }
})();
