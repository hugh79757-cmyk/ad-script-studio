/**
 * 디자인 시스템 정의 — ad-script-studio 카드캐러셀 / 쇼츠 영상
 *
 * 모든 슬라이드/영상에 공통 적용되는 디자인 토큰과 브랜드별 컬러 팔레트.
 */

// ---------------------------------------------------------------------------
// 공통 타이포그래피 스케일 (1080px 기준)
// ---------------------------------------------------------------------------
export const TYPO = {
  // 캐러셀 (4:5, 1080x1350)
  carousel: {
    title:     { size: 56, weight: 800, letterSpacing: -0.02 },  // 메인 타이틀
    subtitle:  { size: 32, weight: 500, letterSpacing: -0.01 },  // 부제목
    h2:        { size: 40, weight: 700, letterSpacing: -0.015 }, // 슬라이드 제목
    body:      { size: 26, weight: 400, letterSpacing: 0 },      // 본문
    bodyBold:  { size: 26, weight: 600, letterSpacing: 0 },      // 본문 강조
    caption:   { size: 18, weight: 400, letterSpacing: 0.02 },   // 캡션/라벨
    pageNum:   { size: 16, weight: 500, letterSpacing: 0.05 },   // 페이지 번호
    badge:     { size: 20, weight: 700, letterSpacing: 0.03 },   // 배지
    price:     { size: 36, weight: 800, letterSpacing: -0.02 },  // 가격
  },
  // 쇼츠 (9:16, 1080x1920)
  shorts: {
    title:     { size: 48, weight: 800, letterSpacing: -0.02 },
    subtitle:  { size: 28, weight: 500, letterSpacing: -0.01 },
    body:      { size: 22, weight: 400, letterSpacing: 0 },
    caption:   { size: 16, weight: 400, letterSpacing: 0.02 },
    // 자막 (Ken Burns 프레임 내)
    subtitleLg: { size: 40, weight: 700, letterSpacing: -0.01 }, // 큰 자막
    subtitleSm: { size: 28, weight: 500, letterSpacing: 0 },     // 작은 자막
  }
};

// ---------------------------------------------------------------------------
// 브랜드별 컬러 팔레트
// ---------------------------------------------------------------------------
export const PALETTE = {
  // CJ제일제당 비비고 왕교자 — 웜톤 (식품)
  food: {
    primary:   '#E85D04',   // 깊은 오렌지 (메인)
    secondary: '#F48C06',   // 밝은 오렌지
    accent:    '#DC2F02',   // 레드 포인트
    dark:      '#1C1917',   // 차콜
    light:     '#FFF7ED',   // 크림 배경
    white:     '#FFFFFF',
    textDark:  '#1C1917',
    textMid:   '#57534E',
    textLight: '#A8A29E',
    gradient:  'linear-gradient(135deg, #FFF7ED 0%, #FED7AA 50%, #FDBA74 100%)',
    overlay:   'linear-gradient(180deg, rgba(28,25,23,0.3) 0%, rgba(28,25,23,0.85) 100%)',
  },

  // 라네즈 워터뱅크 — 파스텔 블루 + 딥 네이비 (뷰티)
  beauty: {
    primary:   '#1E3A8A',   // 딥 블루
    secondary: '#3B82F6',   // 브라이트 블루
    accent:    '#93C5FD',   // 파스텔 블루
    dark:      '#0F172A',   // 딥 네이비
    light:     '#EFF6FF',   // 아이스 블루 배경
    white:     '#FFFFFF',
    textDark:  '#0F172A',
    textMid:   '#475569',
    textLight: '#94A3B8',
    gradient:  'linear-gradient(135deg, #EFF6FF 0%, #BFDBFE 50%, #60A5FA 100%)',
    overlay:   'linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.8) 100%)',
  },

  // 삼성전자 갤럭시 버즈3 프로 — 다크 + 네온 블루/실버 (전자기기)
  electronics: {
    primary:   '#38BDF8',   // 네온 사이언 블루
    secondary: '#818CF8',   // 인디고
    accent:    '#22D3EE',   // 시안
    dark:      '#020617',   // 피치 블랙
    light:     '#0F172A',   // 슬레이트 다크
    white:     '#FFFFFF',
    textDark:  '#F8FAFC',
    textMid:   '#94A3B8',
    textLight: '#475569',
    gradient:  'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
    overlay:   'linear-gradient(180deg, rgba(2,6,23,0.4) 0%, rgba(2,6,23,0.9) 100%)',
  }
};

// ---------------------------------------------------------------------------
// 카테고리 → 팔레트 매핑
// ---------------------------------------------------------------------------
export const CATEGORY_PALETTE = {
  식품:       PALETTE.food,
  푸드:       PALETTE.food,
  food:       PALETTE.food,
  뷰티:       PALETTE.beauty,
  화장품:     PALETTE.beauty,
  beauty:     PALETTE.beauty,
  전자기기:   PALETTE.electronics,
  전자제품:   PALETTE.electronics,
  전자:       PALETTE.electronics,
  electronics: PALETTE.electronics,
};

// ---------------------------------------------------------------------------
// 공통 CSS (슬라이드 템플릿에 주입)
// ---------------------------------------------------------------------------
export const COMMON_CSS = `
/* ===== 공통 CSS 리셋 및 베이스 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
               'Noto Sans KR', 'Pretendard', 'Malgun Gothic', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== 인라인 SVG 아이콘 ===== */
:root {
  --icon-check:    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
  --icon-star:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B' stroke='%23F59E0B' stroke-width='1'%3E%3Cpolygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/%3E%3C/svg%3E");
  --icon-fire:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EF4444' stroke='%23EF4444' stroke-width='1'%3E%3Cpath d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'/%3E%3C/svg%3E");
  --icon-trending: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='23 6 13.5 15.5 8.5 10.5 1 18'/%3E%3Cpolyline points='17 6 23 6 23 12'/%3E%3C/svg%3E");
  --icon-shield:   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310B981' stroke='%2310B981' stroke-width='1'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E");
  --icon-bolt:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FBBF24' stroke='%23FBBF24' stroke-width='1'%3E%3Cpolygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/%3E%3C/svg%3E");
  --icon-heart:    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EF4444' stroke='%23EF4444' stroke-width='1'%3E%3Cpath d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/%3E%3C/svg%3E");
  --icon-sparkle:  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FBBF24' stroke='%23FBBF24' stroke-width='1'%3E%3Cpath d='M12 2l2.09 6.26L20.18 10l-6.09 1.74L12 18l-2.09-6.26L3.82 10l6.09-1.74z'/%3E%3C/svg%3E");
  --icon-crown:    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B' stroke='%23F59E0B' stroke-width='1'%3E%3Cpath d='M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14'/%3E%3C/svg%3E");
  --icon-gift:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EC4899' stroke='%23EC4899' stroke-width='1'%3E%3Crect x='3' y='8' width='18' height='4' rx='1'/%3E%3Cpath d='M12 8V4a2 2 0 0 1 4 0v4'/%3E%3Cpath d='M19 12v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6'/%3E%3C/svg%3E");
  --icon-megaphone: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238B5CF6' stroke='%238B5CF6' stroke-width='1'%3E%3Cpath d='M3 11v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z'/%3E%3Cpath d='M8 7a4 4 0 0 1 8 0v2a4 4 0 0 1-8 0V7z'/%3E%3Cpath d='M15 5h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2'/%3E%3C/svg%3E");
  --icon-arrow-right: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3Cpolyline points='12 5 19 12 12 19'/%3E%3C/svg%3E");
  --icon-arrow-up-right: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='7' y1='17' x2='17' y2='7'/%3E%3Cpolyline points='7 7 17 7 17 17'/%3E%3C/svg%3E");
  --icon-user:       url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='1.5'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E");
  --icon-target:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='12' r='6'/%3E%3Ccircle cx='12' cy='12' r='2'/%3E%3C/svg%3E");
  --icon-percent:    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233B82F6'%3E%3Cpath d='M19 5L5 19M19 19L12 12'/%3E%3C/svg%3E");
  --icon-tag:        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23EF4444'%3E%3Cpath d='M12 2H2C1.45 2 1 2.45 1 3v16c0 .55.45 1 1 1h10l3 3V3c0-.55-.45-1-1-1zM12 6v3M5 12h14'/%3E%3C/svg%3E");
  --icon-clock:      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E");
  --icon-wifi:       url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='1.5'%3E%3Cpath d='M5 12.55a11 11 0 0 1 14.08 0'/%3E%3Cpath d='M1.42 9a16 16 0 0 1 21.16 0'/%3E%3Cpath d='M8.53 16.11a6 6 0 0 1 6.95 0'/%3E%3Ccircle cx='12' cy='20' r='1'/%3E%3C/svg%3E");
  --icon-volume:     url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='1.5'%3E%3Cpolygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'/%3E%3Cpath d='M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'/%3E%3C/svg%3E");
  --icon-bud:        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310B981'%3E%3Cpath d='M12 22V8M5 12H2a10 10 0 0 0 20 0h-3'/%3E%3Ccircle cx='12' cy='10' r='4'/%3E%3C/svg%3E");
}

/* ===== 유틸리티 클래스 ===== */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
`;
