# PLAN — Phase 1: 전략 제안서 생성기 UI 골격 + 입력 필드 확장

> Phase: 1
> Requirements: R1, R2, R3, R4, R23, R24
> Mode: default (horizontal layers)

## Goal
2패널 레이아웃, 다크테마, **확장된 10개 입력 필드**가 동작하는 클라이언트 사이드 UI 골격 완성

## Success Criteria
- [ ] 좌측에 10개 입력 필드가 표시됨 (기존 5 + 신규 5)
- [ ] 우측에 결과 영역(전략 개요/대본/스토리보드 탭)이 표시됨
- [ ] 다크테마 적용 (배경 #0a0a0a~#1a1a1a, 텍스트 #e0e0e0 이상)
- [ ] 768px 이하에서 2패널 → 1패널 스택으로 반응형 전환
- [ ] 필수 입력 필드 미입력 시 경고 표시 (브랜드명, 제품명, 타겟)
- [ ] state-manager.js의 전역 state 객체에 모든 필드 값이 저장됨
- [ ] 리뷰 발췌, 신뢰요소, 제외키워드가 배열 형태로 저장됨
- [ ] 각 필드에 placeholder/툴팁으로 "왜 이 정보가 필요한지" 설명 표시

---

## Wave 1: 핵심 파일 4개 (병렬 생성)

### Plan 1: state-manager.js — 전역 상태 관리

**파일:** `state-manager.js`
**목적:** 모든 입력 필드 값을 전역 state 객체로 관리

**구현:**
```javascript
// 전역 상태 객체
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
  reviewExcerpts: [],    // 줄바꿈으로 구분 → 배열
  trustFactors: [],      // 태그 입력 → 배열
  excludedKeywords: []   // 쉼표 구분 → 배열
};

// 상태 업데이트 함수
function updateState(field, value) {
  appState[field] = value;
  // 커스텀 이벤트로 상태 변경 알림
  window.dispatchEvent(new CustomEvent('stateChange', { detail: { field, value } }));
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
  if (!appState.brandName.trim()) errors.push('브랜드명을 입력하세요');
  if (!appState.productName.trim()) errors.push('제품명을 입력하세요');
  if (!appState.target.trim()) errors.push('타겟을 입력하세요');
  return errors;
}

// 초기화
function resetState() {
  Object.keys(appState).forEach(key => {
    if (Array.isArray(appState[key])) {
      appState[key] = [];
    } else {
      appState[key] = '';
    }
  });
  window.dispatchEvent(new CustomEvent('stateReset'));
}
```

**체크리스트:**
- [ ] appState 객체에 10개 필드 모두 선언됨
- [ ] 배열 타입 필드 3개 (reviewExcerpts, trustFactors, excludedKeywords)
- [ ] updateState() 함수 동작
- [ ] addArrayItem() / removeArrayItem() 함수 동작
- [ ] parseReviewExcerpts() — 줄바꿈 구분
- [ ] parseExcludedKeywords() — 쉼표 구분
- [ ] validateRequired() — 필수 필드 검증
- [ ] resetState() — 전체 초기화

---

### Plan 2: style.css — 다크테마 + 2패널 레이아웃

**파일:** `style.css`
**목적:** 다크테마, 2패널 레이아웃, 반응형 스타일

**구현:**
```css
/* CSS 변수 — 다크테마 */
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-card: #222222;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  --border-color: #333333;
  --accent-color: #4a9eff;
  --error-color: #ff4a4a;
  --success-color: #4aff4a;
  --tag-bg: #2a2a2a;
  --tag-border: #444444;
}

/* 기본 리셋 */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

/* 2패널 레이아웃 */
.app-container {
  display: flex;
  min-height: 100vh;
}

.input-panel {
  flex: 0 0 45%;
  padding: 24px;
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.result-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 반응형 */
@media (max-width: 768px) {
  .app-container { flex-direction: column; }
  .input-panel { flex: none; border-right: none; border-bottom: 1px solid var(--border-color); }
}

/* 입력 필드 공통 스타일 */
.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.form-group label .required { color: var(--error-color); margin-left: 4px; }
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}
.form-group textarea { min-height: 80px; resize: vertical; }
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* 필드 힌트/설명 */
.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 필수 필드 경고 */
.field-error {
  font-size: 12px;
  color: var(--error-color);
  margin-top: 4px;
  display: none;
}
.field-error.visible { display: block; }

/* 섹션 구분선 */
.section-divider {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 24px 0;
}
.section-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

/* 태그 입력 */
.tag-input-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  min-height: 42px;
}
.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--tag-bg);
  border: 1px solid var(--tag-border);
  border-radius: 4px;
  font-size: 13px;
}
.tag-item .remove-tag {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 16px;
}
.tag-item .remove-tag:hover { color: var(--error-color); }
.tag-input {
  flex: 1;
  min-width: 100px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

/* 결과 영역 탭 */
.result-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}
.result-tab {
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  border-bottom: 2px solid transparent;
}
.result-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-color);
}
.result-content { display: none; }
.result-content.active { display: block; }

/* 결과 영역 빈 상태 */
.empty-state {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
}
```

**체크리스트:**
- [ ] CSS 변수 선언 (다크테마)
- [ ] 2패널 레이아웃 (flexbox)
- [ ] 반응형 @media (768px)
- [ ] 입력 필드 스타일 (input, textarea, select)
- [ ] 태그 입력 컴포넌트 스타일
- [ ] 결과 영역 탭 스타일
- [ ] 필수 필드 경고 스타일
- [ ] 섹션 구분선 스타일

---

### Plan 3: index.html — 10개 입력 필드 + 결과 영역

**파일:** `index.html`
**목적:** 2패널 레이아웃, 10개 입력 필드, 결과 영역 탭

**구현 (핵심 구조):**
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AD SCRIPT STUDIO</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-container">
    <!-- 좌측: 입력 패널 -->
    <div class="input-panel">
      <h1>전략 제안서 생성기</h1>

      <!-- 기존 5개 필드 -->
      <div class="form-group">
        <label>브랜드명 <span class="required">*</span></label>
        <input type="text" id="brandName" placeholder="광고 주체 브랜드명을 입력하세요" data-field="brandName">
        <div class="form-hint">광고 주체 브랜드명을 입력하세요</div>
        <div class="field-error">브랜드명을 입력하세요</div>
      </div>

      <div class="form-group">
        <label>제품명 <span class="required">*</span></label>
        <input type="text" id="productName" placeholder="광고할 제품/서비스 이름을 입력하세요" data-field="productName">
        <div class="form-hint">광고할 제품/서비스 이름을 입력하세요</div>
        <div class="field-error">제품명을 입력하세요</div>
      </div>

      <div class="form-group">
        <label>컨셉</label>
        <textarea id="concept" placeholder="제품의 핵심 컨셉이나 메시지를 입력하세요" data-field="concept"></textarea>
        <div class="form-hint">제품의 핵심 컨셉이나 메시지를 입력하세요</div>
      </div>

      <div class="form-group">
        <label>타겟 <span class="required">*</span></label>
        <input type="text" id="target" placeholder="타겟 고객층을 입력하세요 (예: 25~35세 여성, 직장인)" data-field="target">
        <div class="form-hint">타겟 고객층을 입력하세요</div>
        <div class="field-error">타겟을 입력하세요</div>
      </div>

      <div class="form-group">
        <label>톤앤매너</label>
        <select id="toneAndManner" data-field="toneAndManner">
          <option value="">선택하세요</option>
          <option value="진지">진지</option>
          <option value="유쾌">유쾌</option>
          <option value="감성">감성</option>
          <option value="유머">유머</option>
          <option value="시크">시크</option>
          <option value="발랄">발랄</option>
          <option value="몽환">몽환</option>
          <option value="강렬">강렬</option>
        </select>
        <div class="form-hint">광고의 분위기를 선택하세요</div>
      </div>

      <hr class="section-divider">
      <div class="section-label">당위성 근거용 원자료</div>

      <!-- 신규 5개 필드 -->
      <div class="form-group">
        <label>경쟁사명 / 차이점</label>
        <textarea id="competitorInfo" placeholder="경쟁 제품과의 차별점을 입력하면 더 설득력 있는 전략이 나옵니다" data-field="competitorInfo"></textarea>
        <div class="form-hint">경쟁 제품과의 차별점을 입력하면 더 설득력 있는 전략이 나옵니다</div>
      </div>

      <div class="form-group">
        <label>가격대</label>
        <input type="text" id="priceRange" placeholder="예: 39,000원, 첫 구매 시 할인顾虑" data-field="priceRange">
        <div class="form-hint">가격 정보가 있으면 구매 장벽 분석에 활용됩니다</div>
      </div>

      <div class="form-group">
        <label>리뷰 발췌</label>
        <textarea id="reviewExcerpts" placeholder="실제 고객이 쓴 표현을 그대로 넣으면 더 설득력 있는 카피가 나옵니다&#10;(줄바꿈으로 구분하여 여러 건 입력)" data-field="reviewExcerpts"></textarea>
        <div class="form-hint">실제 고객이 쓴 표현을 그대로 넣으면 더 설득력 있는 카피가 나옵니다 (줄바꿈으로 구분)</div>
      </div>

      <div class="form-group">
        <label>브랜드 신뢰요소</label>
        <div class="tag-input-container" id="trustFactorsTagInput">
          <input type="text" class="tag-input" placeholder="입력 후 Enter (예: 식약처 인증)">
        </div>
        <div class="form-hint">수상내역, 판매량, 인증 등 신뢰 요소를 입력하세요</div>
      </div>

      <div class="form-group">
        <label>제외키워드</label>
        <input type="text" id="excludedKeywords" placeholder="쉼표로 구분 (예: 저렴한, 싼)" data-field="excludedKeywords">
        <div class="form-hint">이 광고에서 사용하지 않을 키워드를 입력하세요</div>
      </div>
    </div>

    <!-- 우측: 결과 패널 -->
    <div class="result-panel">
      <div class="result-tabs">
        <button class="result-tab active" data-tab="strategy">전략 개요</button>
        <button class="result-tab" data-tab="script">대본</button>
        <button class="result-tab" data-tab="storyboard">스토리보드</button>
      </div>

      <div class="result-content active" id="strategy">
        <div class="empty-state">
          입력 필드를 작성하고 "전략 제안서 생성" 버튼을 클릭하세요
        </div>
      </div>

      <div class="result-content" id="script">
        <div class="empty-state">
          대본이 여기에 표시됩니다 (Phase 2)
        </div>
      </div>

      <div class="result-content" id="storyboard">
        <div class="empty-state">
          스토리보드가 여기에 표시됩니다 (Phase 2)
        </div>
      </div>
    </div>
  </div>

  <script src="state-manager.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**체크리스트:**
- [ ] 2패널 레이아웃 구조 (input-panel + result-panel)
- [ ] 기존 5개 필드 (브랜드명, 제품명, 컨셉, 타겟, 톤앤매너)
- [ ] 신규 5개 필드 (경쟁사, 가격대, 리뷰, 신뢰요소, 제외키워드)
- [ ] 필수 표시 (*) — 브랜드명, 제품명, 타겟
- [ ] 필드별 placeholder/힌트 텍스트
- [ ] 결과 영역 3탭 (전략 개요, 대본, 스토리보드)
- [ ] section-divider로 기존/신규 필드 구분
- [ ] section-label "당위성 근거용 원자료"
- [ ] 태그 입력 컨테이너 (신뢰요소)
- [ ] state-manager.js, app.js 스크립트 로드

---

### Plan 4: app.js — 이벤트 바인딩 + 태그 입력 UI

**파일:** `app.js`
**목적:** DOM 이벤트 바인딩, 태그 입력 UI 로직, 탭 전환

**구현:**
```javascript
// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initValidation();
});

// 1. 입력 필드 → state 바인딩
function initInputBindings() {
  // 텍스트/textarea/select 필드
  document.querySelectorAll('[data-field]').forEach(el => {
    const field = el.dataset.field;

    el.addEventListener('input', (e) => {
      if (field === 'reviewExcerpts') {
        // 리뷰 발췌: 줄바꿈으로 구분하여 배열 저장
        const excerpts = parseReviewExcerpts(e.target.value);
        updateState('reviewExcerpts', excerpts);
      } else if (field === 'excludedKeywords') {
        // 제외키워드: 쉼표로 구분하여 배열 저장
        const keywords = parseExcludedKeywords(e.target.value);
        updateState('excludedKeywords', keywords);
      } else {
        updateState(field, e.target.value);
      }
    });
  });
}

// 2. 태그 입력 UI (신뢰요소)
function initTagInput() {
  const container = document.getElementById('trustFactorsTagInput');
  const input = container.querySelector('.tag-input');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = input.value.replace(',', '').trim();
      if (value) {
        addArrayItem('trustFactors', value);
        renderTags(container, 'trustFactors');
        input.value = '';
      }
    }
  });

  // 초기 렌더링
  renderTags(container, 'trustFactors');
}

// 태그 렌더링
function renderTags(container, field) {
  const input = container.querySelector('.tag-input');
  // 기존 태그 제거
  container.querySelectorAll('.tag-item').forEach(tag => tag.remove());
  // 새 태그 추가
  appState[field].forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag-item';
    tag.innerHTML = `${item}<span class="remove-tag" data-index="${index}">×</span>`;
    container.insertBefore(tag, input);
  });
  // 삭제 이벤트
  container.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      removeArrayItem(field, parseInt(btn.dataset.index));
      renderTags(container, field);
    });
  });
}

// 3. 탭 전환
function initTabSwitching() {
  document.querySelectorAll('.result-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.result-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// 4. 필수 필드 검증
function initValidation() {
  const form = document.querySelector('.input-panel');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = validateRequired();
    // 필드별 경고 표시/숨김
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
    errors.forEach(errorMsg => {
      // 간단한 매칭 (실제로는 필드별 매핑 필요)
      document.querySelectorAll('.field-error').forEach(el => {
        if (el.textContent === errorMsg) el.classList.add('visible');
      });
    });
    if (errors.length === 0) {
      // 생성 로직 호출 (Phase 2)
      console.log('Validation passed. State:', appState);
    }
  });
}
```

**체크리스트:**
- [ ] initInputBindings() — data-field 요소 이벤트 바인딩
- [ ] 리뷰 발췌: 줄바꿈 → 배열 변환
- [ ] 제외키워드: 쉼표 → 배열 변환
- [ ] initTagInput() — 신뢰요소 태그 입력 UI
- [ ] 태그 추가 (Enter/쉼표)
- [ ] 태그 삭제 (× 버튼)
- [ ] renderTags() — 태그 렌더링
- [ ] initTabSwitching() — 결과 영역 탭 전환
- [ ] initValidation() — 필수 필드 검증

---

## Wave 2: 없음 (Phase 1은 Wave 1만으로 완성)

---

## Verification

### 수동 검증 체크리스트
- [ ] `index.html`을 브라우저에서 열어 2패널 레이아웃 확인
- [ ] 다크테마 적용 확인 (배경 #0a0a0a~#1a1a1a)
- [ ] 10개 입력 필드 모두 표시 확인
- [ ] 필수 필드 (브랜드명, 제품명, 타겟) 미입력 시 경고 표시
- [ ] 리뷰 발iaux: 줄바꿈으로 여러 줄 입력 → 배열 저장 확인
- [ ] 신뢰요소: 태그 입력 (Enter로 추가, ×로 삭제)
- [ ] 제외키워드: 쉼표 구분 입력 → 배열 저장
- [ ] 결과 영역 탭 전환 동작
- [ ] 768px 이하에서 반응형 전환 확인

### 자동 검증
- [ ] `state-manager.js` 로드 에러 없음
- [ ] `app.js` 로드 에러 없음
- [ ] 콘솔에 필드 변경 시 stateChange 이벤트 발생

---

## Files to Create

| 파일 | 크기 | 설명 |
|------|------|------|
| `state-manager.js` | ~80줄 | 전역 상태 관리 |
| `style.css` | ~200줄 | 다크테마 + 레이아웃 |
| `index.html` | ~150줄 | 10개 필드 + 결과 영역 |
| `app.js` | ~120줄 | 이벤트 바인딩 + 태그 UI |

**총 예상 줄 수:** ~550줄
