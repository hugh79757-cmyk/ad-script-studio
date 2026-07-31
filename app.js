// app.js — 이벤트 바인딩 + 태그 입력 UI + 탭 전환 + 검증
// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initScriptGeneration();
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

// 4. 스크립트 생성 핸들러
function initScriptGeneration() {
  const form = document.getElementById('inputForm');
  form.addEventListener('submit', (e) => {
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
      const scenes = generateScript(appState);
      renderScriptResult(scenes);
      renderStoryboardResult(scenes);
    }
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
}
