/**
 * scripts/carousel/render/index.js
 *
 * proposal-data.json → 4:5 카드캐러셀 PNG (Playwright + Chromium)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { CATEGORY_PALETTE } from '../design-system.js';

import { slideCover }       from '../templates/template-cover.js';
import { slideStrategyOverview } from '../templates/template-strategy.js';
import { slideTarget }      from '../templates/template-target.js';
import { slideKeyMessage }  from '../templates/template-message.js';
import { slideDifferentiation } from '../templates/template-diff.js';
import { slidePrinciples }  from '../templates/template-principles.js';
import { slideCta }         from '../templates/template-cta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_IMAGES_DIR = join(__dirname, '..', '..', '..', 'content', 'campaigns');

function inferCategory(brand, product, strategy) {
  const text = [brand, product, strategy?.overview, strategy?.targetAudience].join(' ').toLowerCase();
  if (/식품|푸드|음식|만두|왕교자|간식|요리|레시피|식사|다이어트|냉동/.test(text)) return '식품';
  if (/뷰티|화장품|스킨케어|수분|크림|로션|세럼|립|메이크업|피부|코스메틱|라네즈/.test(text)) return '뷰티';
  if (/전자|기기|스마트폰|갤럭시|버즈|이어폰|헤드폰|노트북|태블릿|tv|세탁기|건조|삼성전자/.test(text)) return '전자기기';
  return '식품';
}

// ---------------------------------------------------------------------------
// 템플릿 헬퍼: current/total 주입 후 HTML 반환
// ---------------------------------------------------------------------------
function makeRender(templateFn, data, palette) {
  return (current, total) => templateFn(data, palette, current, total);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('사용법: node scripts/carousel/render/index.js <proposal-data.json> [output_dir]');
    process.exit(1);
  }

  const proposalPath = args[0];
  const outputDir = args[1] || join(__dirname, '..', '..', '..', 'output', 'carousel');

  const raw = readFileSync(proposalPath, 'utf-8');
  const proposal = JSON.parse(raw);
  const campaignId = proposal.campaignId || 'carousel';
  const brand = proposal.brandName || '브랜드';
  const product = proposal.productName || '제품';
  const strategy = proposal.strategy || {};
  const script = proposal.script || {};
  const rationale = proposal.rationale || [];

  const category = inferCategory(brand, product, strategy);
  const palette = CATEGORY_PALETTE[category] || CATEGORY_PALETTE['식품'];
  console.log(`🎨 카테고리: ${category}`);

  const outDir = join(outputDir, campaignId);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // 제품 이미지 찾기
  let productImage = null;
  if (proposal.images?.length > 0) {
    productImage = proposal.images[0].localPath || proposal.images[0].url || null;
  }
  // 폴백: 캠페인 ID 기반 product_bg.jpg 자동 감지 (기존 동작 유지, 추가)
  const productBgFallback = join(BASE_IMAGES_DIR, campaignId, 'shorts', 'images', 'product_bg.jpg');
  if (!productImage && existsSync(productBgFallback)) {
    productImage = productBgFallback;
    console.log(`🖼️  폴백 제품 이미지 감지: ${productBgFallback}`);
  }

  // 로컬 파일 경로 → base64 data URI 인라인 변환
  // (setContent 페이지에서 file://는 Chromium 보안 정책으로 로드 실패가 확인됨)
  if (productImage && !productImage.startsWith('data:') && !productImage.startsWith('http')) {
    if (existsSync(productImage.replace(/^file:\/\//, ''))) {
      const localPath = productImage.replace(/^file:\/\//, '');
      const buf = readFileSync(localPath);
      productImage = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  }

  // 슬라이드 정의: [템플릿함수, render 데이터] 배열
  const baseData = { brand, product, productImage, ...proposal };
  const slideFns = [
    [slideCover, { ...baseData, subtitle: '쇼츠 광고 전략 분석 & 대본',
      tagline: proposal.tagline || null, price: proposal.price || null, rating: proposal.rating || null }],
    ...(strategy.overview ? [[slideStrategyOverview, { brand, product, strategy, script, rationale, productImage }]] : []),
    ...(strategy.targetAudience ? [[slideTarget, { brand, product, strategy, script, rationale, category, productImage }]] : []),
    ...(strategy.keyMessage ? [[slideKeyMessage, { brand, product, strategy, script, rationale, productImage }]] : []),
    ...((strategy.differentiation || strategy.competitorAnalysis) ? [[slideDifferentiation, { brand, product, strategy, script, rationale, productImage }]] : []),
    [slidePrinciples, { brand, product, strategy, script, rationale, productImage }],
    [slideCta, { ...baseData, price: proposal.price || null, sale: proposal.sale || false,
      ctaText: proposal.ctaText || `지금 바로 ${brand} ${product} 자세히 보기`,
      ctaSub: proposal.ctaSub || '전문 광고 전략을 통한 구매 전환 극대화' }],
  ];

  const total = slideFns.length;
  console.log(`📱 캐러셀 렌더링 시작: ${total}장`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1,
  });

  for (let i = 0; i < slideFns.length; i++) {
    const [tplFn, data] = slideFns[i];
    const current = i + 1;
    const html = tplFn(data, palette, current, total);
    const outPath = join(outDir, `slide-${String(current).padStart(2, '0')}.png`);

    try {
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      const buf = await page.screenshot({ fullPage: true, type: 'png' });
      writeFileSync(outPath, buf);
      console.log(`  ✅ slide ${String(current).padStart(2, '0')}: ${tplFn.name.replace('slide', '').replace(/[A-Z]/g, m => ' ' + m).trim().slice(0, 25)}`);
    } catch (err) {
      console.log(`  ❌ slide ${current} 오류: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\n✅ 캐러셀 생성 완료: ${total}장 → ${outDir}`);
}

main().catch(err => { console.error('❌:', err); process.exit(1); });
