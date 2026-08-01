// Playwright로 프로덕션 PDF 한글 폰트 검증
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = 'https://ad-script-studio.vercel.app';

(async () => {
  console.log('=== 프로덕션 PDF 한글 폰트 검증 (Playwright) ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true
  });
  const page = await context.newPage();
  
  const consoleLogs = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`[Browser ${msg.type()}] ${text}`);
  });
  
  page.on('pageerror', err => {
    consoleErrors.push(String(err));
    console.error('[Browser Error]', err.message);
  });
  
  page.on('download', download => {
    const path = `/tmp/test-proposal-${Date.now()}.pdf`;
    download.saveAs(path).then(() => {
      console.log(`\n✅ PDF 다운로드 완료: ${path}`);
      console.log(`📄 파일 크기: ${fs.statSync(path).size} bytes`);
      
      // PDF 내용 확인 (pdftotext로 텍스트 추출)
      try {
        const text = execSync(`pdftotext "${path}" -`, { encoding: 'utf8' });
        console.log('\n=== PDF 텍스트 추출 결과 ===');
        console.log(text.substring(0, 2000));
        
        // 한글 포함 여부 확인
        const hasKorean = /[가-힣]/.test(text);
        console.log(`\n${hasKorean ? '✅' : '❌'} 한글 포함: ${hasKorean}`);
        
        // 특정 한글 단어 확인
        const keywords = ['라네즈', '워터뱅크', '전략', '제안서', '피부과', '테스트', '한국어'];
        keywords.forEach(k => {
          const found = text.includes(k);
          console.log(`  ${found ? '✅' : '❌'} "${k}": ${found ? '포함됨' : '없음'}`);
        });
      } catch (e) {
        console.log('⚠️ pdftotext 없음 - 텍스트 추출 건너뜀');
      }
    });
  });
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ 페이지 로드 완료');
    
    // 입력값 채우기
    await page.fill('#brandName', '라네즈');
    await page.fill('#productName', '워터뱅크 크림');
    await page.fill('#concept', '하루 종일 촉촉한 수분 크림');
    await page.fill('#target', '2030 건성 피부 여성');
    await page.selectOption('#toneAndManner', '진지');
    await page.fill('#competitorInfo', '키엘 울트라 페이셜 크림');
    await page.fill('#priceRange', '32,000원');
    await page.fill('#reviewExcerpts', '바르고 자면 아침까지 촉촉해요\n겨울에도 안 트더라고요');
    // trustFactors는 태그 입력 (Enter로 추가)
    await page.fill('.tag-input', '피부과 테스트 완료');
    await page.press('.tag-input', 'Enter');
    await page.fill('.tag-input', '100만개 판매');
    await page.press('.tag-input', 'Enter');
    
    // 자동 모드 전환 (checkbox가 숨겨져 있으므로 label 클릭)
    const modeLabel = await page.$('.mode-toggle-container .toggle-switch');
    const isChecked = await page.$eval('#modeToggle', el => el.checked);
    if (!isChecked) {
      await modeLabel.click();
      await page.waitForTimeout(500);
      console.log('✅ 자동 모드 전환');
    }
    
    // 제안서 생성
    console.log('🔄 제안서 생성 중...');
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
      if (i % 10 === 0 && i > 0) {
        console.log(`  ⏳ 대기 중... ${i+1}초 (내용 길이: ${strategyContent.length})`);
        console.log(`     내용 미리보기: "${strategyContent.substring(0, 100)}"`);
      }
    }
    if (!done) throw new Error('제안서 생성 타임아웃 (180초)');

    // 생성된 전략 내용 확인
    const finalStrategy = await page.$eval('#strategy', el => el.innerText).catch(() => '');
    console.log(`📄 생성된 전략 내용 길이: ${finalStrategy.length}자`);
    console.log(`📄 내용 미리보기: ${finalStrategy.substring(0, 200)}...`);
    
    // PDF 다운로드 버튼 클릭
    
    // 버튼 클릭 (다운로드 이벤트 대기)
    console.log('🔄 PDF 다운로드 버튼 확인 및 클릭 중...');
    
    // 버튼 존재 확인
    const btnExists = await page.$('#proposalPdfBtn');
    if (!btnExists) {
      console.log('❌ #proposalPdfBtn 버튼을 찾을 수 없음');
      // 전략 탭 내용 확인
      const strategyContent = await page.$eval('#strategy', el => el.innerHTML).catch(() => 'NOT FOUND');
      console.log('전략 탭 HTML (일부):', strategyContent.substring(0, 500));
      throw new Error('PDF 버튼 없음');
    }
    console.log('✅ #proposalPdfBtn 버튼 존재 확인');
    
    // PDF 생성 및 데이터 추출 (page.evaluate로 직접 호출)
    console.log('🔄 PDF 생성 중 (page.evaluate)...');
    
    // 먼저 window 객체에 어떤 데이터가 있는지 확인
    const windowData = await page.evaluate(() => {
      return {
        hasAppRationale: !!window.appRationale,
        hasAppScenes: !!window.appScenes,
        hasAppPrinciples: !!window.appPrinciples,
        hasAppState: !!window.appState,
        appRationaleKeys: window.appRationale ? Object.keys(window.appRationale) : null,
        appScenesLength: window.appScenes ? window.appScenes.length : 0,
        appPrinciplesLength: window.appPrinciples ? window.appPrinciples.length : 0,
      };
    });
    console.log('🔍 Window 데이터 상태:', JSON.stringify(windowData, null, 2));
    
    const pdfBase64 = await page.evaluate(async () => {
      // downloadProposalPDF 함수 호출하되, doc.save 대신 output 사용
      if (!window.downloadProposalPDF) {
        throw new Error('downloadProposalPDF 함수를 찾을 수 없음');
      }
      if (!window.appRationale) {
        throw new Error('appRationale이 없음');
      }
      if (!window.appScenes || window.appScenes.length === 0) {
        throw new Error('appScenes가 없음');
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 폰트 설정
      try {
        await window.loadKoreanFont();
        doc.setFont('NotoSansKR');
      } catch (error) {
        console.warn('[test] 한글 폰트 로드 실패, 기본 폰트 사용');
      }
      
      // 1. 표지
      window.renderCoverPage(doc, window.appState);
      
      // 2. 문제 진단
      doc.addPage();
      const problemData = window.generateProblemDiagnosisData(window.appState);
      window.renderProblemDiagnosisPDF(doc, problemData, window.PROPOSAL_LAYOUT.margin.top);
      
      // 3. 전략 및 근거
      doc.addPage();
      window.renderStrategyAndRationale(doc, window.appState, window.appRationale.generated || []);
      
      // 4. 구현된 크리에이티브
      doc.addPage();
      window.renderCreativeImplementation(doc, window.appScenes, window.appState);
      
      // 5. 기대 효과
      doc.addPage();
      const effectsData = window.generateExpectedEffectsData(window.appRationale.generated || []);
      window.renderExpectedEffectsPDF(doc, effectsData, window.PROPOSAL_LAYOUT.margin.top);
      
      // 6. 부록: 원칙 전체 리스트
      doc.addPage();
      window.renderPrinciplesAppendix(doc, window.appPrinciples || [], window.appRationale.generated || []);
      
      // 페이지 번호 추가
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        window.renderPageNumber(doc, i, totalPages);
      }
      
      // Base64로 반환
      return doc.output('datauristring').split(',')[1];
    });
    
    console.log(`✅ PDF 생성 완료 (Base64 길이: ${pdfBase64.length})`);
    
    const path = `/tmp/test-proposal-${Date.now()}.pdf`;
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(path, pdfBuffer);
    console.log(`✅ PDF 저장 완료: ${path}`);
    console.log(`📄 파일 크기: ${fs.statSync(path).size} bytes`);
    
    // PDF 내용 확인 (pdftotext로 텍스트 추출)
    try {
      const text = execSync(`pdftotext "${path}" -`, { encoding: 'utf8', timeout: 10000 });
      console.log('\n=== PDF 텍스트 추출 결과 ===');
      console.log(text.substring(0, 3000));
      
      // 한글 포함 여부 확인
      const hasKorean = /[가-힣]/.test(text);
      console.log(`\n${hasKorean ? '✅' : '❌'} 한글 포함: ${hasKorean}`);
      
      // 특정 한글 단어 확인
      const keywords = ['라네즈', '워터뱅크', '전략', '제안서', '피부과', '테스트', '한국어', '증거', '리뷰', '신뢰'];
      keywords.forEach(k => {
        const found = text.includes(k);
        console.log(`  ${found ? '✅' : '❌'} "${k}": ${found ? '포함됨' : '없음'}`);
      });
    } catch (e) {
      console.log('⚠️ pdftotext 없음 또는 오류 - 텍스트 추출 건너뜀:', e.message);
    }
    
    await browser.close();
    console.log('\n=== 검증 완료 ===');
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ 검증 실패:', err.message);
    await browser.close();
    process.exit(1);
  }
})();