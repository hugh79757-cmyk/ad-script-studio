# PLAN — Wave 1: 전역 상태 관리 + 탭 간 전달

> Phase: 6
> Wave: 1
> Requirements: R19, R20
> Dependencies: Phase 5 (영상 소스 생성기) 완료 후

---

## Goal

두 도구 간 상태 전달 및 탭 전환 시 상태 보존 구현

---

## Tasks

### Task 1: state-manager.js 업데이트 — 탭 간 상태 전달

**Description:** 제안서 결과를 영상 소스 생성기에 전달하는 로직

**Implementation:**
```javascript
// state-manager.js에 추가

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
```

**Acceptance Criteria:**
- [ ] `transferToVideoGenerator()` 함수 존재
- [ ] `saveProposalResults()` 함수 존재
- [ ] `switchTab()` 함수 존재
- [ ] sessionStorage 사용하여 상태 유지

---

### Task 2: app.js 업데이트 — "2번으로 보내기" 버튼

**Description:** 제안서 결과 영역에 전달 버튼 추가

**Implementation:**
```javascript
// app.js — 제안서 결과 렌더링 시 "2번으로 보내기" 버튼 추가

function renderAutoResult(result) {
  const container = document.getElementById('autoResult');
  
  container.innerHTML = `
    <div class="result-section">
      <h3>전략 개요</h3>
      <div id="strategyOverview">${result.strategy}</div>
    </div>
    
    <div class="result-section">
      <h3>대본</h3>
      <div id="autoScriptContent">${result.script}</div>
    </div>
    
    <div class="result-section">
      <h3>당위성 근거</h3>
      <div id="autoRationaleContent">${result.rationale}</div>
    </div>
    
    <div class="result-actions">
      <button id="transferBtn" class="transfer-btn">
        2번으로 보내기 →
      </button>
      <button id="downloadProposalPdf" class="pdf-btn">
        제안서 PDF 다운로드
      </button>
    </div>
  `;
  
  // "2번으로 보내기" 버튼 바인딩
  document.getElementById('transferBtn').addEventListener('click', () => {
    // 현재 결과 저장
    saveProposalResults({
      script: result.script,
      inputs: appState
    });
    
    // 영상 소스 생성기에 전달
    transferToVideoGenerator();
  });
  
  // PDF 다운로드 버튼 바인딩
  document.getElementById('downloadProposalPdf').addEventListener('click', () => {
    downloadProposalPDF(result, appState);
  });
}
```

**Acceptance Criteria:**
- [ ] "2번으로 보내기" 버튼이 제안서 결과에 표시
- [ ] 클릭 시 `transferToVideoGenerator()` 호출
- [ ] 탭 자동 전환

---

### Task 3: index.html 업데이트 — 탭 구조 개선

**Description:** 두 도구 간 탭 구조 개선

**Implementation:**
```html
<!-- 탭 네비게이션 -->
<div class="tool-tabs">
  <button class="tool-tab active" data-tab="proposal">
    전략 제안서 생성기
  </button>
  <button class="tool-tab" data-tab="video">
    영상 소스 생성기
  </button>
</div>

<!-- 도구 컨테이너 -->
<div class="tool-contents">
  <!-- 전략 제안서 생성기 -->
  <div id="proposal-tool" class="tool-content active">
    <!-- 기존 제안서 UI -->
  </div>
  
  <!-- 영상 소스 생성기 (Phase 5에서 구현) -->
  <div id="video-tool" class="tool-content">
    <div id="videoGeneratorUI">
      <!-- 영상 소스 생성기 UI -->
    </div>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] 탭 네비게이션 UI 존재
- [ ] 두 도구 컨테이너 존재
- [ ] 탭 전환 시 해당 도구 표시

---

## Dependencies

Phase 5 (영상 소스 생성기) 완료 후

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `state-manager.js` | MODIFY |
| `app.js` | MODIFY |
| `index.html` | MODIFY |

---

## Verification

- 탭 전환 시 입력 필드 상태 유지 확인
- "2번으로 보내기" 버튼 클릭 시 탭 전환 + 결과 전달 확인
