/**
 * 슬라이드 1: 표지 (Cover)
 * 제품 이미지 배경 + 그라디언트 오버레이 + 타이틀 + 배지
 */
export function slideCover(data, palette, current, total) {
  const prodImg = data.productImage
    ? `background-image: url('${data.productImage}');`
    : '';
  const taglineEl = data.tagline
    ? `<div class="badge" style="background:rgba(255,255,255,0.1);">${data.tagline}</div>`
    : '';
  const priceEl = data.price
    ? `<div class="meta-chip">
        <svg viewBox="0 0 24 24" fill="#FBBF24"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">₩</text></svg>
        ${typeof data.price === 'number' ? data.price.toLocaleString('ko-KR') + '원' : data.price}
      </div>`
    : '';
  const ratingEl = data.rating
    ? `<div class="meta-chip">
        <svg viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/></svg>
        ${data.rating}점
      </div>`
    : '';

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Pretendard',sans-serif;-webkit-font-smoothing:antialiased}
body${prodImg ? ` { background-size:cover;background-position:center;background-repeat:no-repeat;position:relative;` : ' { position:relative;'}
  background:${palette.gradient};
}
.overlay{position:absolute;inset:0;background:${palette.overlay}}
.content{position:absolute;left:80px;right:80px;bottom:120px;display:flex;flex-direction:column;gap:20px}
.badge-row{display:flex;gap:12px;flex-wrap:wrap}
.badge{background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.25);padding:9px 20px;border-radius:100px;font-size:16px;color:#fff;font-weight:500;letter-spacing:0.03em;display:flex;align-items:center;gap:8px}
.badge svg{width:16px;height:16px}
.title{font-size:64px;font-weight:800;color:#fff;line-height:1.15;letter-spacing:-0.03em;text-shadow:0 2px 20px rgba(0,0,0,0.4)}
.title .sub-line{display:block;font-size:48px;font-weight:700;margin-top:4px}
.subtitle{font-size:30px;font-weight:500;color:rgba(255,255,255,0.85);line-height:1.4;text-shadow:0 1px 8px rgba(0,0,0,0.3)}
.meta-row{display:flex;gap:16px;flex-wrap:wrap;margin-top:4px}
.meta-chip{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:9px 16px;font-size:16px;color:rgba(255,255,255,0.9);display:flex;align-items:center;gap:8px}
.meta-chip svg{width:18px;height:18px}
.footer{position:absolute;left:80px;right:80px;bottom:0;border-top:1px solid rgba(255,255,255,0.12);padding:14px 0;display:flex;justify-content:space-between;font-size:14px;color:rgba(255,255,255,0.5)}
</style></head><body>
<div class="overlay"></div>
<div class="content">
  <div class="badge-row">
    <div class="badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
      광고 전략 제안서
    </div>
    ${taglineEl}
  </div>
  <div class="title">${data.brand}<br><span class="sub-line">${data.product}</span></div>
  <div class="subtitle">${data.subtitle || '쇼츠 광고 전략 분석 & 대본'}</div>
  ${(data.price || data.rating) ? `<div class="meta-row">${priceEl}${ratingEl}</div>` : ''}
</div>
<div class="footer"><span>ad-script-studio</span><span>${String(current).padStart(2,'0')} / ${String(total).padStart(2,'0')}</span></div>
</body></html>`;
}
