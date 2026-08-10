/**
 * 슬라이드 2: 전략 개요 — 3개 카드 레이아웃
 */
export function slideStrategyOverview(data, palette, current, total) {
  const overview = data.strategy?.overview || '';
  const points = overview.split('\n').filter(Boolean).slice(0, 3);
  const labels = ['전략 방향', '핵심 타겟', '접근 방식'];
  const icons = ['target', 'megaphone', 'bolt'];

  const cards = points.map((pt, i) => {
    const color = [palette.primary, palette.secondary, palette.accent][i];
    return `
    <div class="card">
      <div class="card-dot" style="background:${color}"></div>
      <div class="card-label" style="color:${color}">${labels[i]}</div>
      <div class="card-text">${pt}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Pretendard',sans-serif;-webkit-font-smoothing:antialiased}
body{background:${palette.gradient};display:flex;flex-direction:column;min-height:100%}
.header{padding:56px 80px 0;display:flex;align-items:flex-start;justify-content:space-between}
.title-block h2{font-size:42px;font-weight:800;color:${palette.textDark};letter-spacing:-0.02em;line-height:1.2}
.accent-line{width:56px;height:4px;border-radius:2px;background:${palette.primary};margin-top:14px}
.tile{display:flex;align-items:center;gap:10px;background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:100px;padding:9px 18px}
.tile .num{font-size:18px;font-weight:800;color:${palette.primary}}
.tile .lbl{font-size:13px;color:${palette.textLight};font-weight:500;letter-spacing:0.04em}
.cards{flex:1;display:flex;gap:20px;padding:36px 80px}
.card{flex:1;background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:16px;padding:28px 24px;display:flex;flex-direction:column;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.04)}
.card-dot{width:10px;height:10px;border-radius:50%;margin-bottom:4px}
.card-label{font-size:14px;font-weight:700;letter-spacing:0.05em}
.card-text{font-size:21px;font-weight:500;color:${palette.textDark};line-height:1.5}
.footer{border-top:1px solid ${palette.textLight}20;padding:14px 80px;display:flex;justify-content:space-between;font-size:14px;color:${palette.textLight}}
</style></head><body>
<div class="header">
  <div class="title-block">
    <h2>전략 개요</h2>
    <div class="accent-line"></div>
  </div>
  <div class="tile"><span class="num">01</span><span class="lbl">/ 전략</span></div>
</div>
<div class="cards">${cards}</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
