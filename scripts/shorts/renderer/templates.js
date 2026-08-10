/**
 * scripts/shorts/renderer/templates.js
 *
 * 쇼츠 영상 (9:16, 1080x1920) 장면별 HTML 템플릿
 * Ken Burns 효과, 자막, 안전 영역 고려
 */

import { CATEGORY_PALETTE } from '../../carousel/design-system.js';

export function inferCategory(brand, product, overview) {
  const text = [brand, product, overview].join(' ').toLowerCase();
  if (/식품|푸드|음식|만두|왕교자|간식|요리/.test(text)) return '식품';
  if (/뷰티|화장품|수분|크림|피부|코스메틱|라네즈/.test(text)) return '뷰티';
  if (/전자|갤럭시|버즈|이어폰|삼성전자/.test(text)) return '전자기기';
  return '식품';
}

/**
 * 장면별 HTML 생성
 * @param {Object} scene - 장면 데이터 (sceneIndex, type, dialogue, direction, time)
 * @param {Object} imagePath - 배경 이미지 로컬 경로 (선택)
 * @param {Object} palette - 컬러 팔레트
 * @param {number} sceneIdx - 장면 인덱스 (0부터)
 * @param {number} totalScenes - 전체 장면 수
 * @param {boolean} isKenBurns - Ken Burns 효과 적용 여부
 * @param {number} frameIndex - 프레임 인덱스 (0부터, Ken Burns용)
 * @param {number} totalFrames - 총 프레임 수
 */
export function sceneHtml(scene, imagePath, palette, sceneIdx, totalScenes,
  isKenBurns = true, frameIndex = 0, totalFrames = 30) {
  const { dialogue, direction, type, time } = scene;
  const sceneNum = sceneIdx + 1;
  const progress = totalScenes > 1 ? (sceneIdx / (totalScenes - 1)) : 0.5;

  // Ken Burns 줌 팩터 계산: 1.0 → 1.15 (줌인) 또는 1.15 → 1.0 (줌아웃)
  const kbZoom = isKenBurns
    ? 1.0 + (frameIndex / (totalFrames - 1)) * 0.12  // 천천히 줌인
    : 1.0;

  // 자막 위치: 안전 영역 (하단 200px 제외, 상단 120px 제외)
  const captionY = 1400; // 쇼츠 UI 안전 영역 아래

  // 타입별 시각 스타일
  const typeStyles = {
    hook:        { bgOverlay: 'rgba(0,0,0,0.55)', badgeBg: palette.primary, badgeText: '#fff', badgeLabel: 'HOOK · 도입' },
    problem:     { bgOverlay: 'rgba(0,0,0,0.50)', badgeBg: '#EF4444',     badgeText: '#fff', badgeLabel: 'PROBLEM · 문제' },
    solution:    { bgOverlay: 'rgba(0,0,0,0.45)', badgeBg: '#10B981',     badgeText: '#fff', badgeLabel: 'SOLUTION · 해결책' },
    benefit:     { bgOverlay: 'rgba(0,0,0,0.45)', badgeBg: '#F59E0B',     badgeText: '#fff', badgeLabel: 'BENEFIT · 혜택' },
    proof:       { bgOverlay: 'rgba(0,0,0,0.50)', badgeBg: '#8B5CF6',     badgeText: '#fff', badgeLabel: 'PROOF · 근거' },
    cta:         { bgOverlay: 'rgba(0,0,0,0.60)', badgeBg: palette.primary, badgeText: '#fff', badgeLabel: 'CTA · 행동유도' },
    closing:     { bgOverlay: 'rgba(0,0,0,0.70)', badgeBg: palette.textMid, badgeText: '#fff', badgeLabel: 'CLOSING · 마무리' },
  };
  const ts = typeStyles[type] || typeStyles.solution;

  // 대화 텍스트를 2줄로 나누기 (한글 기준 약 20자씩)
  const lines = wrapKorean(dialogue, 22);
  const line1 = lines[0] || '';
  const line2 = lines[1] || '';

  // 배경 이미지 처리
  const hasImage = imagePath && imagePath !== 'none';
  const bgStyle = hasImage
    ? `background: url('${imagePath}') center/cover no-repeat;`
    : `background: ${palette.gradient};`;

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased;background:#000}
.scene{${bgStyle}position:relative;width:1080px;height:1920px;animation:fadeIn 0.4s ease-out}
.scene.kenburns{overflow:hidden}
.scene.kenburns .scene-inner{width:1080px;height:1920px;transform:scale(${kbZoom});transform-origin:center center}
.scene-inner{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end}

/* 타입 배지 */
.type-badge{position:absolute;top:80px;left:80px;background:${ts.badgeBg};color:${ts.badgeText};border-radius:100px;padding:8px 18px;font-size:13px;font-weight:700;letter-spacing:0.1em;opacity:0.95;display:flex;align-items:center;gap:8px}
.type-badge svg{width:12px;height:12px}
.time-badge{position:absolute;top:80px;right:80px;background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.7);border-radius:6px;padding:5px 12px;font-size:12px;font-weight:500;font-variant-numeric:tabular-nums}

/* 오버레이 */
.overlay{position:absolute;inset:0;background:${ts.bgOverlay}}

/* 자막 */
.caption-area{position:absolute;left:80px;right:80px;bottom:200px;display:flex;flex-direction:column;gap:16px;animation:fadeInUp 0.5s ease-out ${0.1 * sceneIdx}s both}

/* 자막 배경 (배경색과 독립적인 가독성 보장) */
.caption-box{background:rgba(0,0,0,0.72);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 28px;backdrop-filter:blur(4px);box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:fadeInUp 0.5s ease-out ${0.15 * sceneIdx}s both}
.caption-line{font-size:38px;font-weight:700;color:#fff;line-height:1.4;letter-spacing:-0.01em;text-shadow:0 2px 8px rgba(0,0,0,0.5)}
.caption-line.dim{color:rgba(255,255,255,0.65);font-weight:500}
.caption-line.active{color:#FFD700;font-weight:800;text-shadow:0 0 20px rgba(255,215,0,0.4)}

/* 강조 하이라이트 (카라오케 스타일) */
.highlight{background:${palette.primary};color:#fff;border-radius:6px;padding:2px 8px;font-weight:800}

/* 하단 페이지 인디케이터 */
.scene-indicator{position:absolute;bottom:80px;left:80px;display:flex;gap:8px;align-items:center}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.25)}
.dot.active{background:${palette.primary};box-shadow:0 0 8px ${palette.primary}}
.dot.done{background:${palette.primary}60}

/* 장면 번호 */
.scene-num{position:absolute;bottom:80px;right:80px;font-size:13px;color:rgba(255,255,255,0.4);font-weight:500;letter-spacing:0.05em}

/* 브랜드 프로그레스 바 */
.progress-bar{position:absolute;top:0;left:0;height:3px;background:${palette.primary};width:0%;transition:width 0.3s}
</style></head><body>
<div class="scene ${isKenBurns ? 'kenburns' : ''}">
  <div class="scene-inner">
    <div class="overlay"></div>
    <div class="type-badge">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
      ${ts.badgeLabel}
    </div>
    <div class="time-badge">${time || '0:00'}</div>

    <div class="caption-area">
      <div class="caption-box">
        ${line1 ? `<div class="caption-line active">${line1}</div>` : ''}
        ${line2 ? `<div class="caption-line ${lines.length > 2 ? 'dim' : ''}">${line2}</div>` : ''}
      </div>
    </div>

    <div class="scene-indicator">
      ${Array.from({length: totalScenes}, (_, i) =>
        `<div class="dot ${i < sceneIdx ? 'done' : ''} ${i === sceneIdx ? 'active' : ''}"></div>`
      ).join('')}
    </div>
    <div class="scene-num">${String(sceneNum).padStart(2,'0')} / ${String(totalScenes).padStart(2,'0')}</div>
  </div>
</div>
</body></html>`;
}

function wrapKorean(text, charsPerLine) {
  if (!text) return [];
  const words = [...text];
  const lines = [];
  let current = '';
  let count = 0;
  for (const ch of words) {
    current += ch;
    count++;
    if (count >= charsPerLine && ch !== ' ') {
      lines.push(current);
      current = '';
      count = 0;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * 전체 영상 오프닝/클로징 프레임 템플릿
 */
export function closingFrame(brand, product, palette, sceneIdx, totalScenes) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;background:${palette.dark}}
.body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;animation:fadeIn 0.6s ease-out}
.brand-logo{font-size:22px;font-weight:700;color:${palette.primary};letter-spacing:0.15em;text-transform:uppercase}
.product-name{font-size:56px;font-weight:800;color:#fff;letter-spacing:-0.02em;text-align:center;line-height:1.2}
.divider{width:60px;height:3px;background:${palette.primary};border-radius:2px}
.tagline{font-size:20px;color:rgba(255,255,255,0.6);text-align:center;max-width:600px;line-height:1.5}
.ad-label{position:absolute;bottom:80px;font-size:12px;color:rgba(255,255,255,0.3);letter-spacing:0.1em}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
</style></head><body>
<div class="body">
  <div class="brand-logo">${brand}</div>
  <div class="product-name">${product}</div>
  <div class="divider"></div>
  <div class="tagline">쇼츠 광고 전략 제안 · ad-script-studio</div>
</div>
<div class="ad-label">ADVERTISEMENT</div>
</body></html>`;
}
