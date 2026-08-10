/**
 * 슬라이드 4: 핵심 메시지 — 큰 인용구 카드 (인용구 2개)
 */
export function slideKeyMessage(data, palette, current, total) {
  const msg = data.strategy?.keyMessage || '';
  const scenes = data.script?.scenes || [];

  // 인용구 후보: solution → benefit → proof → hook 순으로 최대 2개 추출
  const quoteTypes = ['solution', 'benefit', 'proof', 'hook'];
  const quoteScenes = [];
  for (const t of quoteTypes) {
    const found = scenes.find(s => s.type === t);
    if (found && found.dialogue) quoteScenes.push(found.dialogue);
    if (quoteScenes.length >= 2) break;
  }
  const quotes = quoteScenes.length > 0 ? quoteScenes : [msg];

  const starSVG = '<svg viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/></svg>';
  const stars = Array.from({ length: 5 }, () => starSVG).join('');

  // 인용구 카드 2개 생성
  const quoteCards = quotes.map((q, i) => `
    <div class="qcard" style="${i === 0 ? '' : 'margin-top:16px;'}">
      <div class="bq">"</div>
      <div class="qbody">${q}</div>
      <div class="qlbl">
        <div class="qav"><svg viewBox="0 0 24 24" fill="${palette.primary}"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7z"/></svg></div>
        <div><div class="qrole">${i === 0 ? '실제 사용자 리뷰 기반' : '광고 대본 핵심 장면'}</div><div class="qdesc">${i === 0 ? '광고 대본에서 추출한 핵심 메시지' : '스크립트 ' + ['solution','benefit','proof','hook'][i] + ' 장면'}</div></div>
        <div class="stars">${stars}</div>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif}
body{background:${palette.light};display:flex;flex-direction:column;min-height:100%}
.header{padding:56px 80px 0;display:flex;align-items:flex-start;justify-content:space-between}
h2{font-size:42px;font-weight:800;color:${palette.textDark};letter-spacing:-0.02em}
.al{width:56px;height:4px;background:${palette.primary};margin-top:14px;border-radius:2px}
.badge{background:${palette.primary};color:#fff;border-radius:100px;padding:9px 20px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.badge svg{width:14px;height:14px}
.cards{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 80px}
.qcard{background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:20px;padding:44px 48px;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.05)}
.qcard:before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:${palette.primary}08}
.qcard:after{content:'';position:absolute;bottom:-50px;left:-50px;width:140px;height:140px;border-radius:50%;background:${palette.secondary}08}
.bq{position:absolute;top:16px;left:24px;font-size:90px;line-height:1;color:${palette.primary}35;font-family:Georgia,serif}
.qbody{font-size:32px;font-weight:500;color:${palette.textDark};line-height:1.55;padding:12px 0 8px}
.qlbl{display:flex;align-items:center;gap:14px;padding-top:20px;border-top:1px solid ${palette.textLight}15;margin-top:8px}
.qav{width:44px;height:44px;border-radius:50%;background:${palette.primary}18;display:flex;align-items:center;justify-content:center}
.qav svg{width:20px;height:20px}
.qrole{font-size:14px;font-weight:600;color:${palette.primary}}
.qdesc{font-size:14px;color:${palette.textMid};margin-top:2px}
.stars{display:flex;gap:3px;margin-left:auto}
.stars svg{width:16px;height:16px}
.footer{border-top:1px solid ${palette.textLight}20;padding:14px 80px;display:flex;justify-content:space-between;font-size:14px;color:${palette.textLight}}
</style></head><body>
<div class="header"><div><h2>핵심 메시지</h2><div class="al"></div></div>
<div class="badge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>핵심 카피</div></div>
<div class="cards">
  ${quoteCards}
</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
