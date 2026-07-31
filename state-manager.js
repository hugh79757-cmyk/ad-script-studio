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

// === 자동 조사 출처 추적 ===
// 각 필드의 출처를 추적: 'user' | 'auto-research'
const fieldSourceMap = {};

/**
 * 필드 출처 설정
 * @param {string} field - 필드명
 * @param {string} source - 'user' | 'auto-research'
 */
function setFieldSource(field, source) {
  fieldSourceMap[field] = source;
  window.dispatchEvent(new CustomEvent('fieldSourceChange', {
    detail: { field, source }
  }));
}

/**
 * 필드 출처 조회
 * @param {string} field - 필드명
 * @returns {string} 'user' | 'auto-research' | 'none'
 */
function getFieldSource(field) {
  return fieldSourceMap[field] || 'none';
}

/**
 * 필드 출처 초기화
 */
function resetFieldSources() {
  Object.keys(fieldSourceMap).forEach(key => {
    delete fieldSourceMap[key];
  });
}

// === Phase 6: 탭 간 상태 전달 ===

// 탭 상태 관리
const tabState = {
  activeTab: 'proposal',  // 'proposal' or 'video'
  proposalResults: null,   // 제안서 결과 저장
  videoResults: null       // 영상 소스 결과 저장
};

// 제안서 결과 저장
function saveProposalResults(results) {
  tabState.proposalResults = results;
  // sessionStorage에 저장 (탭 전환 시 상태 유지)
  sessionStorage.setItem('proposalResults', JSON.stringify(results));
}

// 영상 소스 결과 저장
function saveVideoResults(results) {
  tabState.videoResults = results;
  sessionStorage.setItem('videoResults', JSON.stringify(results));
}

// 탭 전환 시 상태 복원
function restoreTabState() {
  const savedProposal = sessionStorage.getItem('proposalResults');
  const savedVideo = sessionStorage.getItem('videoResults');
  
  if (savedProposal) {
    tabState.proposalResults = JSON.parse(savedProposal);
  }
  if (savedVideo) {
    tabState.videoResults = JSON.parse(savedVideo);
  }
}

// "2번으로 보내기" — 제안서 결과를 영상 소스 생성기에 전달
function transferToVideoGenerator() {
  if (!tabState.proposalResults) {
    alert('전달할 제안서 결과가 없습니다. 먼저 제안서를 생성해주세요.');
    return false;
  }

  const { script, inputs } = tabState.proposalResults;
  
  // 영상 소스 생성기 상태에 전달
  updateState('videoScript', script);
  updateState('videoInputs', inputs);
  
  // 탭 전환
  switchTab('video');
  
  // 영상 소스 생성기 자동 실행
  if (typeof generateVideoPrompts === 'function') {
    generateVideoPrompts();
  }
  
  return true;
}

// 탭 전환 함수
function switchTab(tabName) {
  tabState.activeTab = tabName;
  
  // UI 업데이트
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.tool-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tool`);
  });
  
  // 상태 저장
  sessionStorage.setItem('activeTab', tabName);
}

// 초기화 시 탭 상태 복원
function initTabPersistence() {
  restoreTabState();
  
  const savedTab = sessionStorage.getItem('activeTab');
  if (savedTab) {
    switchTab(savedTab);
  }
}
