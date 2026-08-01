// 원인 진단: 버튼 클릭 직후 콘솔/pageerror/네트워크 전부 캡처 + 60초 타임아웃
// 사용법: node test-pdf-diagnose2.mjs <url>
//   예: node test-pdf-diagnose2.mjs https://ad-script-studio.vercel.app
//       node test-pdf-diagnose2.mjs http://localhost:8000
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = process.argv[2] || 'https://ad-script-studio.vercel.app';
const DOWNLOAD_TIMEOUT = 60000; // 60초

(async () => {
  console.log(`=== 원인 진단: ${BASE_URL} (다운로드 타임아웃 ${DOWNLOAD_TIMEOUT / 1000}초) ===\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 950 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  // ---- 1. 콘솔/pageerror/네트워크 전부 캡처 (클릭 시점 구분 위해 타임스탬프) ----
  const logs = [];
  const t0 = Date.now();
  const stamp = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;

  page.on('console', msg => {
    logs.push({ kind: 'console', type: msg.type(), text: msg.text(), at: stamp() });
    console.log(`[${stamp()}][console:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    logs.push({ kind: 'pageerror', text: String(err.stack || err), at: stamp() });
    console.error(`[${stamp()}][pageerror] ${err.stack || err}`);
  });
  page.on('dialog', async dialog => {
    logs.push({ kind: 'dialog', text: dialog.message(), at: stamp() });
    console.log(`[${stamp()}][dialog:${dialog.type()}] ${dialog.message()}`);
    await dialog.dismiss();
  });
  page.on('request', req => {
    const url = req.url();
    if (/jspdf|notosans|noto-sans|\.ttf|\.woff|font|github|jsdelivr|cdnjs|google/i.test(url)) {
      logs.push({ kind: 'request', url, at: stamp() });
      console.log(`[${stamp()}][request] ${req.method()} ${url}`);
    }
  });
  page.on('requestfailed', req => {
    const url = req.url();
    if (/jspdf|notosans|\.ttf|\.woff|font|github|jsdelivr|cdnjs/i.test(url)) {
      logs.push({ kind: 'requestfailed', url, err: req.failure()?.errorText, at: stamp() });
      console.log(`[${stamp()}][requestFAILED] ${url} → ${req.failure()?.errorText}`);
    }
  });
  page.on('response', resp => {
    const url = resp.url();
    if (/jspdf|notosans|\.ttf|\.woff|font|github|jsdelivr|cdnjs/i.test(url)) {
      logs.push({ kind: 'response', url, status: resp.status(), at: stamp() });
      console.log(`[${stamp()}][response] ${resp.status()} ${url}`);
    }
  });
  page.on('download', download => {
    console.log(`[${stamp()}][DOWNLOAD EVENT] 파일명: ${download.suggestedFilename()}`);
  });

  try {
    // ---- 페이지 로드 ----
    console.log('\n--- 1. 페이지 로드 ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // ---- 로드 후 상태 확인 ----
    const preState = await page.evaluate(() => ({
      jspdf: typeof window.jspdf,
      proposalPdfBtn: !!document.getElementById('proposalPdfBtn'),
      modeToggle: document.getElementById('modeToggle')?.checked,
      hasAppPrinciples: !!window.appPrinciples,
    }));
    console.log('로드 후 상태:', JSON.stringify(preState));

    // ---- 수동 모드 보장 ----
    const modeChecked = await page.$eval('#modeToggle', el => el.checked).catch(() => false);
    if (modeChecked) {
      await page.click('.mode-toggle-container .toggle-switch');
      await page.waitForTimeout(300);
      console.log('→ 수동 모드로 전환');
    }

    // ---- 입력 채우기 + 수동 생성 (API 불필요) ----
    console.log('\n--- 2. 입력 + 제안서 생성 ---');
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

    await page.click('.generate-btn');
    await page.waitForTimeout(2000);

    const postState = await page.evaluate(() => ({
      hasAppRationale: !!window.appRationale,
      hasAppScenes: !!window.appScenes,
      appScenesLength: window.appScenes?.length,
      appRationaleCount: window.appRationale?.generated?.length ?? null,
      proposalPdfBtn: !!document.getElementById('proposalPdfBtn'),
      jspdf: typeof window.jspdf,
    }));
    console.log('생성 후 상태:', JSON.stringify(postState));

    // ---- 3. 버튼 클릭 + 60초 대기 (클릭 시점 이후 로그가 핵심) ----
    console.log('\n--- 3. 버튼 클릭 + 60초 다운로드 대기 ---');
    const btn = await page.$('#proposalPdfBtn');
    let clickBefore = 0;
    if (!btn) {
      console.log('❌ #proposalPdfBtn 없음 — 클릭 불가');
    } else {
      clickBefore = logs.length;
      await btn.click();
      console.log(`[${stamp()}] 🔘 클릭됨 — 이후 로그 ${clickBefore}번째부터 추적`);

      const downloadOk = await Promise.race([
        page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }).then(d => ({ ok: true, filename: d.suggestedFilename() })),
        new Promise(res => setTimeout(() => res({ ok: false }), DOWNLOAD_TIMEOUT)),
      ]);

      if (downloadOk.ok) {
        console.log(`\n✅ [${stamp()}] 다운로드 발생: ${downloadOk.filename}`);
      } else {
        console.log(`\n❌ [${stamp()}] ${DOWNLOAD_TIMEOUT / 1000}초 내 다운로드 미발생`);
      }
    }

    // ---- 4. 클릭 직후부터의 로그만 재출력 ----
    console.log('\n=== 클릭 이후 콘솔/에러/네트워크 로그 전체 ===');
    if (logs.slice(clickBefore ?? 0).length === 0) {
      console.log('(클릭 이후 캡처된 로그 없음 — 이 자체가 핵심 단서)');
    } else {
      logs.slice(clickBefore ?? 0).forEach(l => {
        if (l.kind === 'console') console.log(`  [${l.at}][console:${l.type}] ${l.text}`);
        else if (l.kind === 'pageerror') console.log(`  [${l.at}][pageerror] ${l.text}`);
        else if (l.kind === 'dialog') console.log(`  [${l.at}][dialog] ${l.text}`);
        else if (l.kind === 'request') console.log(`  [${l.at}][req] ${l.url}`);
        else if (l.kind === 'response') console.log(`  [${l.at}][resp ${l.status}] ${l.url}`);
        else if (l.kind === 'requestfailed') console.log(`  [${l.at}][reqFAIL] ${l.url} → ${l.err}`);
        else console.log(`  [${l.at}][${l.kind}] ${JSON.stringify(l)}`);
      });
    }

    // ---- 5. 폰트 CDN 단독 점검 (페이지 내에서 직접 fetch) ----
    console.log('\n=== 폰트 CDN 단독 fetch 점검 ===');
    const fontCheck = await page.evaluate(async () => {
      const urls = [
        'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf',
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
      ];
      const results = [];
      for (const u of urls) {
        const t0 = performance.now();
        try {
          const r = await fetch(u, { method: 'HEAD' });
          results.push({ url: u, status: r.status, ms: Math.round(performance.now() - t0), ok: r.ok });
        } catch (e) {
          results.push({ url: u, error: e.message, ms: Math.round(performance.now() - t0), ok: false });
        }
      }
      return results;
    });
    fontCheck.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} [${r.ms}ms] ${r.status ?? 'ERR'} ${r.url} ${r.error ?? ''}`));

    await browser.close();
    console.log('\n=== 진단 완료 ===');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 진단 중 오류:', err.message);
    await browser.close();
    process.exit(1);
  }
})();
