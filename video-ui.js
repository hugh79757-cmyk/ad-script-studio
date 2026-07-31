// video-ui.js — 영상 소스 생성기 UI
// escapeHtml()는 app.js에서 제공됨

/**
 * 영상 소스 생성기 UI 초기화
 */
function initVideoUI() {
  const container = document.getElementById('videoGeneratorUI');
  
  container.innerHTML = `
    <div class="video-input-section">
      <h3>대본 입력</h3>
      <textarea id="videoScriptInput" 
        placeholder="60초 대본을 입력하세요...&#10;예:&#10;0:00-0:03 놀란 표정의 여성이 제품을 들어올림&#10;0:03-0:06 제품 클로즈업, 반짝이는 효과"
        rows="10"></textarea>
      
      <div class="detail-selector">
        <label>상세도:</label>
        <button class="detail-btn" data-detail="최소">최소</button>
        <button class="detail-btn active" data-detail="보통">보통</button>
        <button class="detail-btn" data-detail="상세">상세</button>
      </div>
      
      <button id="generateVideoPrompts" class="generate-video-btn">
        프롬프트 생성
      </button>
    </div>
    
    <div id="videoResults" class="video-results"></div>
  `;
  
  // 이벤트 바인딩
  bindVideoEvents();
}

/**
 * 이벤트 바인딩
 */
function bindVideoEvents() {
  // 상세도 선택
  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.detail-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // 프롬프트 생성
  document.getElementById('generateVideoPrompts').addEventListener('click', () => {
    const scriptText = document.getElementById('videoScriptInput').value;
    const detailLevel = document.querySelector('.detail-btn.active').dataset.detail;
    
    if (!scriptText.trim()) {
      alert('대본을 입력하세요.');
      return;
    }
    
    const prompts = generateAllPrompts(scriptText, detailLevel);
    renderVideoResults(prompts);
  });
}

/**
 * 결과 렌더링
 */
function renderVideoResults(prompts) {
  const container = document.getElementById('videoResults');
  
  container.innerHTML = `
    <div class="video-results-header">
      <h3>생성된 프롬프트 (${prompts.length}개 씬)</h3>
      <button id="copyAllPrompts" class="copy-all-btn">전체 복사</button>
    </div>
    
    <div class="video-prompts-list">
      ${prompts.map((prompt, idx) => `
        <div class="video-prompt-card">
          <div class="prompt-header">
            <span class="prompt-time">${prompt.time}</span>
            <button class="copy-prompt-btn" data-index="${idx}">복사</button>
          </div>
          
          <div class="prompt-section">
            <label>이미지 프롬프트:</label>
            <div class="prompt-text">${escapeHtml(prompt.imagePrompt)}</div>
          </div>
          
          <div class="prompt-section">
            <label>모션 프롬프트:</label>
            <div class="prompt-text">${escapeHtml(prompt.motionPrompt)}</div>
          </div>
          
          <div class="prompt-section">
            <label>스타일:</label>
            <div class="prompt-text">${escapeHtml(prompt.styleSuffix)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  // 카피 버튼 바인딩
  bindCopyButtons(prompts);
}

/**
 * 카피 버튼 바인딩
 */
function bindCopyButtons(prompts) {
  // 개별 카피
  document.querySelectorAll('.copy-prompt-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index);
      const prompt = prompts[idx];
      
      const text = [
        `이미지: ${prompt.imagePrompt}`,
        `모션: ${prompt.motionPrompt}`,
        `스타일: ${prompt.styleSuffix}`
      ].join('\n');
      
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '복사됨!';
        setTimeout(() => { btn.textContent = '복사'; }, 2000);
      } catch (err) {
        console.error('클립보드 복사 실패', err);
      }
    });
  });
  
  // 전체 복사
  document.getElementById('copyAllPrompts').addEventListener('click', async () => {
    const text = prompts.map((prompt, idx) => {
      return [
        `=== 씬 ${idx + 1} (${prompt.time}) ===`,
        `이미지: ${prompt.imagePrompt}`,
        `모션: ${prompt.motionPrompt}`,
        `스타일: ${prompt.styleSuffix}`,
        ''
      ].join('\n');
    }).join('');
    
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copyAllPrompts');
      btn.textContent = '복사됨!';
      setTimeout(() => { btn.textContent = '전체 복사'; }, 2000);
    } catch (err) {
      console.error('클립보드 복사 실패', err);
    }
  });
}
