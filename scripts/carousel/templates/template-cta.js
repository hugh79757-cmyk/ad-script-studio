/**
 * 슬라이드 7: CTA — 제품 이미지 + 가격 배지 + 버튼 스타일 CTA
 */
export function slideCta(data, palette, current, total) {
  const prodImg = data.productImage
    ? `background-image: url('${data.productImage}');`
    : '';
  const priceDisplay = data.price
    ? (typeof data.price === 'number' ? data.price.toLocaleString('ko-KR') + '원' : data.price)
    : '';
  const ctaText = data.ctaText || `지금 바로 ${data.brand} ${data.product} 시작하기`;

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif}
body{position:relative;${prodImg ? 'background-size:cover;background-position:center;background-repeat:no-repeat;' : ''}background:${palette.gradient}}
.overlay{position:absolute;inset:0;background:${palette.overlay}}
.content{position:absolute;left:80px;right:80px;top:120px;display:flex;gap:40px;align-items:center;flex-wrap:wrap}
.product-wrap{flex:0 0 320px;width:320px;height:320px;border-radius:24px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.4);border:2px solid rgba(255,255,255,0.2)}
.product-wrap:before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 50%);pointer-events:none}
.product-img{width:100%;height:100%;object-fit:cover;display:block}
.product-badge{position:absolute;top:-14px;left:-14px;background:${palette.accent};color:#fff;border-radius:100px;padding:8px 18px;font-size:14px;font-weight:700;letter-spacing:0.03em;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.product-badge svg{width:14px;height:14px}
.product-badge.sale{background:${palette.accent}}
.product-badge.new{background:${palette.primary}}
.text-col{flex:1;display:flex;flex-direction:column;gap:20px}
.cta-label{background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.2);border-radius:100px;padding:8px 18px;font-size:14px;color:rgba(255,255,255,0.85);font-weight:500;display:flex;align-items:center;gap:8px;width:fit-content}
.cta-label svg{width:14px;height:14px}
.cta-title{font-size:52px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.03em;text-shadow:0 2px 20px rgba(0,0,0,0.3)}
.cta-sub{font-size:24px;color:rgba(255,255,255,0.8);line-height:1.4}
.cta-price-row{display:flex;align-items:center;gap:16px}
.price-chip{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:10px 20px}
.price-chip .price-label{font-size:13px;color:rgba(255,255,255,0.6);font-weight:500;margin-bottom:2px}
.price-chip .price-value{font-size:30px;font-weight:800;color:#fff}
.cta-btn{display:flex;align-items:center;gap:12px;background:${palette.primary};color:#fff;border:none;border-radius:14px;padding:18px 32px;font-size:22px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.3);text-decoration:none;transition:all 0.2s;letter-spacing:-0.01em}
.cta-btn:hover{filter:brightness(1.1)}
.cta-btn svg{width:20px;height:20px}
.footer{position:absolute;left:80px;right:80px;bottom:0;border-top:1px solid rgba(255,255,255,0.12);padding:14px 0;display:flex;justify-content:space-between;font-size:14px;color:rgba(255,255,255,0.5)}
</style></head><body>
<div class="overlay"></div>
<div class="content">
  <div class="product-wrap">
    ${data.productImage ? `<img class="product-img" src="${data.productImage}" alt="${data.product}">` :
      `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${palette.dark}80;flex-direction:column;gap:8px">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="${palette.primary}40" stroke="${palette.primary}" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M3 16l4-4 3 3 5-5 4 4z"/></svg>
        <div style="font-size:14px;color:rgba(255,255,255,0.6);font-weight:500">제품 이미지</div>
      </div>`}
    <div class="product-badge ${data.sale ? 'sale' : 'new'}">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
      ${data.sale ? ' 특가 진행중' : ' 신제품'}
    </div>
  </div>
  <div class="text-col">
    <div class="cta-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
      광고를 시작하세요
    </div>
    <div class="cta-title">지금 바로<br>${data.brand} ${data.product}<br>시작하기</div>
    <div class="cta-sub">${data.ctaSub || '전문 광고 전략을 통한 구매 전환 극대화'}</div>
    ${priceDisplay ? `<div class="cta-price-row">
      <div class="price-chip">
        <div class="price-label">현재 판매가</div>
        <div class="price-value">${priceDisplay}</div>
      </div>
    </div>` : ''}
    <a class="cta-btn" href="#" target="_blank">
      ${ctaText}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </a>
  </div>
</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
