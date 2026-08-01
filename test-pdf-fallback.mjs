// 폴백 안전망 검증: 폰트 파일이 404일 때 PDF가 기본 폰트로라도 생성되는지
// 로컬 서버의 fonts/ 디렉토리를 임시로 잠시 뒤로 옮겼다가 복원하는 방식 대신,
// 페이지에서 직접 fetch 경로를 깨진 값으로 오버라이드해서 loadKoreanFont를 테스트한다.
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  console.log('=== 폰트 404 폴백 안전망 검증 ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  page.on('dialog', async d => { console.log(`[dialog] ${d.message()}`); await d.dismiss(); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));

  try {
    await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // jsPDF가 로드됐는지 먼저 확인
    const jspdfOk = await page.evaluate(() => typeof window.jspdf !== 'undefined');
    console.log('jsPDF 로드:', jspdfOk);
    if (!jspdfOk) throw new Error('jsPDF 로드 실패');

    // ★ 404 폴백 테스트를 먼저 수행 (캐시 초기화 전 — 새 페이지라 아직 캐시 없음)
    // fetch를 404로 강제 (fetch 오버라이드)
    const fallback = await page.evaluate(async () => {
      // 원래 fetch 저장
      const origFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('NotoSansKR-subset')) {
          return new Response('not found', { status: 404 });
        }
        return origFetch(url, opts);
      };
      // 캐시가 없는 상태(첫 호출)에서 404 → 폴백 동작 확인
      const loaded = await window.loadKoreanFont();
      return { loaded };
    });
    console.log('404 강제 시 loadKoreanFont 결과:', JSON.stringify(fallback));
    console.log(fallback.loaded === false ? '✅ 폰트 404 시 false 반환 (폴백 경로 진입)' : '❌ 예상과 다름');

    // downloadProposalPDF 직접 호출 — 기본 폰트로라도 PDF 생성되는지
    const pdfOk = await page.evaluate(async () => {
      const testState = {
        brandName: '라네즈', productName: '워터뱅크 크림',
        target: '2030 건성 피부 여성', concept: '하루 종일 촉촉한 수분 크림',
        toneAndManner: '신뢰감 있는'
      };
      const scenes = [{ time: '0-3초', type: '훅', dialogue: '테스트 대사', direction: '테스트 연출' }];
      const rationale = [{ principleId: '1-1', principleName: '테스트', type: 'TYPE_HOOK', reason: '근거', usedFields: [], citations: [] }];
      try {
        await window.downloadProposalPDF({}, testState, scenes, rationale, []);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('downloadProposalPDF (폰트 404 상태):', JSON.stringify(pdfOk));
    console.log(pdfOk.success ? '✅ 폰트 없이도 PDF 생성됨 (다운로드 보장)' : '❌ 실패: ' + pdfOk.error);

    // 폰트 복원 확인 — 정상 경로 재테스트 (캐시 초기화 불가하므로 새 페이지로)
    const page2 = await context.newPage();
    await page2.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page2.waitForTimeout(1200);
    const normal = await page2.evaluate(async () => {
      const base64 = await window.fetchKoreanFontBase64();
      return { ok: !!base64, len: base64 ? base64.length : 0 };
    });
    console.log('정상 폰트 로드 (새 페이지):', JSON.stringify(normal));
    console.log(normal.ok ? '✅ 정상 경로 폰트 로드 성공' : '❌ 정상 경로 실패');
    await page2.close();

    // 타임아웃 검증 — fetch가 무한 응답 대기(never resolve)하는 상황
    const page3 = await context.newPage();
    await page3.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page3.waitForTimeout(1200);
    console.log('\n[타임아웃 검증] fetch가 응답하지 않는 상황 (최대 15초 대기)...');
    const t0 = Date.now();
    const timeoutResult = await page3.evaluate(async () => {
      const origFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('NotoSansKR-subset')) {
          // 응답하지 않는 Promise — 영원히 pending (AbortController가 중단시킴)
          return new Promise((_, reject) => {
            if (opts?.signal) {
              opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            }
          });
        }
        return origFetch(url, opts);
      };
      const loaded = await window.loadKoreanFont();
      return { loaded };
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`타임아웃 시 loadKoreanFont 결과: ${JSON.stringify(timeoutResult)} (${elapsed}초 소요)`);
    const okTimeout = timeoutResult.loaded === false && parseFloat(elapsed) >= 9 && parseFloat(elapsed) <= 15;
    console.log(okTimeout ? '✅ 10초 타임아웃으로 중단 후 false 반환' : '❌ 타임아웃 동작 이상');
    await page3.close();

    await browser.close();
    console.log('\n=== 폴백 검증 완료 ===');
    process.exit(0);
  } catch (err) {
    console.error('❌ 검증 실패:', err.message);
    await browser.close();
    process.exit(1);
  }
})();
