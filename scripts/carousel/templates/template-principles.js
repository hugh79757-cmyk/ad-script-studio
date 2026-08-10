/**
 * 슬라이드 6: 적용된 마케팅 원칙 — numbered list 카드
 */
export function slidePrinciples(data, palette, current, total) {
  const rationale = data.rationale || [];
  const items = rationale.slice(0, 4);

  const fallbackItems = [
    { name: 'Problem-First', desc: '청자의 고통에서 출발하는 훅 구조' },
    { name: 'Social Proof', desc: '1억 봉 판매·평점 4.8로 신뢰도 확보' },
    { name: 'Value Anchoring', desc: '1.05kg 9천원대 — 가격 대비 가치 강조' },
    { name: 'Clear CTA', desc: '마지막 5초에 행동 유도 메시지 집중' },
  ];
  const list = items.length > 0
    ? items.map(r => ({ name: r.principleName || r.principleId || '원칙', desc: (r.reason || '').slice(0, 60) || '마케팅 원칙 적용' }))
    : fallbackItems;

  const colors = [palette.primary, palette.secondary, palette.accent, palette.primary];
  const rows = list.map((item, i) => {
    const c = colors[i % colors.length];
    return `
    <div class="principle-row">
      <div class="prin-num" style="background:${c}15; color:${c}">${String(i + 1).padStart(2, '0')}</div>
      <div class="prin-body">
        <div class="prin-name" style="color:${c}">${item.name}</div>
        <div class="prin-desc">${item.desc}</div>
      </div>
      <div class="prin-arrow" style="color:${c}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif}
body{background:${palette.light};display:flex;flex-direction:column;min-height:100%}
.header{padding:56px 80px 0;display:flex;align-items:flex-start;justify-content:space-between}
h2{font-size:42px;font-weight:800;color:${palette.textDark};letter-spacing:-0.02em}
.al{width:56px;height:4px;background:${palette.primary};margin-top:14px;border-radius:2px}
.tbadge{background:${palette.primary}12;border:1px solid ${palette.primary}30;border-radius:100px;padding:8px 18px;display:flex;align-items:center;gap:8px;font-size:14px;color:${palette.primary};font-weight:600}
.tbadge svg{width:15px;height:15px}
.principles{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 80px;gap:12px}
.principle-row{display:flex;align-items:center;gap:16px;background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:12px;padding:16px 20px}
.prin-num{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0}
.prin-body{flex:1}
.prin-name{font-size:18px;font-weight:700;margin-bottom:4px}
.prin-desc{font-size:17px;color:${palette.textMid};line-height:1.4}
.prin-arrow svg{width:22px;height:22px}
.footer{border-top:1px solid ${palette.textLight}20;padding:14px 80px;display:flex;justify-content:space-between;font-size:14px;color:${palette.textLight}}
</style></head><body>
<div class="header"><div><h2>적용된 마케팅 원칙</h2><div class="al"></div></div>
<div class="tbadge"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>${(data.rationale?.length || 0) > 0 ? data.rationale.length + '개 원칙' : '4개 핵심 원칙'}</div></div>
<div class="principles">${rows}</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
