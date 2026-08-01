// Playwright 진단: PDF 다운로드가 발생하지 않는 원인 분석
import { chromium } from 'playwright';

const BASE_URL = 'https://ad-script-studio.vercel.app';

(async () => {
  console.log('=== PDF 다운로드 원인 진단 ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  
  // 1. 콘솔 로그 + pageerror 전부 캡처 (클릭 이후 시점 중요)
  const consoleLogs = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`[Browser ${msg.type()}] ${text}`);
  });
  page.on('pageerror', err => {
    pageErrors.push(String(err));
    console.error('[PageError]', err.message);
  });
  
  // 2. dialog (alert) 캡처 — PDF 버튼 클릭 시 alert가 뜨는지 확인
  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    console.log(`[Dialog ${dialog.type()}] ${dialog.message()}`);
    await dialog.dismiss();
  });
  
  // 3. 네트워크 요청/응답 캡처 — 폰트 CDN + jsPDF CDN 상태 확인
  const fontRequests = [];
  const allResponses = [];
  page.on('response', response => {
    const url = response.url();
    const entry = { url, status: response.status() };
    allResponses.push(entry);
    if (url.includes('fontsource') || url.includes('noto-sans-kr') || url.includes('.woff')) {
      fontRequests.push(entry);
      console.log(`[Font CDN] ${response.status()} ${url}`);
    }
    if (url.includes('jspdf') || url.includes('html2canvas')) {
      console.log(`[jsPDF CDN] ${response.status()} ${url}`);
    }
  });
  
  // jsPDF 로드 여부 확인용
  page.on('request', request => {
    const url = request.url();
    if (url.includes('jspdf') || url.includes('html2canvas')) {
      console.log(`[Req] ${request.method()} ${url}`);
    }
  });
  
  // 스크립트 로드 실패 감지
  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('jspdf') || url.includes('fontsource') || url.includes('.woff')) {
      console.log(`[ReqFailed] ${url} → ${request.failure()?.errorText}`);
    }
  });
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('\n✅ 페이지 로드 완료');
    
    // jsPDF 로드 여부 확인
    const jsPdfLoaded = await page.evaluate(() => ({
      jspdf: typeof window.jspdf,
      downloadProposalPDF: typeof window.downloadProposalPDF,
      loadKoreanFont: typeof window.loadKoreanFont,
      scriptCount: document.scripts.length,
      pdfBtnCount: document.querySelectorAll('#proposalPdfBtn').length,
    }));
    console.log('🔍 라이브러리 상태:', JSON.stringify(jsPdfLoaded));
    
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
    
    // 자동 모드 전환
    const modeLabel = await page.$('.mode-toggle-container .toggle-switch');
    const isChecked = await page.$eval('#modeToggle', el => el.checked);
    if (!isChecked) {
      await modeLabel.click();
      await page.waitForTimeout(500);
      console.log('✅ 자동 모드 전환');
    }
    
    // 현재 모드 확인
    const modeInfo = await page.evaluate(() => ({
      mode: window.appState?.mode,
      generateBtnText: document.querySelector('.generate-btn')?.textContent,
    })).catch(() => 'appState 접근 불가');
    console.log('🔍 모드 정보:', JSON.stringify(modeInfo));
    
    // 제안서 생성
    console.log('\n🔄 제안서 생성 중...');
    await page.click('.generate-btn');
    
    // 결과 대기 (최대 180초)
    let done = false;
    for (let i = 0; i < 180; i++) {
      await page.waitForTimeout(1000);
      const strategyContent = await page.$eval('#strategy', el => el.innerText).catch(() => '');
      if (strategyContent.length > 500) {
        console.log(`✅ 제안서 생성 완료 (${i+1}초 소요)`);
        done = true;
        break;
      }
      if (i % 15 === 0 && i > 0) {
        console.log(`  ⏳ 대기 중... ${i+1}초 (내용 길이: ${strategyContent.length})`);
      }
    }
    if (!done) throw new Error('제안서 생성 타임아웃 (180초)');
    
    // 생성 후 window 데이터 상태 확인 (auto 모드에서 appRationale/appScenes 설정 여부)
    const windowData = await page.evaluate(() => ({
      hasAppRationale: !!window.appRationale,
      hasAppScenes: !!window.appScenes,
      hasAppPrinciples: !!window.appPrinciples,
      hasAppState: !!window.appState,
      appRationaleKeys: window.appRationale ? Object.keys(window.appRationale) : null,
      appScenesLength: window.appScenes ? window.appScenes.length : 0,
      strategyHtml: document.getElementById('strategy')?.innerHTML.substring(0, 200) || 'EMPTY',
      proposalPdfBtnExists: !!document.getElementById('proposalPdfBtn'),
    }));
    console.log('\n🔍 생성 후 window 상태:', JSON.stringify(windowData, null, 2));
    
    // 4. PDF 버튼 클릭 전 콘솔 로그 기록 지점 표시
    console.log('\n=== PDF 버튼 클릭 직전까지의 콘솔 로그 수: ' + consoleLogs.length + ' ===');
    
    // PDF 버튼 클릭 (타임아웃 60초로 진단 — 느린지 vs 멈춘건지)
    console.log('\n🔄 PDF 버튼 클릭 (다운로드 대기 최대 60초)...');
    
    const btnExists = await page.$('#proposalPdfBtn');
    if (!btnExists) {
      console.log('❌ #proposalPdfBtn 버튼을 찾을 수 없음');
      throw new Error('PDF 버튼 없음');
    }
    console.log('✅ #proposalPdfBtn 버튼 존재 확인');
    
    // 콘솔/페이지에러 리스너가 클릭 후 로그를 잡는지 확인
    console.log('✅ #proposalPdfBtn 버튼 클릭!');
    const clickTime = Date.now();
    let downloadEvent = null;
    let downloadError = null;
    
    // 실제 클릭
    await btnExists.click().catch(e => {
      console.log('❌ 클릭 실패:', e.message);
    });
    
    try {
      downloadEvent = await Promise.race([
        page.waitForEvent('download', { timeout: 60000 }).then(d => ({ ok: true, d })),
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: false, reason: 'timeout' }), 60000);
        })
      ]);
    } catch (e) {
      downloadError = e;
    }
    
    // 클릭 후 콘솔 로그 수 변화 확인
    console.log(`\n📊 클릭 후 ${Date.now() - clickTime}ms 경과`);
    console.log(`📊 클릭 후 콘솔 로그 수: ${consoleLogs.length}`);
    
    if (downloadEvent && downloadEvent.ok) {
      const download = downloadEvent.d;
      console.log(`✅ PDF 다운로드 발생! 파일명: ${download.suggestedFilename()}`);
    } else {
      console.log(`❌ PDF 다운로드 미발생 (${downloadError?.message || '60초 타임아웃'})`);
    }
    
    // 진단 결과 요약
    console.log('\n=== 진단 요약 ===');
    console.log(`1. Dialog(alert) 발생: ${dialogs.length}건`);
    dialogs.forEach(d => console.log(`   - [${d.type}] ${d.message}`));
    
    console.log(`2. 페이지 에러: ${pageErrors.length}건`);
    pageErrors.forEach(e => console.log(`   - ${e}`));
    
    console.log(`3. 폰트 CDN 요청: ${fontRequests.length}건`);
    fontRequests.forEach(f => console.log(`   - [${f.status}] ${f.url}`));
    
    // jsPDF 로드 상태
    const jspdfResp = allResponses.find(r => r.url.includes('jspdf'));
    console.log(`4. jsPDF CDN 응답: ${jspdfResp ? `[${jspdfResp.status}] ${jspdfResp.url}` : '응답 없음 (요청 실패 가능성)'}`);
    
    // appRationale 없음 → alert 원인 확인
    if (!windowData.hasAppRationale || !windowData.hasAppScenes) {
      console.log('\n⚠️ 핵심 의심 1: auto 모드에서 window.appRationale/appScenes가 미설정');
      console.log('   → PDF 버튼 핸들러(app.js:482-498)의 guard가 alert를 띄우고 return');
      console.log('   → downloadProposalPDF() 자체가 호출되지 않음 → download 이벤트 미발생');
      console.log('   → 폰트 CDN 문제가 아니라 코드 가드 문제일 가능성 높음');
    }
    
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 진단 실패:', err.message);
    console.log('\n=== 부분 진단 결과 ===');
    console.log(`1. Dialog(alert) 발생: ${dialogs.length}건`);
    dialogs.forEach(d => console.log(`   - [${d.type}] ${d.message}`));
    console.log(`2. 페이지 에러: ${pageErrors.length}건`);
    pageErrors.forEach(e => console.log(`   - ${e}`));
    console.log(`3. 폰트 CDN 요청: ${fontRequests.length}건`);
    fontRequests.forEach(f => console.log(`   - [${f.status}] ${f.url}`));
    const jspdfResp = allResponses.find(r => r.url.includes('jspdf'));
    console.log(`4. jsPDF CDN 응답: ${jspdfResp ? `[${jspdfResp.status}] ${jspdfResp.url}` : '응답 없음 (요청 실패 가능성)'}`);
    console.log(`4. 콘솔 로그: ${consoleLogs.length}건`);
    await browser.close();
    process.exit(1);
  }
})();
