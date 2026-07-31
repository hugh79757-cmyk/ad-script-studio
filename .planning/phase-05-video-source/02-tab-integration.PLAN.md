# PLAN — Wave 2: 탭 전환 + 카피 버튼 통합

> Phase: 5
> Wave: 2
> Requirements: R14, R18
> Dependencies: Wave 1 완료 후

---

## Goal

탭 전환 로직 구현 + 영상 소스 생성기 UI 통합

---

## Tasks

### Task 1: app.js 업데이트 — 탭 전환 로직

**Description:** 두 도구 간 탭 전환 + 상태 유지

**Implementation:**
```javascript
// app.js에 추가

// 탭 전환 초기화
function initToolTabs() {
  document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      // 탭 활성화
      document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 컨텐츠 전환
      document.querySelectorAll('.tool-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tool`);
      });
      
      // 영상 소스 생성기 초기화 (최초 1회)
      if (tabName === 'video' && !tab.dataset.initialized) {
        initVideoUI();
        tab.dataset.initialized = 'true';
      }
    });
  });
}

// DOMContentLoaded에 추가
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initScriptGeneration();
  initPhase3();
  initModeToggle();
  initToolTabs();  // 탭 전환 초기화
});
```

**Acceptance Criteria:**
- [ ] `initToolTabs()` 함수 존재
- [ ] 탭 클릭 시 컨텐츠 전환
- [ ] 영상 소스 생성기 최초 전환 시 초기화

---

### Task 2: index.html 업데이트 — 탭 UI

**Description:** 탭 네비게이션 + 도구 컨테이너

**Implementation:**
```html
<!-- 기존 결과 영역 대체 -->
<div class="tools-container">
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
      <!-- 기존 결과 영역 (resultArea) 이동 -->
      <div id="resultArea">
        <!-- 기존 탭: 전략 개요, 대본, 스토리보드 -->
      </div>
    </div>
    
    <!-- 영상 소스 생성기 -->
    <div id="video-tool" class="tool-content">
      <div id="videoGeneratorUI">
        <!-- video-ui.js에서 렌더링 -->
      </div>
    </div>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] 탭 네비게이션 UI 존재
- [ ] 두 도구 컨테이너 존재
- [ ] 기존 결과 영역이 proposal-tool 안에 위치

---

### Task 3: style.css 업데이트 — 탭 + 영상 소스 스타일

**Description:** 탭 전환 + 영상 소스 생성기 스타일

**Implementation:**
```css
/* 탭 전환 스타일 */
.tools-container {
  margin-top: 20px;
}

.tool-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #333;
  margin-bottom: 20px;
}

.tool-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tool-tab:hover {
  color: #fff;
}

.tool-tab.active {
  color: #4ade80;
  border-bottom: 2px solid #4ade80;
  margin-bottom: -2px;
}

.tool-content {
  display: none;
}

.tool-content.active {
  display: block;
}

/* 영상 소스 생성기 스타일 */
.video-input-section {
  margin-bottom: 20px;
}

.video-input-section h3 {
  margin-bottom: 12px;
  color: #e0e0e0;
}

#videoScriptInput {
  width: 100%;
  padding: 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #e0e0e0;
  font-family: monospace;
  resize: vertical;
}

.detail-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
}

.detail-selector label {
  color: #888;
}

.detail-btn {
  padding: 8px 16px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover {
  border-color: #4ade80;
  color: #fff;
}

.detail-btn.active {
  background: #4ade80;
  border-color: #4ade80;
  color: #000;
}

.generate-video-btn {
  width: 100%;
  padding: 12px;
  background: #4ade80;
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.generate-video-btn:hover {
  background: #22c55e;
}

/* 프롬프트 결과 스타일 */
.video-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.copy-all-btn {
  padding: 8px 16px;
  background: #333;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}

.copy-all-btn:hover {
  background: #444;
}

.video-prompts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-prompt-card {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.prompt-time {
  font-weight: bold;
  color: #4ade80;
}

.copy-prompt-btn {
  padding: 6px 12px;
  background: #333;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.copy-prompt-btn:hover {
  background: #444;
}

.prompt-section {
  margin-bottom: 8px;
}

.prompt-section label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.prompt-text {
  font-family: monospace;
  font-size: 13px;
  color: #e0e0e0;
  background: #0a0a0a;
  padding: 8px;
  border-radius: 4px;
}
```

**Acceptance Criteria:**
- [ ] 탭 전환 스타일 적용
- [ ] 영상 소스 생성기 UI 스타일 적용
- [ ] 프롬프트 카드 스타일 적용

---

## Dependencies

Wave 1 완료 후 (template-video.js, video-ui.js 존재)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app.js` | MODIFY |
| `index.html` | MODIFY |
| `style.css` | MODIFY |

---

## Verification

- 탭 전환 클릭 시 컨텐츠 전환 확인
- 영상 소스 생성기 탭에서 대본 입력 → 프롬프트 생성 확인
- 카피 버튼 동작 확인
