/**
 * scripts/shorts/renderer/index.js
 *
 * render-ready.json → 9:16 세로형 MP4 쇼츠 (Playwright + ffmpeg)
 *
 * 개선사항:
 *  - Ken Burns 효과 (장면당 30프레임, 천천히 줌인)
 *  - 굵은 자막 + 외곽선/그림자 (배경과 분리)
 *  - 쇼츠 UI 안전 영역 고려 (하단 200px 제외)
 *  - 타입별 컬러 배지 + 장면 인디케이터
 *  - 씬 간 페이드 전환
 *
 * 사용법:
 *   node scripts/shorts/renderer/index.js <render-ready.json> [output_dir]
 *
 * 필요 도구: ffmpeg (PATH)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright';
import { CATEGORY_PALETTE } from '../../carousel/design-system.js';
import { sceneHtml, closingFrame, inferCategory } from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 체크: ffmpeg 사용 가능 여부
// ---------------------------------------------------------------------------
function checkFFmpeg() {
  const result = spawnSync('ffmpeg', ['-version']);
  if (result.status !== 0) {
    console.log('❌ ffmpeg가 PATH에 없습니다. 설치가 필요합니다.');
    process.exit(1);
  }
  console.log('✅ ffmpeg 확인됨');
}

// ---------------------------------------------------------------------------
// 쉘 실행 헬퍼
// ---------------------------------------------------------------------------
function sh(cmd, cwd) {
  const r = spawnSync(cmd, { shell: true, cwd, encoding: 'utf-8', timeout: 120000 });
  if (r.status !== 0 && r.stderr) console.log('  stderr:', r.stderr.slice(0, 200));
  return r;
}

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('사용법: node scripts/shorts/renderer/index.js <render-ready.json> [output_dir]');
    process.exit(1);
  }

  checkFFmpeg();

  const rrPath = args[0];
  const outputDir = args[1] || join(dirname(rrPath), '..', '..', 'output', 'shorts');

  const raw = readFileSync(rrPath, 'utf-8');
  const rr = JSON.parse(raw);
  const campaignId = rr.campaignId || join(dirname(rrPath)).split('/').pop();
  const script = rr.script || {};
  const scenes = script.scenes || [];
  const images = rr.images || [];

  if (scenes.length === 0) {
    console.log('❌ scenes 없음');
    process.exit(1);
  }

  // brand/product: render-ready.json은 coreSnapshot.product에 저장
  const core = rr.coreSnapshot?.product || {};
  const brand = rr.brandName || core.brand || '브랜드';
  const product = rr.productName || core.name || '제품';
  const category = inferCategory(brand, product, script.overview || '');
  const palette = CATEGORY_PALETTE[category] || CATEGORY_PALETTE['식품'];
  console.log(`🎨 쇼츠 렌더링: ${brand} ${product} (${category})`);

  // 출력 디렉토리
  const outDir = join(outputDir, campaignId);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // 임시 프레임 디렉토리
  const framesDir = join(outDir, '_frames');
  if (existsSync(framesDir)) sh(`rm -rf "${framesDir}"`);
  mkdirSync(framesDir, { recursive: true });

  const FRAMES_PER_SCENE = 20;  // Ken Burns 프레임 수
  const TOTAL_FRAMES = scenes.length * FRAMES_PER_SCENE;
  const sceneImageMap = {};

  // 이미지 경로 맵핑 (sceneIndex → 로컬 경로)
  for (const img of images) {
    const idx = img.sceneIndex;
    if (img.localPath && existsSync(img.localPath)) {
      sceneImageMap[idx] = img.localPath;
    } else if (img.url) {
      sceneImageMap[idx] = img.url;
    }
  }

  console.log(`🎬 ${scenes.length}개 장면 × ${FRAMES_PER_SCENE}프레임 = ${TOTAL_FRAMES}프레임`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  let frameIndex = 0;

  for (let s = 0; s < scenes.length; s++) {
    const scene = scenes[s];
    const sceneIdx = scene.sceneIndex !== undefined ? scene.sceneIndex : s;
    const imagePath = sceneImageMap[sceneIdx] || null;
    const type = scene.type || 'solution';

    // closing 타입이면 클로징 프레임 사용
    const isClosing = type === 'closing' || type === 'end';

    for (let f = 0; f < FRAMES_PER_SCENE; f++) {
      const frameNum = frameIndex + f;
      const html = isClosing
        ? closingFrame(brand, product, palette, s, scenes.length)
        : sceneHtml(scene, imagePath, palette, s, scenes.length, true, f, FRAMES_PER_SCENE);

      const outFile = join(framesDir, `frame-${String(frameNum).padStart(5, '0')}.png`);

      try {
        await page.setContent(html, { waitUntil: 'networkidle' });
        await setTimeout(80); // 렌더링 대기
        await page.screenshot({ fullPage: true, type: 'png', path: outFile });
      } catch (err) {
        console.log(`  ⚠️ frame ${frameNum} 오류: ${err.message}`);
        // 빈 프레임 생성
        const emptyHtml = `<!DOCTYPE html><html><body style="margin:0;background:#0F172A"></body></html>`;
        await page.setContent(emptyHtml);
        await page.screenshot({ fullPage: true, type: 'png', path: outFile });
      }
    }

    frameIndex += FRAMES_PER_SCENE;
    if ((s + 1) % 5 === 0 || s === scenes.length - 1) {
      console.log(`  📸 장면 ${s + 1}/${scenes.length} 완료 (${frameIndex}프레임)`);
    }
  }

  await browser.close();

  // ffmpeg로 프레임 → mp4
  console.log(`\n🎞️ ffmpeg로 MP4 인코딩 중...`);
  const mp4Path = join(outDir, `${campaignId}.mp4`);

  // 프레임 레이트: 20fps × 20프레임 = 장면당 1초, 총 scenes.length 초
  const fps = 20;
  const duration = scenes.length; // 초

  const ffmpegArgs = [
    '-y',
    '-framerate', String(fps),
    '-i', join(framesDir, 'frame-%05d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-vf', 'fade=t=in:st=0:d=0.3,fade=t=out:st=' + (duration - 0.5) + ':d=0.5',
    '-preset', 'medium',
    '-crf', '23',
    '-r', String(fps),
    '-an',  // 오디오 없음 (TTS 오디오는 별도 추가 가능)
    mp4Path,
  ];

  const ffmpegResult = spawnSync('ffmpeg', ffmpegArgs, {
    encoding: 'utf-8',
    timeout: 300000,
  });

  if (ffmpegResult.status !== 0) {
    console.log('❌ ffmpeg 오류:');
    console.log(ffmpegResult.stderr?.slice(0, 500));
  } else {
    // 결과 확인
    if (existsSync(mp4Path)) {
      const stat = import('node:fs').then(m => m.statSync(mp4Path));
      // 동기 stat 사용
      const { statSync } = await import('node:fs');
      const sizeMb = statSync(mp4Path).size / (1024 * 1024);
      console.log(`\n✅ MP4 생성 완료: ${mp4Path}`);
      console.log(`   크기: ${sizeMb.toFixed(1)} MB`);
      console.log(`   해상도: 1080x1920`);
      console.log(`   길이: 약 ${duration}초 (@${fps}fps)`);
    }
  }

  // _frames 디렉토리 정리 (보존하려면 주석 처리)
  // sh(`rm -rf "${framesDir}"`);

  console.log('\n✅ 쇼츠 렌더링 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
