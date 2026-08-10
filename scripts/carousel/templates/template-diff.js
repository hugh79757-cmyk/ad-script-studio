/**
 * 슬라이드 5: 차별화 포인트 — 체크리스트 + 비교표 혼합
 */
export function slideDifferentiation(data, palette, current, total) {
  const diff = data.strategy?.differentiation || '';
  const comp = data.strategy?.competitorAnalysis || '';

  const items = diff.split('\n').filter(Boolean).slice(0, 4);
  const fallbackItems = [
    '겉은 바삭, 속은 육즙 — 수분 밀폐 기술',
    '한 입 크기보다 큰 왕교자, 프리미엄 사이즈',
    '대한민국 1인당 2봉씩 먹은 국민 만두',
    '9천원대 1.05kg — 가성비 끝판왕',
  ];
  const list = items.length > 0 ? items : fallbackItems;

  const checkItems = list.map((item, i) => `
    <div class="check-item">
      <div class="check-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="${palette.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="check-text">${item}</div>
    </div>`).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif}
body{background:${palette.light};display:flex;flex-direction:column;min-height:100%}
.header{padding:56px 80px 0;display:flex;align-items:flex-start;justify-content:space-between}
h2{font-size:42px;font-weight:800;color:${palette.textDark};letter-spacing:-0.02em}
.al{width:56px;height:4px;background:${palette.primary};margin-top:14px;border-radius:2px}
.shield-badge{background:${palette.primary}12;border:1px solid ${palette.primary}30;border-radius:100px;padding:8px 18px;display:flex;align-items:center;gap:8px;font-size:14px;color:${palette.primary};font-weight:600}
.shield-badge svg{width:15px;height:15px}
.section-label{font-size:14px;font-weight:700;color:${palette.primary};letter-spacing:0.05em;margin-bottom:16px;text-transform:uppercase}
.checks{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 80px;gap:14px}
.check-item{display:flex;align-items:flex-start;gap:16px;background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:12px;padding:18px 20px;transition: all 0.2s}
.check-item:hover{box-shadow:0 4px 16px rgba(0,0,0,0.06);border-color:${palette.primary}30}
.check-icon{width:28px;height:28px;border-radius:50%;background:${palette.primary}12;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.check-icon svg{width:14px;height:14px}
.check-text{font-size:21px;font-weight:500;color:${palette.textDark};line-height:1.45}
.footer{border-top:1px solid ${palette.textLight}20;padding:14px 80px;display:flex;justify-content:space-between;font-size:14px;color:${palette.textLight}}
</style></head><body>
<div class="header"><div><h2>차별화 포인트</h2><div class="al"></div></div>
<div class="shield-badge"><svg viewBox="0 0 24 24" fill="${palette.primary}"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>경쟁우위</div></div>
<div class="checks">${checkItems}</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
