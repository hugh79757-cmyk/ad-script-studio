/**
 * Pollinations.ai 이미지 생성 (curl 우회 방식)
 * Node.js fetch의 HTTP 500 문제를 curl로 우회
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const BASE = '/Users/twinssn/projects2/ad-script-studio';
const __dirname = dirname(fileURLToPath(import.meta.url));

async function downloadImage(prompt, width, height, outputPath, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const promptEncoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=${width}&height=${height}`;
    console.log(`  🌐 ${outputPath.split('/').pop()}: ${prompt.slice(0, 50)}... [${attempt}/${attempts}]`);

    try {
      const result = execSync(
        `curl -s -L -o "${outputPath}" -w "%{http_code} %{size_download}" --max-time 90 --connect-timeout 15 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" "${url}"`,
        { encoding: 'utf-8', timeout: 120000 }
      );
      const parts = result.trim().split(/\s+/);
      const httpCode = parts[0];
      const size = parseInt(parts[1], 10);

      if (httpCode !== '200') {
        console.log(`  ⚠️  HTTP ${httpCode}`);
        if (httpCode === '429' && attempt < attempts) {
          const delay = 15000 * attempt;
          console.log(`  ⏳ ${delay}ms 대기 (429 대응)...`);
          await setTimeout(delay);
          continue;
        }
        if (existsSync(outputPath)) unlinkSync(outputPath);
        if (attempt < attempts) {
          const delay = 5000 * attempt;
          await setTimeout(delay);
          continue;
        }
        return false;
      }

      if (size < 1000) {
        console.log(`  ⚠️  파일 작음 (${size}bytes)`);
        if (existsSync(outputPath)) unlinkSync(outputPath);
        if (attempt < attempts) { await setTimeout(3000 * attempt); continue; }
        return false;
      }

      console.log(`  ✅ ${outputPath.split('/').pop()}: ${size}bytes`);
      return true;
    } catch (err) {
      console.log(`  ⚠️  오류: ${err.message}`);
      if (existsSync(outputPath)) unlinkSync(outputPath);
      if (attempt < attempts) {
        const delay = 5000 * attempt;
        await setTimeout(delay);
      }
    }
  }
  console.log(`  ❌ 최대 재시도 초과: ${outputPath.split('/').pop()}`);
  return false;
}

function getProductPrompt(brand, product) {
  const p = (brand + ' ' + product).toLowerCase();
  if (/비비고|왕교자|만두/.test(p))
    return 'steaming Korean mandu dumplings in bamboo steamer, delicious food photography, glossy texture, warm lighting, dark wood table, appetizing, 8k, commercial food photo, no text, no watermark';
  if (/라네즈|수분|크림|뷰티/.test(p))
    return 'blue hydrating skincare cream jar, dewy water droplets on glass, luxury beauty product photography, soft studio lighting, white marble background, elegant, 8k, no text, no watermark';
  if (/갤럭시|버즈|이어폰/.test(p))
    return 'Galaxy Buds3 Pro wireless earbuds, premium metallic product shot, dramatic blue accent lighting, dark background, luxury tech commercial, 8k, no text, no watermark';
  return 'professional product photography, studio lighting, 8k, no text, no watermark';
}

function getPersonPrompt(sceneType, brand, product) {
  const p = (brand + ' ' + product).toLowerCase();
  const scenario = {
    hook: 'energetic, speaking to camera, engaging smile, looking at viewer',
    problem: 'empathic, concerned relatable look, talking to camera',
    solution: 'confident smiling, enthusiastic, showing solution',
    benefit: 'happy satisfied, glowing skin, positive results',
    proof: 'trustworthy, confident explaining expression',
    cta: 'warm inviting smile, friendly approach, call to action',
    closing: 'professional confident closing pose, strong finish',
  }[sceneType] || 'speaking to camera, natural expression, looking at viewer';

  let personStyle = '';
  if (/만두|왕교자/.test(p))
    personStyle = 'Korean woman 30s, warm friendly, casual home kitchen background, soft natural light, realistic skin texture, commercial food actor';
  else if (/라네즈|수분|크림/.test(p))
    personStyle = 'Korean woman 20s-30s, glowing hydrated skin, beauty commercial model, soft pastel background, elegant, realistic skin, dewy';
  else if (/갤럭시|버즈|이어폰/.test(p))
    personStyle = 'Korean man 20s-30s, modern stylish, urban city background bokeh, tech product reviewer, professional lighting, realistic';
  else
    personStyle = 'Korean person 20s-30s, clean background, professional commercial actor, realistic';

  return `${personStyle}, ${scenario}, talking head portrait, looking at camera, 9:16 vertical composition, professional commercial photography, sharp focus on face, blurred background, photorealistic, 8k UHD, no text, no watermark, no speech bubble, no caption`;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Pollinations.ai 이미지 생성 (curl 방식)      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const campaigns = [
    { name: '비비고 왕교자', id: 'real-식품-1786358541455', brand: 'CJ제일제당', product: '비비고 왕교자',
      shortsDir: join(BASE, 'content/campaigns/real-식품-1786358541455/shorts') },
    { name: '라네즈 수분크림', id: 'real-뷰티-1786358267764', brand: '라네즈', product: '워터뱅크 블루 히알루로닉 수분크림',
      shortsDir: join(BASE, 'content/campaigns/real-뷰티-1786358267764/shorts') },
    { name: '갤럭시 버즈3 프로', id: 'real-전자기기-1786358766510', brand: '삼성전자', product: '갤럭시 버즈3 프로',
      shortsDir: join(BASE, 'content/campaigns/real-전자기기-1786358766510/shorts') },
  ];

  for (const camp of campaigns) {
    console.log('\n' + '═'.repeat(50));
    console.log('📦 ' + camp.name);
    console.log('═'.repeat(50));

    const imagesDir = join(camp.shortsDir, 'images');
    if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });

    // 제품 이미지 (캐러셀용, 4:5)
    const prodPath = join(imagesDir, 'product_bg.jpg');
    if (!existsSync(prodPath) || statSync(prodPath).size < 5000) {
      const ok = await downloadImage(getProductPrompt(camp.brand, camp.product), 1080, 1350, prodPath);
      if (!ok) {
        console.log('  🔄 간단한 프롬프트로 재시도...');
        await downloadImage(`${camp.product} product photography, studio lighting, 8k, commercial, no text`, 1080, 1350, prodPath);
      }
    } else {
      console.log('  ✅ 제품 이미지: ' + statSync(prodPath).size + 'bytes');
    }

    // 장면별 인물 이미지 (쇼츠용, 9:16)
    const rrPath = join(camp.shortsDir, 'render-ready.json');
    const scenes = existsSync(rrPath) ? (JSON.parse(readFileSync(rrPath, 'utf-8')).script?.scenes || []) : [];

    for (let i = 0; i < Math.max(scenes.length, 7); i++) {
      const sceneType = scenes[i]?.type || 'solution';
      const personPath = join(imagesDir, `scene_${i + 1}_ai.jpg`);

      if (existsSync(personPath) && statSync(personPath).size > 40000) {
        console.log('  ⏭️  scene ' + (i + 1) + ': ' + statSync(personPath).size + 'bytes');
        continue;
      }

      const ok = await downloadImage(getPersonPrompt(sceneType, camp.brand, camp.product), 1080, 1920, personPath);
      if (!ok) {
        console.log('  🔄 scene ' + (i + 1) + ' 간단 프롬프트로 재시도...');
        await downloadImage(`Korean person talking to camera, ${sceneType}, portrait, 9:16, commercial, realistic`, 1080, 1920, personPath);
      }
      await setTimeout(15000);
    }
  }

  console.log('\n✅ 이미지 생성 완료!');
}

main().catch(err => { console.error('❌:', err); process.exit(1); });
