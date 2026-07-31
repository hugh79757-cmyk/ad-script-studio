// app.js — 이벤트 바인딩 + 태그 입력 UI + 탭 전환 + 검증 + 자동 조사
// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initScriptGeneration();
  initModeToggle();  // Phase 4: 수동/자동 모드 전환 초기화
  initPhase3();  // Phase 3: 당위성 엔진 초기화
  initToolTabs();  // Phase 5: 도구 탭 전환 초기화
  initAutoResearch();  // 자동 조사 초기화
  initFieldSourceTracking();  // 필드 출처 추적 초기화
});

// 1. 입력 필드 → state 바인딩
function initInputBindings() {
  document.querySelectorAll('[data-field]').forEach(el => {
    const field = el.dataset.field;
    el.addEventListener('input', (e) => {
      if (field === 'reviewExcerpts') {
        const excerpts = parseReviewExcerpts(e.target.value);
        updateState('reviewExcerpts', excerpts);
      } else if (field === 'excludedKeywords') {
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
  renderTags(container, 'trustFactors');
}

// 태그 렌더링
function renderTags(container, field) {
  const input = container.querySelector('.tag-input');
  container.querySelectorAll('.tag-item').forEach(tag => tag.remove());
  appState[field].forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'tag-item';
    tag.innerHTML = `${item}<span class="remove-tag" data-index="${index}">×</span>`;
    container.insertBefore(tag, input);
  });
  container.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      removeArrayItem(field, parseInt(btn.dataset.index));
      renderTags(container, field);
    });
  });
}

// 유틸
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// 3b. 도구 탭 전환 (전략 제안서 / 영상 소스)
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

// 5. 대본 결과 렌더링
function renderScriptResult(scenes) {
  const container = document.getElementById('script');
  container.innerHTML = `
    <div class="result-header">
      <h3>생성된 대본</h3>
      <div class="action-buttons">
        <button class="copyBtn" type="button">복사</button>
        <button class="pdfBtn" type="button">PDF 다운로드</button>
        <button class="resetBtn" type="button">새로 만들기</button>
      </div>
      <div class="duration-selector">
        <button class="duration-btn active" type="button" data-duration="60">60초</button>
        <button class="duration-btn" type="button" data-duration="30">30초</button>
        <button class="duration-btn" type="button" data-duration="15">15초</button>
      </div>
    </div>
    <table class="script-table">
      <thead>
        <tr>
          <th>시간</th>
          <th>타입</th>
          <th>대사</th>
          <th>연출지시</th>
        </tr>
      </thead>
      <tbody>
        ${scenes.map(scene => `
          <tr>
            <td class="time-cell">${escapeHtml(scene.time || '')}</td>
            <td class="type-cell">${escapeHtml(scene.type || '')}</td>
            <td class="dialogue-cell">${escapeHtml(scene.dialogue || '')}</td>
            <td class="direction-cell">${escapeHtml(scene.direction || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindActionButtons(scenes);
  bindDurationSelector();
}

// 6. 스토리보드 렌더링
function renderStoryboardResult(scenes) {
  const container = document.getElementById('storyboard');
  container.innerHTML = `
    <h3>스토리보드</h3>
    <div class="storyboard-cards">
      ${scenes.map((scene, idx) => `
        <div class="storyboard-card">
          <div class="card-header">${idx + 1}. ${escapeHtml(scene.time || '')}</div>
          <div class="card-visual">[시각 프롬프트]</div>
          <div class="card-content">
            <div class="card-dialogue">${escapeHtml(scene.dialogue || '')}</div>
            <div class="card-direction">${escapeHtml(scene.direction || '')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 7. 액션 버튼 바인딩
function bindActionButtons(scenes) {
  const scriptContainer = document.getElementById('script');
  const copyBtn = scriptContainer.querySelector('.copyBtn');
  const pdfBtn = scriptContainer.querySelector('.pdfBtn');
  const resetBtn = scriptContainer.querySelector('.resetBtn');

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = scenes.map(s => `[${s.time}] ${s.type}\n대사: ${s.dialogue}\n연출: ${s.direction}`).join('\n\n');
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = '복사됨!';
        setTimeout(() => { copyBtn.textContent = '복사'; }, 2000);
      } catch (err) {
        console.error('클립보드 복사 실패', err);
      }
    });
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      downloadScriptPDF(scenes, appState);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetState();
      resetUI();
    });
  }
}

// 8. duration 선택기 바인딩
function bindDurationSelector() {
  const container = document.getElementById('script');
  container.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const duration = parseInt(btn.dataset.duration, 10);
      const currentScenes = generateScript(appState);
      const abbreviated = abbreviateScript(currentScenes, duration);
      renderScriptResult(abbreviated);
      renderStoryboardResult(abbreviated);
    });
  });
}

// 9. UI 리셋
function resetUI() {
  document.querySelectorAll('[data-field]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = '';
    } else {
      el.textContent = '';
    }
  });
  renderTags(document.getElementById('trustFactorsTagInput'), 'trustFactors');
  document.getElementById('script').innerHTML = '<p class="empty-message">생성된 대본이 여기에 표시됩니다.</p>';
  document.getElementById('storyboard').innerHTML = '<p class="empty-message">스토리보드가 여기에 표시됩니다.</p>';
  document.getElementById('strategy').innerHTML = '<p class="empty-message">입력 필드를 작성하고 "전략 제안서 생성" 버튼을 클릭하세요</p>';
}

// === Phase 3: 당위성 엔진 + 설득형 제안서 ===

// 10. Phase 3 초기화
function initPhase3() {
  // 스킬 파일 로드
  loadSkillFile().then(principles => {
    window.appPrinciples = principles;
    console.log(`[Phase 3] ${principles.length}개 원칙 로드 완료`);
  }).catch(error => {
    console.error('[Phase 3] 스킬 파일 로드 실패:', error);
    window.appPrinciples = [];
  });
  
  // 당위성 근거 생성 버튼 이벤트 (전략 개요 탭에 추가)
  const strategyTab = document.getElementById('strategy');
  if (strategyTab) {
    // 당위성 근거 생성 버튼 추가
    const rationaleBtn = document.createElement('button');
    rationaleBtn.id = 'generateRationaleBtn';
    rationaleBtn.className = 'action-btn rationale-btn';
    rationaleBtn.type = 'button';
    rationaleBtn.textContent = '당위성 근거 생성';
    rationaleBtn.style.marginTop = '10px';
    rationaleBtn.style.marginRight = '10px';
    
    // 제안서 PDF 다운로드 버튼 추가
    const proposalPdfBtn = document.createElement('button');
    proposalPdfBtn.id = 'proposalPdfBtn';
    proposalPdfBtn.className = 'action-btn proposal-pdf-btn';
    proposalPdfBtn.type = 'button';
    proposalPdfBtn.textContent = '제안서 PDF 다운로드';
    proposalPdfBtn.style.marginTop = '10px';
    
    // 버튼 컨테이너 생성
    const btnContainer = document.createElement('div');
    btnContainer.className = 'phase3-buttons';
    btnContainer.appendChild(rationaleBtn);
    btnContainer.appendChild(proposalPdfBtn);
    
    // 기존 내용 앞에 버튼 추가
    strategyTab.insertBefore(btnContainer, strategyTab.firstChild);
    
    // 당위성 근거 생성 버튼 이벤트
    rationaleBtn.addEventListener('click', () => {
      const principles = window.appPrinciples || [];
      if (principles.length === 0) {
        alert('원칙이 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      const rationale = generateRationaleManually(appState, principles);
      renderRationaleCards(rationale);
      window.appRationale = rationale;
    });
    
    // 제안서 PDF 다운로드 버튼 이벤트
    proposalPdfBtn.addEventListener('click', () => {
      if (!window.appRationale) {
        alert('먼저 당위성 근거를 생성해주세요.');
        return;
      }
      if (!window.appScenes || window.appScenes.length === 0) {
        alert('먼저 대본을 생성해주세요.');
        return;
      }
      downloadProposalPDF(
        {},  // 추가 데이터
        appState,
        window.appScenes,
        window.appRationale,
        window.appPrinciples || []
      );
    });
  }
  
  // 수동↔자동 모드 전환 — initModeToggle()에서 처리 (Phase 4)
}

// 11. 스크립트 생성 시 씬 데이터 저장 + 당위성 근거 자동 생성
function initScriptGeneration() {
  const form = document.getElementById('inputForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = validateRequired();
    // 모든 경고 초기화
    document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
    // 에러 표시
    errors.forEach(err => {
      const errorEl = document.querySelector(`.field-error[data-error="${err.field}"]`);
      if (errorEl) errorEl.classList.add('visible');
    });
    if (errors.length === 0) {
      if (appState.mode === 'auto') {
        // 자동 모드: Claude API 호출
        await callGenerateAPI();
      } else {
        // 수동 모드: 템플릿 기반 생성
        const scenes = generateScript(appState);
        window.appScenes = scenes;  // Phase 3에서 사용하기 위해 저장
        renderScriptResult(scenes);
        renderStoryboardResult(scenes);
        
        // Phase 3: 당위성 근거 자동 생성 (수동 모드)
        const principles = window.appPrinciples || [];
        if (principles.length > 0) {
          const rationale = generateRationaleManually(appState, principles);
          renderRationaleCards(rationale);
          window.appRationale = rationale;
        }
      }
    }
  });
}

// === Phase 4: Claude API 자동화 + 모드 전환 ===

// 12. 모드 전환 초기화
function initModeToggle() {
  const toggle = document.getElementById('modeToggle');
  const modeLabel = document.getElementById('modeLabel');
  
  if (!toggle) return;
  
  toggle.addEventListener('change', (e) => {
    const mode = e.target.checked ? 'auto' : 'manual';
    appState.mode = mode;
    
    // UI 업데이트
    modeLabel.textContent = mode === 'auto' ? '자동 모드' : '수동 모드';
    updateUIForMode(mode);
  });
}

// 13. 모드별 UI 업데이트
function updateUIForMode(mode) {
  const generateBtn = document.querySelector('.generate-btn');
  
  if (mode === 'auto') {
    generateBtn.textContent = '자동 생성';
  } else {
    generateBtn.textContent = '전략 제안서 생성';
  }
}

// 14. Claude API 호출
async function callGenerateAPI() {
  const spinner = document.getElementById('loadingSpinner');
  const generateBtn = document.querySelector('.generate-btn');
  
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
    generateBtn.textContent = '자동 생성';
  }
}

// 15. 자동 모드 결과 렌더링
function renderAutoResult(result) {
  // 전략 개요 렌더링
  const strategyEl = document.getElementById('strategy');
  if (result.strategy) {
    strategyEl.innerHTML = `<div class="auto-result">${result.strategy}</div>`;
  }
  
  // 대본 렌더링
  const scriptEl = document.getElementById('script');
  if (result.script) {
    scriptEl.innerHTML = `
      <div class="result-header">
        <h3>생성된 대본</h3>
        <div class="action-buttons">
          <button class="copyBtn" type="button">복사</button>
        </div>
      </div>
      <div class="auto-script-content">${result.script}</div>
    `;
    // 복사 버튼 바인딩
    const copyBtn = scriptEl.querySelector('.copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.script);
          copyBtn.textContent = '복사됨!';
          setTimeout(() => { copyBtn.textContent = '복사'; }, 2000);
        } catch (err) {
          console.error('클립보드 복사 실패', err);
        }
      });
    }
  }
  
  // 당위성 근거 렌더링 (전략 탭에 추가)
  if (result.rationale) {
    const rationaleDiv = document.createElement('div');
    rationaleDiv.className = 'auto-rationale';
    rationaleDiv.innerHTML = `<h4>당위성 근거</h4>${result.rationale}`;
    strategyEl.appendChild(rationaleDiv);
  }
  
  // Phase 6: "2번으로 보내기" 버튼 추가 (제안서 결과 하단)
  const transferDiv = document.createElement('div');
  transferDiv.className = 'result-actions';
  transferDiv.innerHTML = `
    <button id="transferBtn" class="transfer-btn" type="button">
      2번으로 보내기 →
    </button>
    <button id="shareReviewBtn" class="share-link-btn" type="button">
      📋 고객 공유 링크 복사
    </button>
  `;
  strategyEl.appendChild(transferDiv);
  
  // "2번으로 보내기" 버튼 바인딩
  document.getElementById('transferBtn').addEventListener('click', () => {
    // 현재 결과 저장
    saveProposalResults({
      script: result.script,
      inputs: { ...appState }
    });
    // 영상 소스 생성기에 전달
    transferToVideoGenerator();
  });
  
  // "고객 공유 링크 복사" 버튼 바인딩
  document.getElementById('shareReviewBtn').addEventListener('click', async () => {
    await createReviewLink(result);
  });
  
  // 결과 영역 표시 + 전략 탭 활성화
  document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.result-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="strategy"]').classList.add('active');
  strategyEl.classList.add('active');
}

// 16. 에러 표시
function showError(message) {
  alert(message);
}

// === 자동 조사 시스템 ===

// 17. 토스트 알림
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // 애니메이션 시작
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // 3초 후 제거
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 18. 필드 출처 추적 초기화
function initFieldSourceTracking() {
  // 자동 조사로 채워진 필드를 추적
  const autoFields = ['competitorInfo', 'priceRange', 'reviewExcerpts', 'trustFactors'];
  
  autoFields.forEach(field => {
    const el = document.getElementById(field);
    if (!el) return;
    
    // 사용자가 직접 수정하면 'user'로 마킹
    const eventHandler = () => {
      if (getFieldSource(field) === 'auto-research') {
        setFieldSource(field, 'user');
        clearAutoResearchedUI(field);
      }
    };
    
    el.addEventListener('input', eventHandler);
    el.addEventListener('change', eventHandler);
    
    // 태그 입력의 경우 별도 처리 (trustFactors)
    if (field === 'trustFactors') {
      const tagContainer = document.getElementById('trustFactorsTagInput');
      if (tagContainer) {
        tagContainer.addEventListener('click', () => {
          if (getFieldSource(field) === 'auto-research') {
            setFieldSource(field, 'user');
            clearAutoResearchedUI(field);
          }
        });
      }
    }
  });
}

// 19. 자동 조사 UI 초기화
function initAutoResearch() {
  const btn = document.getElementById('autoResearchBtn');
  if (!btn) return;
  
  btn.addEventListener('click', runAutoResearch);
}

// 20. 자동 조사 실행
async function runAutoResearch() {
  const brandName = document.getElementById('brandName')?.value?.trim();
  const productName = document.getElementById('productName')?.value?.trim();
  
  if (!brandName && !productName) {
    showToast('브랜드명 또는 제품명을 먼저 입력해주세요.', 'warning');
    return;
  }
  
  const btn = document.getElementById('autoResearchBtn');
  btn.disabled = true;
  btn.querySelector('.spinner-small').style.display = 'block';
  
  showToast('자동 조사를 시작합니다...', 'info');
  
  try {
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, productName })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `API 오류: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '자동 조사 실패');
    }
    
    const data = result.data;
    let filledCount = 0;
    
    // 경쟁사信息 채우기
    if (data.competitors && typeof data.competitors === 'string' && data.competitors.trim()) {
      fillField('competitorInfo', data.competitors.trim());
      filledCount++;
    }
    
    // 가격대 채우기
    if (data.priceRange && typeof data.priceRange === 'string' && data.priceRange.trim()) {
      fillField('priceRange', data.priceRange.trim());
      filledCount++;
    }
    
    // 리뷰 발췌 채우기
    if (data.reviews && Array.isArray(data.reviews) && data.reviews.length > 0) {
      const reviewText = data.reviews.join('\n');
      fillField('reviewExcerpts', reviewText);
      filledCount++;
    }
    
    // 브랜드 신뢰요소 채우기
    if (data.trustFactors && Array.isArray(data.trustFactors) && data.trustFactors.length > 0) {
      fillTrustFactors(data.trustFactors);
      filledCount++;
    }
    
    if (filledCount > 0) {
      showToast(`자동 조사 완료 — ${filledCount}개 필드가 채워졌습니다. 검토 후 수정하세요.`, 'success');
    } else {
      showToast('자동 조사 결과를 찾을 수 없습니다. 직접 입력해주세요.', 'warning');
    }
    
    // 에러가 있었으면 표시
    if (result.errors && result.errors.length > 0) {
      console.warn('[자동 조사] 일부 쿼리 실패:', result.errors);
    }
    
  } catch (err) {
    console.error('[자동 조사] 오류:', err);
    showToast(`자동 조사 실패: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.spinner-small').style.display = 'none';
  }
}

// 21. 필드 채우기 + 자동 조사 UI 표시
function fillField(fieldId, value) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  
  el.value = value;
  
  // 상태 업데이트
  if (typeof updateState === 'function') {
    if (fieldId === 'reviewExcerpts') {
      const excerpts = parseReviewExcerpts(value);
      updateState('reviewExcerpts', excerpts);
    } else {
      updateState(fieldId, value);
    }
  }
  
  // 출처 마킹
  if (typeof setFieldSource === 'function') {
    setFieldSource(fieldId, 'auto-research');
  }
  
  // 자동 조사 UI 표시
  showAutoResearchedUI(fieldId);
}

// 22. 태그 필드(신뢰요소) 채우기
function fillTrustFactors(factors) {
  const container = document.getElementById('trustFactorsTagInput');
  if (!container) return;
  
  // 기존 태그 유지하면서 추가
  factors.forEach(factor => {
    if (typeof addArrayItem === 'function') {
      addArrayItem('trustFactors', factor);
    }
  });
  
  if (typeof renderTags === 'function') {
    renderTags(container, 'trustFactors');
  }
  
  // 출처 마킹
  if (typeof setFieldSource === 'function') {
    setFieldSource('trustFactors', 'auto-research');
  }
  
  showAutoResearchedUI('trustFactors');
}

// 23. 자동 조사 UI 표시
function showAutoResearchedUI(fieldId) {
  const label = document.getElementById(`label-${fieldId}`);
  const group = document.getElementById(`group-${fieldId}`);
  
  if (label) label.classList.add('visible');
  if (group) group.classList.add('auto-researched');
}

// 24. 자동 조사 UI 제거
function clearAutoResearchedUI(fieldId) {
  const label = document.getElementById(`label-${fieldId}`);
  const group = document.getElementById(`group-${fieldId}`);
  
  if (label) label.classList.remove('visible');
  if (group) group.classList.remove('auto-researched');
}

// === 고객 검토 링크 생성 ===

// 25. 검토 링크 생성 + 클립보드 복사
async function createReviewLink(result) {
  try {
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: appState.brandName,
        productName: appState.productName,
        script: result.script || null,
        rationale: result.rationale || [],
        strategy: result.strategy || null
      })
    });
    
    if (!response.ok) throw new Error('리뷰 생성 실패');
    
    const data = await response.json();
    const reviewUrl = `${baseUrl}/review/${data.id}`;
    
    // 클립보드에 복사
    try {
      await navigator.clipboard.writeText(reviewUrl);
      showToast('고객 검토 링크가 클립보드에 복사되었습니다.', 'success');
    } catch {
      // clipboard API 실패 시 프롬프트로 대체
      prompt('아래 링크를 복사하여 고객에게 전달하세요:', reviewUrl);
    }
    
    return reviewUrl;
  } catch (err) {
    console.error('[검토 링크] 오류:', err);
    showToast('검토 링크 생성에 실패했습니다.', 'error');
    return null;
  }
}
