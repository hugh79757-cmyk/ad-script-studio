/**
 * scripts/shorts/renderer/index.js
 *
 * render-ready.json → 9:16 세로형 MP4 쇼츠 (Playwright + ffmpeg + TTS 오디오 합성)
 *
 * 핵심 개선:
 *  - 각 장면별 TTS 실제 재생 길이에 맞춰 프레임 수 결정 (고정 20프레임이 아님)
 *  - MP4에 오디오 스트림 포함 (TTS 음성 재생)
 *  - Ken Burns 효과, 자막 가독성, Safe Zone 준수, 페이드 전환
 *
 * 사용법:
 *   node scripts/shorts/renderer/index.js <render-ready.json> [output_dir]
 *
 * 필요 도구: ffmpeg (PATH), Playwright Chromium
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright';
import { CATEGORY_PALETTE } from '../../carousel/design-system.js';
import { sceneHtml, closingFrame, inferCategory } from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 헬퍼: ffprobe로 오디오 duration 측정 (초)
// ---------------------------------------------------------------------------
function probeAudioDuration(audioPath) {
  if (!audioPath || !existsSync(audioPath)) return 0;
  const r = spawnSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration',
     '-of', 'default=noprint_wrappers=1:nokey=1', audioPath],
    { encoding: 'utf-8', timeout: 10000 }
  );
  if (r.status !== 0) return 0;
  const val = parseFloat(r.stdout.trim());
  return isNaN(val) ? 0 : val;
}

// ---------------------------------------------------------------------------
// 헬퍼: ffmpeg 버전 체크
// ---------------------------------------------------------------------------
function checkFFmpeg() {
  const r = spawnSync('ffmpeg', ['-version']);
  if (r.status !== 0) {
    console.log('❌ ffmpeg가 PATH에 없습니다.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 쉘 실행
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
  const audioList = rr.audio || [];

  if (scenes.length === 0) {
    console.log('❌ scenes 없음');
    process.exit(1);
  }

  // brand/product
  const core = rr.coreSnapshot?.product || {};
  const brand = rr.brandName || core.brand || '브랜드';
  const product = rr.productName || core.name || '제품';
  const category = inferCategory(brand, product, script.overview || '');
  const palette = CATEGORY_PALETTE[category] || CATEGORY_PALETTE['식품'];
  console.log(`🎨 쇼츠 렌더링: ${brand} ${product} (${category})`);

  const outDir = join(outputDir, campaignId);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // --- 오디오 길이 측정 및 scene별 프레임 수 계산 ---
  const fps = 20;  // 프레임 레이트

  // audio map: sceneIndex → localPath
  const audioMap = {};
  for (const a of audioList) {
    const idx = a.sceneIndex;
    if (a.localPath && existsSync(a.localPath) && a.status === 'done') {
      audioMap[idx] = a.localPath;
    }
  }

  // image map: sceneIndex → localPath (인물/배경 이미지)
  // setContent 페이지에서 file://는 Chromium 보안 정책으로 로드 실패하므로 base64 data URI로 인라인
  const sceneImageMap = {};
  for (const im of images) {
    const idx = im.sceneIndex;
    if (im.localPath && existsSync(im.localPath)) {
      const p = im.localPath;
      if (p.startsWith('data:') || p.startsWith('http')) {
        sceneImageMap[idx] = p;
      } else {
        const buf = readFileSync(p);
        sceneImageMap[idx] = `data:image/jpeg;base64,${buf.toString('base64')}`;
      }
    }
  }

  // 각 scene별 오디오 duration과 프레임 수
  const scenePlans = [];
  let totalFrames = 0;
  let totalDuration = 0;

  for (let s = 0; s < scenes.length; s++) {
    const scene = scenes[s];
    const sceneIdx = scene.sceneIndex !== undefined ? scene.sceneIndex : s;
    const audioPath = audioMap[sceneIdx] || null;
    const audioDur = probeAudioDuration(audioPath);

    // closing 장면은 오디오가 없거나 짧을 수 있음. 오디오 없으면 대화 길이로 추정
    const effectiveDur = audioDur > 0 ? audioDur : Math.max(2.0, (scene.dialogue || '').length / 5.5);

    // Ken Burns 최소 15프레임 보장 (짧은 오디오도 최소한의 움직임)
    const frameCount = Math.max(15, Math.round(effectiveDur * fps));
    const sceneDur = frameCount / fps;

    scenePlans.push({
      scene,
      sceneIdx,
      audioPath,
      imagePath: sceneImageMap[sceneIdx] || null,  // 인물/배경 이미지 경로
      audioDur: effectiveDur,
      frameCount,
      sceneDur,
      isClosing: (scene.type || '') === 'closing' || (scene.type || '') === 'end',
    });

    totalFrames += frameCount;
    totalDuration += sceneDur;
  }

  console.log(`🎬 ${scenes.length}개 장면 렌더링 계획:`);
  for (const p of scenePlans) {
    console.log(`  scene ${p.sceneIdx}: ${p.sceneDur.toFixed(2)}초 (오디오: ${(p.audioDur).toFixed(2)}s) → ${p.frameCount}프레임${p.audioPath ? ' [오디오有]' : ' [오디오無]'}`);
  }
  console.log(`  총 ${totalFrames}프레임, 약 ${totalDuration.toFixed(1)}초 (@${fps}fps)`);

  // --- 프레임 생성 ---
  const framesDir = join(outDir, '_frames');
  if (existsSync(framesDir)) sh(`rm -rf "${framesDir}"`);
  mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 오디오가 없는 scene을 위한 임시 무음 오디오 파일 목록
  const audioConcatParts = [];  // 최종 concat에 사용할 오디오 파일 경로들

  let globalFrameIndex = 0;

  for (let si = 0; si < scenePlans.length; si++) {
    const plan = scenePlans[si];
    const { scene, frameCount, isClosing, audioPath } = plan;
    const s = si;  // 장면 인덱스

    for (let f = 0; f < frameCount; f++) {
      const frameNum = globalFrameIndex + f;
      const html = isClosing
        ? closingFrame(brand, product, palette, s, scenes.length)
        : sceneHtml(scene, plan.imagePath, palette, s, scenes.length, true, f, frameCount);

      const outFile = join(framesDir, `frame-${String(frameNum).padStart(5, '0')}.png`);

      try {
        await page.setContent(html, { waitUntil: 'networkidle' });
        await setTimeout(60);
        await page.screenshot({ fullPage: true, type: 'png', path: outFile });
      } catch (err) {
        console.log(`  ⚠️ frame ${frameNum} 오류: ${err.message}`);
        const emptyHtml = `<!DOCTYPE html><html><body style="margin:0;background:${palette.dark}"></body></html>`;
        await page.setContent(emptyHtml);
        await page.screenshot({ fullPage: true, type: 'png', path: outFile });
      }
    }

    globalFrameIndex += frameCount;

    // 오디오가 있는 scene의 오디오 파일을 concat 목록에 추가
    if (audioPath && existsSync(audioPath)) {
      audioConcatParts.push(audioPath);
    }

    if ((s + 1) % 5 === 0 || s === scenes.length - 1) {
      console.log(`  📸 장면 ${s + 1}/${scenes.length} 완료 (${globalFrameIndex}프레임)`);
    }
  }

  await browser.close();

  if (globalFrameIndex === 0) {
    console.log('❌ 생성된 프레임이 없습니다.');
    process.exit(1);
  }

  // --- 오디오 concat 리스트 생성 ---
  // 모든 오디오를 하나의 AAC 스트림으로 연결 (최종 MP4용)
  const tempAudioDir = join(framesDir, '_audiomux');
  if (existsSync(tempAudioDir)) sh(`rm -rf "${tempAudioDir}"`);
  mkdirSync(tempAudioDir, { recursive: true });

  // concat 리스트 파일 작성 (원본 MP3 경로 사용)
  const concatListPath = join(tempAudioDir, 'concat_list.txt');
  writeFileSync(concatListPath, audioConcatParts.map(a => `file '${a}'`).join('\n'));

  const mergedAudioPath = join(framesDir, 'merged_audio.m4a');
  if (audioConcatParts.length > 0) {
    const concatResult = spawnSync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
      '-c', 'aac', '-b:a', '192k', mergedAudioPath
    ], { encoding: 'utf-8', timeout: 120000 });
    if (concatResult.status === 0 && existsSync(mergedAudioPath)) {
      const sz = statSync(mergedAudioPath).size;
      console.log(`  🎵 오디오 병합: ${audioConcatParts.length}개 파일 → merged_audio.m4a (${Math.round(sz / 1024)}KB)`);
    } else {
      console.log('  ⚠️ ffmpeg concat 실패:', concatResult.stderr?.slice(0, 300));
    }
  }

  // --- ffmpeg로 최종 MP4 인코딩 ---
  console.log(`\n🎞️ ffmpeg로 MP4 인코딩 중... (비디오 ${totalFrames}프레임 + 오디오 ${audioConcatParts.length}트랙)`);
  const mp4Path = join(outDir, `${campaignId}.mp4`);

  const audioInput = existsSync(mergedAudioPath) ? ['-i', mergedAudioPath] : [];

  const ffmpegArgs = [
    '-y',
    '-framerate', String(fps),
    '-i', join(framesDir, 'frame-%05d.png'),
    ...audioInput,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v:0',
  ];

  // 오디오가 있으면 매핑 추가
  if (audioInput.length > 0) {
    ffmpegArgs.push('-map', '1:a:0');
  }

  // fade 필터 (비디오 길이에 맞게)
  ffmpegArgs.push(
    '-vf', `fade=t=in:st=0:d=0.3,fade=t=out:st=${Math.max(0, totalDuration - 0.5)}:d=0.5`,
    '-preset', 'medium',
    '-crf', '23',
    '-r', String(fps),
    mp4Path,
  );

  const ffmpegResult = spawnSync('ffmpeg', ffmpegArgs, {
    encoding: 'utf-8',
    timeout: 600000,  // 최대 10분
  });

  if (ffmpegResult.status !== 0) {
    console.log('❌ ffmpeg 오류:');
    console.log(ffmpegResult.stderr?.slice(0, 800));
    // 오디오 없이도 비디오만 생성 시도
    console.log('\n⚠️ 오디오 합 출신 실패, 비디오만 생성 시도...');
    const fallbackArgs = [
      '-y', '-framerate', String(fps), '-i', join(framesDir, 'frame-%05d.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-vf', `fade=t=in:st=0:d=0.3,fade=t=out:st=${Math.max(0, totalDuration - 0.5)}:d=0.5`,
      '-preset', 'medium', '-crf', '23', '-r', String(fps), '-an', mp4Path,
    ];
    const fb = spawnSync('ffmpeg', fallbackArgs, { encoding: 'utf-8', timeout: 300000 });
    if (fb.status !== 0) {
      console.log('❌ fallback ffmpeg도 실패:', fb.stderr?.slice(0, 500));
      process.exit(1);
    }
  }

  // 결과 검증
  if (existsSync(mp4Path)) {
    const infoCache = spawnSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,duration,width,height',
       '-of', 'json', mp4Path], { encoding: 'utf-8', timeout: 10000 });
    const info = JSON.parse(infoCache.stdout);

    const videoStream = info.streams?.find(s => s.codec_type === 'video');
    const audioStream = info.streams?.find(s => s.codec_type === 'audio');
    const fmtDuration = parseFloat(info.format?.duration || '0');

    console.log(`\n✅ MP4 생성 완료: ${mp4Path}`);
    console.log(`   크기: ${(statSync(mp4Path).size / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   해상도: ${videoStream?.width || '?'}x${videoStream?.height || '?'}`);
    console.log(`   비디오: ${videoStream?.codec_name || 'none'}`);
    console.log(`   오디오: ${audioStream ? `${audioStream.codec_name} (${fmtDuration.toFixed(1)}초)` : 'NONE'}`);
    console.log(`   총 길이: ${fmtDuration.toFixed(1)}초`);

    // Gate D 검증 출력
    if (!audioStream) {
      console.log(`   ⚠️  GATE D FAIL: 오디오 스트림 없음!`);
    } else if (Math.abs(fmtDuration - totalDuration) > 1.0) {
      console.log(`   ⚠️  GATE D WARN: 비디오 길이(${fmtDuration.toFixed(1)}s)와 TTS 총 길이(${totalDuration.toFixed(1)}s) 차이 ${Math.abs(fmtDuration - totalDuration).toFixed(1)}초`);
    } else {
      console.log(`   ✅ GATE D PASS: 오디오 있음, 길이 일치 (${fmtDuration.toFixed(1)}s ≈ ${totalDuration.toFixed(1)}s)`);
    }
  } else {
    console.log('\n❌ MP4 생성 실패');
    process.exit(1);
  }

  // 정리: 임시 파일 삭제 (오디오 concat 파일은 보존하려면 주석 처리)
  // sh(`rm -rf "${framesDir}"`);

  console.log('\n✅ 쇼츠 렌더링 완료!');
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
