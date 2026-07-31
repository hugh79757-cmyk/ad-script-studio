# PLAN — Wave 2: 프론트엔드 API 호출 + 모드 전환

> Phase: 4
> Wave: 2
> Requirements: R13

---

## Goal

프론트엔드에서 API 호출 로직을 구현하고, 수동/자동 모드 전환 UI를 추가

---

## Tasks

### Task 1: app.js 업데이트 — API 호출 로직

**Description:** 자동 모드에서 API 호출 + 로딩 스피너 + 결과 렌더링

**Implementation:**
```javascript
// 기존 initScriptGeneration() 함수 업데이트
function initScriptGeneration() {
  const generateBtn = document.getElementById('generateBtn');
  generateBtn.addEventListener('click', async () => {
    if (!validateInputs()) return;

    const mode = appState.mode || 'manual';
    
    if (mode === 'auto') {
      await callGenerateAPI();
    } else {
      generateManualResult();
    }
  });
}

// API 호출 함수
async function callGenerateAPI() {
  const spinner = document.getElementById('loadingSpinner');
  const generateBtn = document.getElementById('generateBtn');
  
  try {
    // 로딩 시작
    spinner.classList.add('active');
    generateBtn.disabled = true;
    generateBtn.textContent = '생성 중...';

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: appState,
        mode: 'auto'
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // 결과 렌더링
    renderAutoResult(result);
    
  } catch (error) {
    console.error('Generation failed:', error);
    showError('생성에 실패했습니다. 다시 시도해주세요.');
  } finally {
    // 로딩 종료
    spinner.classList.remove('active');
    generateBtn.disabled = false;
    generateBtn.textContent = '생성';
  }
}

// 자동 모드 결과 렌더링
function renderAutoResult(result) {
  // 전략 개요 렌더링
  document.getElementById('strategyOverview').innerHTML = result.strategy;
  
  // 대본 렌더링
  document.getElementById('scriptContent').innerHTML = result.script;
  
  // 당위성 근거 렌더링
  document.getElementById('rationaleContent').innerHTML = result.rationale;
  
  // 결과 영역 표시
  document.getElementById('resultArea').classList.add('active');
}
```

**Acceptance Criteria:**
- [ ] 자동 모드에서 "생성" 클릭 → API 호출
- [ ] 로딩 스피너 표시
- [ ] 결과 수신 후 렌더링
- [ ] 에러 시 사용자 피드백

---

### Task 2: app.js 업데이트 — 모드 전환 UI

**Description:** 수동/자동 모드 토글 스위치 + 상태 관리

**Implementation:**
```javascript
// 상태 초기화에 mode 추가
const appState = {
  brand: '',
  product: '',
  concept: '',
  target: '',
  tone: '',
  competitor: '',
  priceBarrier: '',
  reviewExcerpts: [],
  trustFactors: [],
  excludedKeywords: [],
  mode: 'manual'  // 'manual' or 'auto'
};

// 모드 전환 초기화
function initModeToggle() {
  const toggle = document.getElementById('modeToggle');
  const modeLabel = document.getElementById('modeLabel');
  
  toggle.addEventListener('change', (e) => {
    const mode = e.target.checked ? 'auto' : 'manual';
    appState.mode = mode;
    
    // UI 업데이트
    modeLabel.textContent = mode === 'auto' ? '자동 모드' : '수동 모드';
    
    // 모드에 따른 UI 변경
    updateUIForMode(mode);
  });
}

// 모드별 UI 업데이트
function updateUIForMode(mode) {
  const generateBtn = document.getElementById('generateBtn');
  const manualResult = document.getElementById('manualResult');
  const autoResult = document.getElementById('autoResult');
  
  if (mode === 'auto') {
    generateBtn.textContent = '자동 생성';
    manualResult.style.display = 'none';
    autoResult.style.display = 'block';
  } else {
    generateBtn.textContent = '프롬프트 생성';
    manualResult.style.display = 'block';
    autoResult.style.display = 'none';
  }
}
```

**Acceptance Criteria:**
- [ ] 토글 스위치로 모드 전환 가능
- [ ] 모드 상태가 appState에 저장
- [ ] 모드에 따라 UI 변경

---

### Task 3: index.html 업데이트 — 모드 전환 UI

**Description:** 토글 스위치 컴포넌트 추가

**Implementation:**
```html
<!-- 모드 전환 토글 -->
<div class="mode-toggle-container">
  <span class="mode-label" id="modeLabel">수동 모드</span>
  <label class="toggle-switch">
    <input type="checkbox" id="modeToggle">
    <span class="toggle-slider"></span>
  </label>
  <span class="mode-description">
    수동: 프롬프트를 복사하여 Claude에 붙여넣기<br>
    자동: API를 통해 자동 생성
  </span>
</div>

<!-- 로딩 스피너 -->
<div class="loading-spinner" id="loadingSpinner">
  <div class="spinner"></div>
  <p>생성 중...</p>
</div>
```

**Acceptance Criteria:**
- [ ] 토글 스위치 UI 표시
- [ ] 로딩 스피너 UI 표시

---

### Task 4: style.css 업데이트 — 스타일

**Description:** 로딩 스피너 + 모드 전환 스타일

**Implementation:**
```css
/* 모드 전환 토글 */
.mode-toggle-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px;
  background: #1a1a1a;
  border-radius: 8px;
}

.toggle-switch {
  position: relative;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #333;
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #4ade80;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* 로딩 스피너 */
.loading-spinner {
  display: none;
  text-align: center;
  padding: 40px;
}

.loading-spinner.active {
  display: block;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #4ade80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.mode-description {
  font-size: 12px;
  color: #888;
}
```

**Acceptance Criteria:**
- [ ] 토글 스위치 스타일 적용
- [ ] 로딩 스피너 애니메이션 동작

---

## Dependencies

Wave 1 완료 후 (api/generate.js 존재해야 함)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app.js` | MODIFY |
| `index.html` | MODIFY |
| `style.css` | MODIFY |

---

## Verification

- 브라우저에서 열어 모드 전환 토글 동작 확인
- 자동 모드에서 생성 클릭 → API 호출 → 결과 표시 확인
