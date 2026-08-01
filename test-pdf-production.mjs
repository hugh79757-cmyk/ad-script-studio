// Playwright로 프로덕션 PDF 한글 폰트 검증 (실제 버튼 클릭 흐름 — E2E)
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

const BASE_URL = process.env.BASE_URL || 'https://ad-script-studio.vercel.app';

(async () => {
  console.log(`=== 프로덕션 PDF 한글 폰트 검증 (Playwright) ===\nURL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() !== 'log') console.log(`[Browser ${msg.type()}] ${text}`);
  });

  page.on('pageerror', err => {
    consoleErrors.push(String(err));
    console.error('[Browser Error]', err.message);
  });

  page.on('dialog', async dialog => {
    console.log(`[Dialog ${dialog.type()}] ${dialog.message()}`);
    await dialog.dismiss();
  });

  // 다운로드 이벤트 → 저장 + 한글 검증
  page.on('download', async download => {
    const path = `/tmp/test-proposal-${Date.now()}.pdf`;
    await download.saveAs(path);
    console.log(`\n✅ PDF 다운로드 완료: ${path}`);
    console.log(`📄 파일 크기: ${fs.statSync(path).size} bytes`);

    try {
      const text = execSync(`pdftotext "${path}" -`, { encoding: 'utf8' });
      const hasKorean = /[가-힣]/.test(text);
      console.log(`\n${hasKorean ? '✅' : '❌'} 한글 포함: ${hasKorean}`);
      const keywords = ['라네즈', '워터뱅크', '전략', '제안서', '근거', '원칙'];
      keywords.forEach(k => {
        console.log(`  ${text.includes(k) ? '✅' : '❌'} "${k}": ${text.includes(k) ? '포함됨' : '없음'}`);
      });
      console.log('\n=== PDF 텍스트 (처음 800자) ===');
      console.log(text.substring(0, 800));
    } catch (e) {
      console.log('⚠️ pdftotext 없음 - 텍스트 추출 건너뜀');
    }
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
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
    console.log('🔄 제안서 생성 중 (자동 모드, API 호출 — 최대 240초)...');
    await page.click('.generate-btn');

    // 결과 대기 (최대 240초)
    let done = false;
    for (let i = 0; i < 240; i++) {
      await page.waitForTimeout(1000);
      const strategyContent = await page.$eval('#strategy', el => el.innerText).catch(() => '');
      if (strategyContent.length > 500) {
        console.log(`✅ 제안서 생성 완료 (${i + 1}초 소요)`);
        done = true;
        break;
      }
      if (i % 20 === 0 && i > 0) {
        console.log(`  ⏳ 대기 중... ${i + 1}초 (내용 길이: ${strategyContent.length})`);
      }
    }
    if (!done) throw new Error('제안서 생성 타임아웃 (240초)');

    const finalStrategy = await page.$eval('#strategy', el => el.innerText).catch(() => '');
    console.log(`📄 생성된 전략 내용 길이: ${finalStrategy.length}자`);

    // window 데이터 상태 확인 (실제 앱은 window.appState 미노출 — appState는 모듈 스코프)
    const windowData = await page.evaluate(() => ({
      hasAppRationale: !!window.appRationale,
      hasAppScenes: !!window.appScenes,
      appRationaleKeys: window.appRationale ? Object.keys(window.appRationale) : null,
      appScenesLength: window.appScenes ? window.appScenes.length : 0,
      hasAppPrinciples: !!window.appPrinciples,
      appPrinciplesLength: window.appPrinciples ? window.appPrinciples.length : 0,
    }));
    console.log('🔍 Window 데이터 상태:', JSON.stringify(windowData));

    // PDF 버튼 존재 확인 + 실제 클릭 → 다운로드 이벤트 대기 (60초)
    const btn = await page.$('#proposalPdfBtn');
    if (!btn) throw new Error('PDF 버튼 없음');
    console.log('✅ #proposalPdfBtn 버튼 존재 확인');

    console.log('🔄 PDF 버튼 클릭, 다운로드 대기 (60초)...');
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await btn.click();
    const download = await downloadPromise;
    console.log(`✅ 다운로드 발생: ${download.suggestedFilename()}`);
    // download 이벤트 핸들러가 저장+검증 수행 (위에 등록됨)
    await page.waitForTimeout(5000); // 저장/검증 로그 출력 대기

    if (consoleErrors.length > 0) {
      console.log(`\n⚠️ pageerror ${consoleErrors.length}건 발생`);
    } else {
      console.log('\n✅ pageerror 0건');
    }

    await browser.close();
    console.log('\n=== 검증 완료 ===');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 검증 실패:', err.message);
    console.error('📋 마지막 콘솔 로그:');
    consoleLogs.slice(-10).forEach(l => console.log(`  [${l.type}] ${l.text}`));
    await browser.close();
    process.exit(1);
  }
})();