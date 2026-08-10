/**
 * 슬라이드 3: 타겟 분석 — 페르소나 카드 3개
 */
function inferPersonas(brand, product, category) {
  const b = brand || '';
  const p = product || '';
  const t = (b + ' ' + p).toLowerCase();

  // 식품 카테고리
  if (category === '식품' || /만두|왕교자|간편식|냉동|식품/.test(t)) {
    return [
      '바쁜 일상 속에서도 제대로 된 한 끼를 원하는 직장인',
      '아이 간식과 가족 식사를 동시에 챙기는 워킹맘',
      '냉동실에 항상 챙겨두는 자취생의 필수템',
    ];
  }
  // 뷰티 카테고리
  if (category === '뷰티' || /크림|수분|스킨케어|로션|세럼|피부/.test(t)) {
    return [
      '아침마다 피부 당김을 느끼는 건성 피부 직장인',
      '속건조로 화장이 뜨는 25~35세 여성',
      '수부지(수분 부족 지성) 타입으로 고민하는 소비자',
    ];
  }
  // 전자기기 카테고리
  if (category === '전자기기' || /이어폰|버즈|헤드폰|갤럭시|스마트폰|전자/.test(t)) {
    return [
      '출퇴근 지하철 소음에 지친 도시 직장인',
      '해외 출장이 잦아 비행기에서 몰입이 필요한 비즈니스맨',
      '운동 중에도 선명한 사운드를 원하는 액티브 라이프스타일 유저',
    ];
  }
  return [
    '제품의 가치를 명확히 인지하는 핵심 소비자',
    '경쟁 제품 대비 차별점에 반응하는 구매의향자',
    '실사용 후 만족을 바탕으로 재구매/추천하는 충성 고객',
  ];
}

export function slideTarget(data, palette, current, total) {
  const target = data.strategy?.targetAudience || '';
  const rawPersonas = target.split('\n').filter(Boolean).slice(0, 3);
  const category = data.category || '식품';
  // 타겟 설명이 짧으면(30자 미만) 추론을 사용
  const useInferred = rawPersonas.length === 0 || rawPersonas[0].length < 20;
  const personas = useInferred
    ? inferPersonas(data.brand, data.product, category)
    : rawPersonas;
  const colors = [palette.primary, palette.secondary, palette.accent];

  const cards = personas.map((p, i) => {
    const c = colors[i % colors.length];
    return `
    <div class="persona">
      <div class="persona-top">
        <div class="avatar" style="background:${c}18">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="${c}"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7z"/></svg>
        </div>
        <div class="persona-meta">
          <div class="persona-label" style="color:${c}">타겟 ${i + 1}</div>
          <div class="persona-sub">핵심 페르소나</div>
        </div>
      </div>
      <div class="persona-text" style="border-left:4px solid ${c}">${p}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Pretendard',sans-serif;-webkit-font-smoothing:antialiased}
body{background:${palette.gradient};display:flex;flex-direction:column;min-height:100%}
.header{padding:56px 80px 0;display:flex;align-items:flex-start;justify-content:space-between}
.title-block h2{font-size:42px;font-weight:800;color:${palette.textDark};letter-spacing:-0.02em}
.accent-line{width:56px;height:4px;border-radius:2px;background:${palette.primary};margin-top:14px}
.insight-badge{background:${palette.primary}12;border:1px solid ${palette.primary}30;border-radius:100px;padding:8px 18px;display:flex;align-items:center;gap:8px;font-size:14px;color:${palette.primary};font-weight:600}
.insight-badge svg{width:15px;height:15px}
.cards{flex:1;display:flex;gap:20px;padding:36px 80px}
.persona{flex:1;background:${palette.white};border:1px solid ${palette.textLight}25;border-radius:16px;padding:24px;display:flex;flex-direction:column;justify-content:center;gap:16px}
.persona-top{display:flex;align-items:center;gap:14px}
.avatar{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.persona-meta .persona-label{font-size:17px;font-weight:700;color:${palette.textDark}}
.persona-meta .persona-sub{font-size:13px;color:${palette.textLight};margin-top:2px}
.persona-text{font-size:20px;font-weight:500;color:${palette.textDark};line-height:1.5;padding:14px 16px;background:${palette.textLight}06;border-radius:0 12px 12px 0}
.footer{border-top:1px solid ${palette.textLight}20;padding:14px 80px;display:flex;justify-content:space-between;font-size:14px;color:${palette.textLight}}
</style></head><body>
<div class="header">
  <div class="title-block">
    <h2>타겟 분석</h2>
    <div class="accent-line"></div>
  </div>
  <div class="insight-badge">
    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    핵심 타겟 인사이트
  </div>
</div>
<div class="cards">${cards}</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
