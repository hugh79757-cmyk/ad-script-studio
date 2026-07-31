# PLAN — Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF

> Phase: 2
> Requirements: R5, R6, R7
> Mode: default (horizontal layers)

## Goal
템플릿 기반 60초 숏폼 대본 생성 및 결과 카드 렌더링 — **대본은 제안서 안에 포함된 하나의 구성요소**로 설계

## Success Criteria
- [ ] "생성" 버튼 클릭 시 템플릿 기반 60초 숏폼 대본이 결과 영역에 렌더링됨
- [ ] 대본은 타임라인(0:00-0:03 등) + 대사 + 연출지시 포함
- [ ] "PDF 다운로드" 버튼 클릭 시 jsPDF로 표준 PDF 생성 및 다운로드
- [ ] "복사" 버튼 클릭 시 대본 전체가 클립보드에 복사됨
- [ ] "새로 만들기" 버튼 클릭 시 입력/결과 초기화
- [ ] 대본 결과 영역에 타임라인 테이블 형태로 렌더링됨
- [ ] 스토리보드 결과 영역에 장면별 카드 형태로 렌더링됨
- [ ] 한글 PDF 생성 시 깨짐 없음

---

## Wave 1: 핵심 파일 3개 (병렬 생성)

### Plan 1: template-plan.js — 대본 템플릿 + 단축 규칙

**파일:** `template-plan.js`
**목적:** 60초 숏폼 대본을 템플릿 기반으로 생성하고, 단축 규칙을 적용하여 15초/30초 변환 지원

**구현:**
```javascript
// template-plan.js — 대본 템플릿 + 단축 규칙

/**
 * 60초 숏폼 대본 템플릿 구조
 * 각 씬은 { time, dialogue, direction, visual } 형태
 */
const SCRIPT_TEMPLATE = {
  // 60초 기본 템플릿 (7개 씬)
  scenes: [
    { time: '0:00-0:03', type: 'hook', dialogue: '', direction: '', visual: '' },
    { time: '0:03-0:10', type: 'problem', dialogue: '', direction: '', visual: '' },
    { time: '0:10-0:20', type: 'solution', dialogue: '', direction: '', visual: '' },
    { time: '0:20-0:30', type: 'benefit', dialogue: '', direction: '', visual: '' },
    { time: '0:30-0:40', type: 'proof', dialogue: '', direction: '', visual: '' },
    { time: '0:40-0:50', type: 'cta', dialogue: '', direction: '', visual: '' },
    { time: '0:50-0:60', type: 'closing', dialogue: '', direction: '', visual: '' },
  ],
  // 타입별 템플릿 문구 (한국어)
  templates: {
    hook: {
      dialogue: '{brandName}으로 바꾼 후, {target}들의 반응이 달라졌어요.',
      direction: '카메라: 클로즈업 → 풀샷 전환',
      visual: '제품 이미지 또는 사용 장면'
    },
    problem: {
      dialogue: '{target}들이 가장 고민하는 것, 바로 {painPoint}입니다.',
      direction: '인터뷰 또는 POV 시점',
      visual: '타겟의 일상적 고민 장면'
    },
    solution: {
      dialogue: '{brandName} {productName}은 {keyBenefit}를 제공합니다.',
      direction: '제품 데모 또는 사용법 시연',
      visual: '제품 특징 하이라이트'
    },
    benefit: {
      dialogue: '{resultStat}을 경험한 {target}들의 실제 후기입니다.',
      direction: '데이터 시각화 또는 리뷰 스크린샷',
      visual: '수치 또는 리뷰 캡처'
    },
    proof: {
      dialogue: '{trustFactor}로 검증된 {brandName}입니다.',
      direction: '인증 마크 또는 수상 내역 표시',
      visual: '신뢰 요소 시각화'
    },
    cta: {
      dialogue: '지금 바로 {brandName} {productName}을 만나보세요.',
      direction: 'QR 코드 또는 URL 표시',
      visual: 'CTA 버튼 또는 구매 링크'
    },
    closing: {
      dialogue: '{brandName} — {slogan}',
      direction: '로고 + 슬로건 합성',
      visual: '브랜드 로고'
    }
  }
};

/**
 * 템플릿에 상태 값을 주입하여 대본 생성
 * @param {Object} state - appState 객체
 * @returns {Array} 씬 배열
 */
function generateScript(state) {
  const scenes = SCRIPT_TEMPLATE.scenes.map(scene => {
    const template = SCRIPT_TEMPLATE.templates[scene.type];
    let dialogue = template.dialogue;
    
    // 치환 규칙
    dialogue = dialogue.replace('{brandName}', state.brandName || '브랜드명');
    dialogue = dialogue.replace('{productName}', state.productName || '제품명');
    dialogue = dialogue.replace('{target}', state.target || '고객');
    dialogue = dialogue.replace('{keyBenefit}', state.concept || '핵심 가치');
    dialogue = dialogue.replace('{trustFactor}', 
      (state.trustFactors && state.trustFactors.length > 0) 
        ? state.trustFactors.join(', ') 
        : '검증된 품질'
    );
    dialogue = dialogue.replace('{painPoint}', 
      state.competitorInfo || '해결되지 않은 문제'
    );
    dialogue = dialogue.replace('{resultStat}', 
      state.priceRange || '꾸준한 사랑'
    );
    dialogue = dialogue.replace('{slogan}', state.concept || '당신의 일상을 바꿉니다');
    
    return {
      time: scene.time,
      type: scene.type,
      dialogue: dialogue,
      direction: template.direction,
      visual: template.visual
    };
  });
  
  return scenes;
}

/**
 * 단축 규칙: 60초 대본을 15초/30초로 축약
 * @param {Array} scenes - 60초 씬 배열
 * @param {number} targetDuration - 목표 시간 (15, 30, 60)
 * @returns {Array} 축약된 씬 배열
 */
function abbreviateScript(scenes, targetDuration = 60) {
  if (targetDuration === 60) return scenes;
  
  // 30초: hook + problem + solution + cta (4개 씬)
  if (targetDuration === 30) {
    return scenes.filter(s => 
      ['hook', 'problem', 'solution', 'cta'].includes(s.type)
    ).map((s, i) => ({
      ...s,
      time: getTimeLabel(i, 4, 30)
    }));
  }
  
  // 15초: hook + solution + cta (3개 씬)
  if (targetDuration === 15) {
    return scenes.filter(s => 
      ['hook', 'solution', 'cta'].includes(s.type)
    ).map((s, i) => ({
      ...s,
      time: getTimeLabel(i, 3, 15)
    }));
  }
  
  return scenes;
}

/**
 * 시간 레이블 생성
 */
function getTimeLabel(index, totalScenes, totalDuration) {
  const segmentDuration = totalDuration / totalScenes;
  const start = index * segmentDuration;
  const end = Math.min((index + 1) * segmentDuration, totalDuration);
  return `0:${String(Math.floor(start)).padStart(2, '0')}-0:${String(Math.floor(end)).padStart(2, '0')}`;
}

// 전역 노출
window.generateScript = generateScript;
window.abbreviateScript = abbreviateScript;
window.SCRIPT_TEMPLATE = SCRIPT_TEMPLATE;
```

**의존성:** state-manager.js (appState 객체)
**검증:** 브라우저 콘솔에서 `generateScript(appState)` 호출 → 씬 배열 반환 확인

---

### Plan 2: pdf.js — jsPDF 래퍼

**파일:** `pdf.js`
**목적:** jsPDF를 사용하여 대본을 클라이언트 사이드에서 PDF로 생성 및 다운로드

**구현:**
```javascript
// pdf.js — jsPDF 래퍼 (클라이언트 사이드 PDF 생성)

/**
 * jsPDF CDN 로드 상태 확인
 */
function checkJsPdfLoaded() {
  return typeof window.jspdf !== 'undefined';
}

/**
 * 한글 폰트 로드 (Noto Sans KR CDN)
 * jsPDF는 기본적으로 한글을 지원하지 않으므로 폰트 로드 필요
 */
async function loadKoreanFont() {
  // Noto Sans KR CDN에서 폰트 로드
  const fontUrl = 'https://cdn.jsdelivr.net/gh/projectnoonun/noonfonts_one@1.0/NotoSansKR-Regular.woff';
  try {
    const response = await fetch(fontUrl);
    if (response.ok) {
      console.log('한글 폰트 로드 성공');
      return true;
    }
  } catch (e) {
    console.warn('한글 폰트 로드 실패, 기본 폰트로 생성');
  }
  return false;
}

/**
 * 대본을 PDF로 생성하여 다운로드
 * @param {Array} scenes - 대본 씬 배열
 * @param {Object} state - appState 객체
 * @param {string} title - PDF 제목
 */
async function downloadScriptPDF(scenes, state, title = '광고 기획안') {
  if (!checkJsPdfLoaded()) {
    alert('PDF 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // 폰트 설정 (한글 지원 시)
  await loadKoreanFont();
  
  // 제목
  doc.setFontSize(20);
  doc.text(title, 20, 20);
  
  // 브랜드명 + 제품명
  doc.setFontSize(12);
  doc.text(`브랜드: ${state.brandName || '-'}`, 20, 35);
  doc.text(`제품: ${state.productName || '-'}`, 20, 42);
  doc.text(`타겟: ${state.target || '-'}`, 20, 49);
  
  // 구분선
  doc.setDrawColor(200);
  doc.line(20, 55, 190, 55);
  
  // 대본 내용
  let y = 65;
  doc.setFontSize(14);
  doc.text('대본', 20, y);
  y += 10;
  
  doc.setFontSize(10);
  scenes.forEach((scene, index) => {
    // 타임라인
    doc.setFont(undefined, 'bold');
    doc.text(`[${scene.time}] ${scene.type.toUpperCase()}`, 20, y);
    y += 6;
    
    // 대사
    doc.setFont(undefined, 'normal');
    const dialogueLines = doc.splitTextToSize(scene.dialogue, 170);
    doc.text(dialogueLines, 25, y);
    y += dialogueLines.length * 5 + 3;
    
    // 연출지시
    doc.setTextColor(100);
    const directionLines = doc.splitTextToSize(`연출: ${scene.direction}`, 170);
    doc.text(directionLines, 25, y);
    y += directionLines.length * 5 + 8;
    
    doc.setTextColor(0);
    
    // 페이지 넘김 검사
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  
  // 하단 정보
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`생성일: ${new Date().toLocaleDateString('ko-KR')}`, 20, 285);
  doc.text('AD SCRIPT STUDIO', 170, 285);
  
  // PDF 다운로드
  const filename = `${state.brandName || 'brand'}_${state.productName || 'product'}_기획안.pdf`;
  doc.save(filename);
}

// 전역 노출
window.downloadScriptPDF = downloadScriptPDF;
```

**의존성:** jsPDF CDN (index.html에 스크립트 태그로 추가)
**검증:** 브라우저에서 PDF 다운로드 버튼 클릭 → PDF 파일 생성 확인

---

### Plan 3: app.js 업데이트 — 생성 버튼 연결 + 결과 렌더링 + 버튼 동작

**파일:** `app.js` (기존 파일 업데이트)
**목적:** 생성 버튼 클릭 시 대본 생성 → 결과 렌더링 → 복사/새로 만들기/PDF 다운로드 버튼 동작

**구현 변경:**
```javascript
// 기존 코드 유지...

// === Phase 2 추가 ===

// 5. 대본 생성 + 결과 렌더링
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
      // 대본 생성
      const scenes = generateScript(appState);
      renderScriptResult(scenes);
      renderStoryboardResult(scenes);
      showActionButtons();
    }
  });
}

// 6. 대본 결과 렌더링 (타임라인 테이블)
function renderScriptResult(scenes) {
  const container = document.getElementById('script');
  container.innerHTML = `
    <div class="script-result">
      <div class="result-header">
        <h3>생성된 대본</h3>
        <div class="action-buttons">
          <button id="copyBtn" class="action-btn copy-btn">복사</button>
          <button id="pdfBtn" class="action-btn pdf-btn">PDF 다운로드</button>
          <button id="resetBtn" class="action-btn reset-btn">새로 만들기</button>
        </div>
      </div>
      <div class="duration-selector">
        <button class="duration-btn active" data-duration="60">60초</button>
        <button class="duration-btn" data-duration="30">30초</button>
        <button class="duration-btn" data-duration="15">15초</button>
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
              <td class="time-cell">${scene.time}</td>
              <td class="type-cell">${scene.type}</td>
              <td class="dialogue-cell">${scene.dialogue}</td>
              <td class="direction-cell">${scene.direction}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  // 이벤트 바인딩
  bindActionButtons(scenes);
  bindDurationSelector();
}

// 7. 스토리보드 결과 렌더링 (카드 형태)
function renderStoryboardResult(scenes) {
  const container = document.getElementById('storyboard');
  container.innerHTML = `
    <div class="storyboard-result">
      <h3>스토리보드</h3>
      <div class="storyboard-cards">
        ${scenes.map((scene, index) => `
          <div class="storyboard-card">
            <div class="card-header">
              <span class="card-number">${index + 1}</span>
              <span class="card-time">${scene.time}</span>
            </div>
            <div class="card-visual">
              <div class="visual-placeholder">${scene.visual}</div>
            </div>
            <div class="card-content">
              <div class="card-dialogue">${scene.dialogue}</div>
              <div class="card-direction">${scene.direction}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 8. 액션 버튼 이벤트 바인딩
function bindActionButtons(scenes) {
  // 복사 버튼
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const scriptText = scenes.map(s => 
        `[${s.time}] ${s.type}\n${s.dialogue}\n연출: ${s.direction}`
      ).join('\n\n');
      navigator.clipboard.writeText(scriptText).then(() => {
        copyBtn.textContent = '복사됨!';
        setTimeout(() => copyBtn.textContent = '복사', 2000);
      });
    });
  }
  
  // PDF 다운로드 버튼
  const pdfBtn = document.getElementById('pdfBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      downloadScriptPDF(scenes, appState);
    });
  }
  
  // 새로 만들기 버튼
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetState();
      resetUI();
    });
  }
}

// 9. 단축 규칙 선택 이벤트
function bindDurationSelector() {
  document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const duration = parseInt(btn.dataset.duration);
      const fullScenes = generateScript(appState);
      const abbreviated = abbreviateScript(fullScenes, duration);
      renderScriptResult(abbreviated);
      renderStoryboardResult(abbreviated);
    });
  });
}

// 10. UI 초기화
function resetUI() {
  // 입력 필드 초기화
  document.querySelectorAll('[data-field]').forEach(el => {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = '';
    } else if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    }
  });
  
  // 태그 입력 초기화
  const tagContainer = document.getElementById('trustFactorsTagInput');
  if (tagContainer) renderTags(tagContainer, 'trustFactors');
  
  // 결과 영역 초기화
  document.getElementById('script').innerHTML = `
    <div class="empty-state">대본이 여기에 표시됩니다</div>
  `;
  document.getElementById('storyboard').innerHTML = `
    <div class="empty-state">스토리보드가 여기에 표시됩니다</div>
  `;
}

// 기존 initValidation 제거하고 initScriptGeneration으로 교체
function initValidation() {
  // Phase 2에서 생성 로직으로 대체됨
}

// DOMContentLoaded에 추가
document.addEventListener('DOMContentLoaded', () => {
  initInputBindings();
  initTagInput();
  initTabSwitching();
  initScriptGeneration();  // Phase 2: 생성 로직 초기화
});
```

**의존성:** template-plan.js, pdf.js, state-manager.js
**검증:** 브라우저에서 "전략 제안서 생성" 클릭 → 대본 테이블 렌더링 + 스토리보드 카드 렌더링

---

## Verification Checklist

### Functional Verification
- [ ] 브랜드명, 제품명, 타겟 입력 후 "전략 제안서 생성" 클릭 → 대본 테이블 표시
- [ ] 대본 테이블에 타임라인(0:00-0:03 등) + 대사 + 연출지시 포함
- [ ] 60초/30초/15초 단축 규칙 선택 시 대본 씬 수 변경
- [ ] "복사" 버튼 클릭 → 클립보드에 대본 텍스트 복사
- [ ] "PDF 다운로드" 버튼 클릭 → PDF 파일 다운로드
- [ ] "새로 만들기" 버튼 클릭 → 입력/결과 초기화
- [ ] 스토리보드 탭에 장면별 카드 형태로 렌더링

### UI Verification
- [ ] 결과 영역에 액션 버튼(복사/PDF/새로 만들기) 표시
- [ ] 단축 규칙 선택 버튼 표시 (60초/30초/15초)
- [ ] 대본 테이블 가독성 (행 높이, 폰트 크기)
- [ ] 스토리보드 카드 레이아웃 적절함

### Edge Case Verification
- [ ] 필수 필드 미입력 시 경고 표시 (기존 검증 유지)
- [ ] 입력값 없이 생성 클릭 시 기본 템플릿 문구로 생성
- [ ] 리뷰 발췌, 신뢰요소 등 배열 필드가 대본에 적절히 반영
