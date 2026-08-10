#!/usr/bin/env node
/**
 * scripts/carousel/generate_carousel.js
 *
 * proposal-data.json → 카드캐러셀 이미지 세트 (4:5 비율, 인스타그램 캐러셀용)
 *
 * 출력: output/carousel/<campaign-id>/slide-01.png ~ slide-0N.png
 *
 * 슬라이드 구성:
 *   1. 표지: 브랜드명 + 제품명 + "광고 전략 제안서"
 *   2. 전략 개요: strategy.overview
 *   3. 타겟 분석: strategy.targetAudience
 *   4. 핵심 메시지: strategy.keyMessage
 *   5. 차별화 포인트: strategy.differentiation
 *   6. 적용된 마케팅 원칙 (rationale 중 일부)
 *   7. 대본 미리보기 (script.scenes 중 주요 장면)
 *   8. CTA / 기대효과
 *
 * 환경: Node.js, Canvas (node-canvas) 또는 fallback으로 PNG 생성
 *       한글 폰트 필요.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 폰트 감지
// ---------------------------------------------------------------------------

function detectFont() {
  const candidates = [
    '/System/Library/Fonts/AppleSDGothicNeo.ttc',
    '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
    '/Library/Fonts/AppleGothic.ttf',
  ];
  for (const f of candidates) {
    try {
      require('fs').accessSync(f);
      return f;
    } catch {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// node-canvas 사용 시도
// ---------------------------------------------------------------------------

let canvasAPI = null;
try {
  const { createCanvas, loadImage, registerFont } = await import('canvas');
  const fontPath = detectFont();
  if (fontPath) {
    // .ttc는 canvas에서 직접 지원 안 될 수 있음 → 대안으로 AppleGothic.ttf 우선
    const fallback = '/System/Library/Fonts/Supplemental/AppleGothic.ttf';
    const useFont = require('fs').existsSync(fallback) ? fallback : fontPath;
    try {
      registerFont(useFont, { family: 'AppleGothic' });
    } catch {
      // registerFont 실패해도 진행
    }
    canvasAPI = { createCanvas, loadImage, fontFamily: 'AppleGothic', fontPath: useFont };
    console.log(`   canvas 폰트: ${useFont}`);
  }
} catch (e) {
  console.log('   node-canvas 사용 불가, fallback 모드');
}

// ---------------------------------------------------------------------------
// fallback: 순수 Node.js로는 PNG 생성이 어려우므로 PNG 출력 생략 가능
// ---------------------------------------------------------------------------

function ensureDir(path) {
  const d = typeof path === 'string' ? path : path.pathname;
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

// ---------------------------------------------------------------------------
// 캐러셀 생성 (canvas API)
// ---------------------------------------------------------------------------

async function generateCarousel(proposalPath, outputDir) {
  const proposal = JSON.parse(readFileSync(proposalPath, 'utf-8'));
  const campaignId = proposal.campaignId || 'carousel';
  const outDir = join(outputDir || join(__dirname, '..', '..', 'output', 'carousel'), campaignId);
  ensureDir(outDir);

  const brand = proposal.brandName || '브랜드';
  const product = proposal.productName || '제품';
  const strategy = proposal.strategy || {};
  const script = proposal.script || {};
  const rationale = proposal.rationale || [];

  const slides = [];

  // 1. 표지
  slides.push({
    title: `${brand} ${product}`,
    subtitle: '광고 전략 제안서',
    accent: '#2563EB',
    type: 'cover',
  });

  // 2. 전략 개요
  if (strategy.overview) {
    slides.push({
      title: '전략 개요',
      body: strategy.overview.split('\n').filter(Boolean).slice(0, 5).join('\n'),
      type: 'content',
    });
  }

  // 3. 타겟 분석
  if (strategy.targetAudience) {
    slides.push({
      title: '타겟 분석',
      body: strategy.targetAudience,
      type: 'content',
    });
  }

  // 4. 핵심 메시지
  if (strategy.keyMessage) {
    slides.push({
      title: '핵심 메시지',
      body: strategy.keyMessage,
      type: 'content',
    });
  }

  // 5. 차별화 포인트
  if (strategy.differentiation) {
    slides.push({
      title: '차별화 포인트',
      body: strategy.differentiation,
      type: 'content',
    });
  }

  // 6. 적용된 원칙 (상위 4개)
  const topPrinciples = rationale.slice(0, 4);
  if (topPrinciples.length > 0) {
    const body = topPrinciples.map((r, i) => {
      const name = r.principleName || r.principleId || '';
      const reason = (r.reason || '').substring(0, 100);
      return `${i + 1}. ${name}\n${reason}`;
    }).join('\n\n');
    slides.push({
      title: `적용된 마케팅 원칙 (${topPrinciples.length}개)`,
      body,
      type: 'content',
    });
  }

  // 7. 대본 미리보기 (주요 3장면)
  const scenes = script.scenes || [];
  const previewScenes = scenes.filter(s => s.type === 'hook').slice(0, 1)
    .concat(scenes.filter(s => s.type === 'solution').slice(0, 1))
    .concat(scenes.filter(s => s.type === 'cta').slice(0, 1));
  if (previewScenes.length > 0) {
    const body = previewScenes.map(s => {
      const typeLabel = s.type ? s.type.toUpperCase() : '';
      return `[${typeLabel}] ${s.dialogue || ''}`;
    }).join('\n\n');
    slides.push({
      title: '대본 미리보기',
      body: body || '(대본 없음)',
      type: 'content',
    });
  }

  // 8. CTA / 기대효과
  slides.push({
    title: '지금 바로시작하세요',
    body: `👉 ${brand} ${product} 자세히 보기`,
    type: 'cta',
  });

  // 렌더링
  if (!canvasAPI) {
    console.log('   ⚠️ node-canvas 없음 — 캐러셀 이미지 생성 건너뜀');
    return { slides: slides.map((s, i) => ({ index: i + 1, path: null, title: s.title })) };
  }

  const { createCanvas, fontFamily } = canvasAPI;
  const canvasW = 1080;
  const canvasH = 1350; // 4:5 비율

  const results = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // 배경
    const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
    if (slide.type === 'cover') {
      grad.addColorStop(0, '#1E3A5F');
      grad.addColorStop(1, '#0D1B2A');
    } else if (slide.type === 'cta') {
      grad.addColorStop(0, '#2563EB');
      grad.addColorStop(1, '#1E40AF');
    } else {
      grad.addColorStop(0, '#F8FAFC');
      grad.addColorStop(1, '#E2E8F0');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 폰트 설정 (canvas font 문자열)
    const fontSizeTitle = slide.type === 'cover' ? 72 : 48;
    const fontSizeBody = 32;
    const fontSizeAccent = 28;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 표지 슬라이드
    if (slide.type === 'cover') {
      // 제목
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${fontSizeTitle}px "${fontFamily}"`;
      wrapText(ctx, slide.title, canvasW * 0.85, canvasH * 0.38, fontSizeTitle);

      // 부제목
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `500 ${fontSizeAccent}px "${fontFamily}"`;
      wrapText(ctx, slide.subtitle, canvasW * 0.85, canvasH * 0.52, fontSizeAccent);

      // 구분선
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasW * 0.2, canvasH * 0.58);
      ctx.lineTo(canvasW * 0.8, canvasH * 0.58);
      ctx.stroke();

      // 페이지 번호
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `400 24px "${fontFamily}"`;
      ctx.fillText(`${i + 1} / ${slides.length}`, canvasW / 2, canvasH - 60);
    } else if (slide.type === 'cta') {
      // CTA
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${fontSizeTitle}px "${fontFamily}"`;
      wrapText(ctx, slide.title, canvasW * 0.85, canvasH * 0.38, fontSizeTitle);

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `500 ${fontSizeBody}px "${fontFamily}"`;
      wrapText(ctx, slide.body, canvasW * 0.85, canvasH * 0.52, fontSizeBody);

      // 페이지 번호
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `400 24px "${fontFamily}"`;
      ctx.fillText(`${i + 1} / ${slides.length}`, canvasW / 2, canvasH - 60);
    } else {
      // 콘텐츠 슬라이드
      // 제목
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold ${fontSizeTitle}px "${fontFamily}"`;
      wrapText(ctx, slide.title, canvasW * 0.9, canvasH * 0.14, fontSizeTitle);

      // 구분선
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvasW * 0.1, canvasH * 0.20);
      ctx.lineTo(canvasW * 0.9, canvasH * 0.20);
      ctx.stroke();

      // 본문 (여러 줄)
      ctx.fillStyle = '#334155';
      ctx.font = `400 ${fontSizeBody}px "${fontFamily}"`;
      wrapText(ctx, slide.body, canvasW * 0.85, canvasH * 0.28, fontSizeBody);

      // 페이지 번호
      ctx.fillStyle = '#94A3B8';
      ctx.font = `400 24px "${fontFamily}"`;
      ctx.fillText(`${i + 1} / ${slides.length}`, canvasW / 2, canvasH - 50);
    }

    // 저장
    const outPath = join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(outPath, buffer);
    results.push({ index: i + 1, path: outPath, title: slide.title });
    console.log(`   slide ${i + 1}: ${slide.title.substring(0, 30)} → ${outPath}`);
  }

  return { slides: results, count: slides.length };
}

// ---------------------------------------------------------------------------
// 텍스트 랩핑 헬퍼 (canvas context용)
// ---------------------------------------------------------------------------

function wrapText(ctx, text, maxWidth, y, fontSize) {
  const lines = text.split('\n');
  let currentY = y;
  for (const line of lines) {
    const words = line.split('');
    let lineText = '';
    for (const ch of words) {
      const test = lineText + ch;
      const metrics = ctx.measureText(test);
      if (metrics.width > maxWidth && lineText) {
        ctx.fillText(lineText, ctx.canvas.width / 2, currentY);
        currentY += fontSize * 1.3;
        lineText = ch;
      } else {
        lineText = test;
      }
    }
    if (lineText) {
      ctx.fillText(lineText, ctx.canvas.width / 2, currentY);
      currentY += fontSize * 1.3;
    }
  }
}

// ---------------------------------------------------------------------------
// 진입점
// ---------------------------------------------------------------------------

const proposalArg = process.argv[2];
const outputArg = process.argv[3];

if (!proposalArg) {
  console.log('사용법: node scripts/carousel/generate_carousel.js <proposal-data.json> [output_dir]');
  console.log('예: node scripts/carousel/generate_carousel.js content/campaigns/real-전자기기-xxx/proposal-data.json');
  process.exit(1);
}

(async () => {
  try {
    console.log(`📱 캐러셀 생성 시작: ${proposalArg}`);
    const result = await generateCarousel(proposalArg, outputArg);
    console.log(`\n✅ 캐러셀 생성 완료: ${result.count}장`);
    for (const s of result.slides) {
      console.log(`   slide ${s.index}: ${s.path || '생성 안 됨'}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ 캐러셀 생성 실패:', err.message);
    console.error(err.stack?.substring(0, 500));
    process.exit(1);
  }
})();
