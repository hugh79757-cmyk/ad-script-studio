# PLAN — Wave 1: 씬 파싱 + 프롬프트 생성 로직

> Phase: 5
> Wave: 1
> Requirements: R15, R16, R17

---

## Goal

영상 소스 생성기의 핵심 로직 구현 — 씬 파싱 + EN 프롬프트 생성

---

## Tasks

### Task 1: template-video.js 생성

**Description:** 씬 단위 파싱 + EN 프롬프트 생성 모듈

**Implementation:**
```javascript
// template-video.js — 씬 파싱 + 프롬프트 생성

/**
 * 대본 텍스트를 씬 단위로 파싱
 * @param {string} scriptText - 60초 대본 텍스트
 * @returns {Array<{time: string, description: string, dialogue: string}>}
 */
function parseScriptToScenes(scriptText) {
  const scenes = [];
  
  // 타임라인 패턴 매칭 (다양한 형식 지원)
  const timePattern = /(?:\[)?(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2])?)\]?/g;
  const lines = scriptText.split('\n').filter(line => line.trim());
  
  let currentScene = null;
  
  for (const line of lines) {
    const timeMatch = line.match(timePattern);
    
    if (timeMatch) {
      // 새 씬 시작
      if (currentScene) {
        scenes.push(currentScene);
      }
      
      const time = timeMatch[0].replace(/[\[\]]/g, '');
      const content = line.replace(timePattern, '').trim();
      
      currentScene = {
        time: time,
        description: content,
        dialogue: ''
      };
    } else if (currentScene) {
      // 현재 씬에 대사 추가
      currentScene.dialogue += (currentScene.dialogue ? '\n' : '') + line;
    }
  }
  
  // 마지막 씬 추가
  if (currentScene) {
    scenes.push(currentScene);
  }
  
  // 씬 수 제한 (최소 3개, 최대 10개)
  if (scenes.length < 3) {
    // 씬이 부족하면 자동 분할
    return splitScenesEqually(scriptText, Math.max(3, scenes.length));
  }
  
  return scenes.slice(0, 10);
}

/**
 * 씬이 부족할 때 균등 분할
 */
function splitScenesEqually(scriptText, targetCount) {
  const words = scriptText.split(/\s+/);
  const wordsPerScene = Math.ceil(words.length / targetCount);
  const scenes = [];
  
  for (let i = 0; i < targetCount; i++) {
    const start = i * wordsPerScene;
    const end = Math.min(start + wordsPerScene, words.length);
    const sceneWords = words.slice(start, end).join(' ');
    
    scenes.push({
      time: `${i * 3}:00-${(i + 1) * 3}:00`,
      description: sceneWords,
      dialogue: ''
    });
  }
  
  return scenes;
}

/**
 * 씬별 EN 이미지 프롬프트 생성
 */
function generateImagePrompt(scene, detailLevel = '보통') {
  const { description, dialogue } = scene;
  
  // 기본 요소 추출
  const elements = extractVisualElements(description + ' ' + dialogue);
  
  let prompt = '';
  
  switch (detailLevel) {
    case '최소':
      prompt = elements.slice(0, 3).join(', ');
      break;
    case '보통':
      prompt = `${elements[0]} ${elements[1]}, ${elements[2]}, professional photography`;
      break;
    case '상세':
      prompt = `${elements[0]} ${elements[1]}, ${elements[2]}, professional photography, cinematic lighting, high quality, detailed`;
      break;
  }
  
  return prompt;
}

/**
 * 씬별 모션 프롬프트 생성
 */
function generateMotionPrompt(scene, detailLevel = '보통') {
  const { description } = scene;
  
  // 모션 키워드 매핑
  const motionKeywords = {
    '놀': 'quick zoom-in with camera shake',
    '보': 'smooth pan across scene',
    '말': 'subtle camera movement following speaker',
    '보여': 'product showcase with gentle rotation',
    '기': 'uplifting camera movement with light effects'
  };
  
  let motion = 'subtle camera movement';
  
  for (const [keyword, motionText] of Object.entries(motionKeywords)) {
    if (description.includes(keyword)) {
      motion = motionText;
      break;
    }
  }
  
  switch (detailLevel) {
    case '최소':
      return motion.split(' ').slice(0, 3).join(' ');
    case '보통':
      return motion;
    case '상세':
      return `${motion}, smooth transitions, professional camera work`;
  }
}

/**
 * 시각 요소 추출
 */
function extractVisualElements(text) {
  const elements = [];
  
  // 인물 관련
  if (text.includes('여성') || text.includes('여자')) {
    elements.push('young woman');
  } else if (text.includes('남성') || text.includes('남자')) {
    elements.push('young man');
  } else {
    elements.push('person');
  }
  
  // 제품 관련
  if (text.includes('제품') || text.includes('상품')) {
    elements.push('product display');
  }
  
  // 감정 관련
  if (text.includes('놀') || text.includes('감')) {
    elements.push('surprised expression');
  } else if (text.includes('행복') || text.includes('기')) {
    elements.push('happy expression');
  }
  
  // 배경 관련
  elements.push('clean background');
  
  return elements;
}

/**
 * 공통 스타일 접미사
 */
function getStyleSuffix() {
  return '--style raw --ar 9:16';
}

/**
 * 전체 프롬프트 생성
 */
function generateAllPrompts(scriptText, detailLevel = '보통') {
  const scenes = parseScriptToScenes(scriptText);
  
  return scenes.map(scene => ({
    time: scene.time,
    imagePrompt: generateImagePrompt(scene, detailLevel),
    motionPrompt: generateMotionPrompt(scene, detailLevel),
    styleSuffix: getStyleSuffix()
  }));
}
```

**Acceptance Criteria:**
- [ ] `parseScriptToScenes()` 함수 존재
- [ ] `generateImagePrompt()` 함수 존재
- [ ] `generateMotionPrompt()` 함수 존재
- [ ] `generateAllPrompts()` 함수 존재

---

### Task 2: video-ui.js 생성

**Description:** 영상 소스 생성기 UI 모듈

**Implementation:**
```javascript
// video-ui.js — 영상 소스 생성기 UI

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
```

**Acceptance Criteria:**
- [ ] `initVideoUI()` 함수 존재
- [ ] 대본 입력 영역 존재
- [ ] 상세도 선택 버튼 존재
- [ ] 프롬프트 결과 표시 영역 존재
- [ ] 카피 버튼 동작

---

## Dependencies

None (first wave)

---

## Files to Create

| File | Action |
|------|--------|
| `template-video.js` | CREATE |
| `video-ui.js` | CREATE |

---

## Verification

- 브라우저 콘솔에서 `generateAllPrompts("0:00-0:03 놀란 여성이 제품을 들어올림\n0:03-0:06 제품 클로즈업", "보통")` 실행 → 결과 확인
- `initVideoUI()` 실행 → UI 렌더링 확인
