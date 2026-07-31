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
