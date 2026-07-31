// state-manager.js — 전역 상태 관리
// Phase 1: 10개 입력 필드 상태 관리
const appState = {
  // 기존 5개
  brandName: '',
  productName: '',
  concept: '',
  target: '',
  toneAndManner: '',
  // 신규 5개
  competitorInfo: '',
  priceRange: '',
  reviewExcerpts: [], // 줄바꿈으로 구분 → 배열
  trustFactors: [], // 태그 입력 → 배열
  excludedKeywords: [], // 쉼표 구분 → 배열
  // Phase 4: 모드 상태
  mode: 'manual'  // 'manual' or 'auto'
};

// 상태 업데이트 함수
function updateState(field, value) {
  appState[field] = value;
  window.dispatchEvent(new CustomEvent('stateChange', {
    detail: { field, value }
  }));
}

// 배열 필드 추가 함수
function addArrayItem(field, item) {
  if (!appState[field].includes(item)) {
    appState[field].push(item);
    updateState(field, [...appState[field]]);
  }
}

// 배열 필드 제거 함수
function removeArrayItem(field, index) {
  appState[field].splice(index, 1);
  updateState(field, [...appState[field]]);
}

// 리뷰 발췌 파싱 (줄바꿈 → 배열)
function parseReviewExcerpts(text) {
  return text.split('\n').filter(line => line.trim() !== '');
}

// 제외키워드 파싱 (쉼표 → 배열)
function parseExcludedKeywords(text) {
  return text.split(',').map(kw => kw.trim()).filter(kw => kw !== '');
}

// 필수 필드 검증
function validateRequired() {
  const errors = [];
  if (!appState.brandName.trim()) errors.push({ field: 'brandName', message: '브랜드명을 입력하세요' });
  if (!appState.productName.trim()) errors.push({ field: 'productName', message: '제품명을 입력하세요' });
  if (!appState.target.trim()) errors.push({ field: 'target', message: '타겟을 입력하세요' });
  return errors;
}

// 초기화
function resetState() {
  Object.keys(appState).forEach(key => {
    if (key === 'mode') {
      appState[key] = 'manual';  // 모드는 수동으로 리셋
    } else if (Array.isArray(appState[key])) {
      appState[key] = [];
    } else {
      appState[key] = '';
    }
  });
  window.dispatchEvent(new CustomEvent('stateReset'));
}
