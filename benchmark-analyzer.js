// benchmark-analyzer.js — 벤치마킹 분석기 탭 (UI + POST job 생성 + setInterval 폴링 + 결과 렌더링 + 카피 버튼)
// Phase 7 Wave 2 — 기존 파일(app.js/state-manager.js) 무수정, 벤치마킹 탭 로직 단일 파일 응집.
//
// 실행 모델 (PLAN.md): POST /api/benchmark → jobId 수신(즉시 응답) → setInterval(6s) GET /api/benchmark?id= 폴링.
// 서버는 lazy progression — 클라이언트 폴링이 파이프라인(크롤링→전사→분석)의 유일한 구동원이므로,
// 폴링이 진행되는 동안만 파이프라인이 전진한다. 15분 초과 시 클라이언트도 중단한다.
//
// 탭 초기화: app.js가 소유한 initToolTabs/switchTab은 수정 금지 → 여기서는 이벤트 위임(delegation)으로
// 벤치마킹 탭 최초 클릭을 감지해 lazy 초기화하고, 다른 탭으로 이탈하면 폴링을 정리한다.

// === 탭 클릭 위임 (lazy 초기화 + 탭 이탈 시 폴링 중단) ===
document.addEventListener('click', (e) => {
  const tabEl = e.target.closest('.tool-tab');
  if (!tabEl) return;

  if (tabEl.dataset.tab === 'benchmark') {
    // 벤치마킹 탭 최초 클릭 시 UI 렌더 (기존 탭 로직과 충돌 없음)
    if (!window.__benchmarkInit) {
      window.__benchmarkInit = true;
      renderBenchmarkUI();
    }
  } else {
    // 다른 탭으로 이탈 → 폴링 중단 (중복 폴링/백그라운드 실행 방지)
    clearBenchmarkPolling();
  }
});

// 세션 종료(새로고침/이탈) 시 폴링 정리
window.addEventListener('pagehide', clearBenchmarkPolling);

// === 상수 ===
const BM_POLL_INTERVAL = 6000;         // 5~8초 권장 구간 내 (6초)
const BM_MAX_WAIT_MS = 15 * 60 * 1000; // 15분 — 서버 MAX_POLLS(120)와 정합, 초과 시 클라이언트 중단

const BM_STAGES = [
  { key: 'crawling', label: '크롤링' },
  { key: 'transcribing', label: '전사' },
  { key: 'analyzing', label: '분석' },
  { key: 'done', label: '완료' }
];

const BM_STAGE_STATUS = {
  crawling: '바이럴 릴스를 크롤링하고 있습니다... (1~2분 소요)',
  transcribing: '릴스 음성 대본을 전사하고 있습니다...',
  analyzing: '공통 구조를 분석하고 새 대본을 만드는 중입니다...',
  done: '분석이 완료되었습니다.'
};

// === 헬퍼 ===
// app.js의 escapeHtml()과 동일 로직 (benchmark-analyzer.js가 app.js보다 먼저 로드되므로 자체 보유)
function bmEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 숫자를 한국어 로케일 천단위 구분으로 포맷 (조회수/좋아요) — 비수치 문자열은 이스케이프 (서버 데이터 innerHTML 삽입 방지)
function bmFormatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : bmEscapeHtml(String(value ?? '-'));
}

// 초 → m:ss 포맷 (전사 세그먼트 타임스탬프)
function bmFormatSeconds(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n)) return String(sec ?? '');
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// === UI 렌더 (탭 최초 클릭 시 1회) ===
function renderBenchmarkUI() {
  const root = document.getElementById('benchmarkAnalyzerUI');
  if (!root) return;

  root.innerHTML = `
    <div class="benchmark-input-section">
      <h3>벤치마킹 분석기</h3>
      <p class="benchmark-desc">인스타그램 계정의 바이럴 릴스를 전사·해부해 공통 구조(훅/전개/클로징)를 찾고, 새 대본 초안을 만들어드립니다.</p>
      <div class="benchmark-field">
        <label for="bmInstagramId">IG 계정 URL 또는 아이디 <span class="required">*</span></label>
        <input type="text" id="bmInstagramId" placeholder="예: @brand.account 또는 instagram.com/brand.account">
      </div>
      <div class="benchmark-field">
        <label for="bmBrandName">브랜드명 (선택)</label>
        <input type="text" id="bmBrandName" placeholder="새 대본에 적용할 브랜드명">
      </div>
      <div class="benchmark-field">
        <label for="bmKeyword">새 키워드 (선택)</label>
        <input type="text" id="bmKeyword" placeholder="새 대본에 반영할 키워드/컨셉">
      </div>
      <div class="benchmark-field">
        <label for="bmMaxReels">분석할 릴스 수 (기본 5, 서버가 다시 클램프)</label>
        <select id="bmMaxReels">
          <option value="3">3개</option>
          <option value="4">4개</option>
          <option value="5" selected>5개</option>
        </select>
      </div>
      <button type="button" id="bmStartBtn" class="benchmark-start-btn">분석 시작</button>
    </div>
    <div id="bmProgress" class="benchmark-progress benchmark-hidden"></div>
    <div id="bmStatus" class="benchmark-status-text benchmark-hidden"></div>
    <div id="bmResult" class="benchmark-result"></div>
  `;

  document.getElementById('bmStartBtn').addEventListener('click', startBenchmark);
}

// === 분석 시작 (POST job 생성) ===
async function startBenchmark() {
  const instagramId = document.getElementById('bmInstagramId').value.trim();
  if (!instagramId) {
    alert('IG 계정을 입력하세요.');
    document.getElementById('bmInstagramId').focus();
    return;
  }
  if (instagramId.length > 100) {
    alert('IG 계정은 100자 이하여야 합니다.');
    return;
  }

  const startBtn = document.getElementById('bmStartBtn');
  const maxReels = parseInt(document.getElementById('bmMaxReels').value, 10);

  // 기존 폴링/결과 정리 후 새 작업 시작
  clearBenchmarkPolling();
  resetBenchmarkOutput();

  startBtn.disabled = true;
  startBtn.textContent = '분석 시작 중...';

  try {
    const resp = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instagramId,
        brandName: document.getElementById('bmBrandName').value.trim(),
        keyword: document.getElementById('bmKeyword').value.trim(),
        maxReels
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      renderError(data.error || '분석 시작에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setStartButtonReady();
      return;
    }
    if (!data.jobId) {
      renderError('서버 응답에 jobId가 없습니다. 잠시 후 다시 시도해주세요.');
      setStartButtonReady();
      return;
    }

    startBtn.textContent = '분석 중...';
    startPolling(data.jobId);
  } catch (err) {
    console.error('[benchmark-analyzer.js] 분석 시작 오류:', err);
    renderError('서버에 연결할 수 없습니다. 네트워크를 확인하고 다시 시도해주세요.');
    setStartButtonReady();
  }
}

// === 폴링 (setInterval 6s — GET /api/benchmark?id=) ===
// 3-6: 세대(generation) 카운터 — 이전 폴링의 in-flight 콜백이 새 작업 결과를 덮어쓰지 못하도록
let __bmPollGeneration = 0;

function startPolling(jobId) {
  const startedAt = Date.now();
  const generation = ++__bmPollGeneration; // 새 폴링 세대 (이전 in-flight 콜백 무효화)

  window.__bmTimer = setInterval(async () => {
    // 15분 초과 → 클라이언트 폴링 중단 (서버 failed(timeout)과 정합)
    if (Date.now() - startedAt > BM_MAX_WAIT_MS) {
      clearBenchmarkPolling();
      renderError('처리 시간이 15분을 초과했습니다. 다시 시도해주세요.');
      setStartButtonReady();
      return;
    }

    // 세대가 바뀌었으면(새 작업 시작/정리) 이전 콜백 결과는 무시
    if (generation !== __bmPollGeneration) return;

    let data;
    try {
      const resp = await fetch(`/api/benchmark?id=${encodeURIComponent(jobId)}`);
      const parsed = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        // 파싱 가능한 오류 메시지면 즉시 종료 (예: API 키 미설정 500), 아니면 일시 오류로 간주하고 계속 폴링
        if (parsed.error) {
          clearBenchmarkPolling();
          renderError(parsed.error);
          setStartButtonReady();
        }
        return;
      }
      data = parsed;
    } catch (err) {
      // 네트워크 오류 — 일시 오류로 간주하고 다음 틱에서 재시도 (15분 상한이 안전망)
      console.warn('[benchmark-analyzer.js] 폴링 네트워크 오류:', err);
      return;
    }

    if (generation !== __bmPollGeneration) return;
    if (!data || !data.stage) return;

    renderStepper(data.stage);

    if (data.stage === 'done') {
      clearBenchmarkPolling();
      renderResult(data);
      if (typeof saveBenchmarkResults === 'function') saveBenchmarkResults(data);
      setStartButtonReady();
      return;
    }
    if (data.stage === 'failed') {
      clearBenchmarkPolling();
      renderError(data.error || '분석에 실패했습니다. 다시 시도해주세요.');
      setStartButtonReady();
      return;
    }

    // 진행 중 — 축적 데이터(릴스/전사) 점진 렌더
    renderAccumulated(data);
  }, BM_POLL_INTERVAL);
}

// === 진행 스테이퍼 렌더 (크롤링 → 전사 → 분석 → 완료) ===
function renderStepper(stage) {
  const progress = document.getElementById('bmProgress');
  if (!progress) return;

  const currentIdx = BM_STAGES.findIndex(s => s.key === stage);
  progress.classList.remove('benchmark-hidden');

  progress.innerHTML = BM_STAGES.map((s, idx) => {
    let cls = 'step';
    if (currentIdx !== -1 && idx === currentIdx) cls += ' active';
    else if (currentIdx !== -1 && idx < currentIdx) cls += ' complete';
    // failed/unknown → 전부 대기 상태 유지 (오류는 결과 영역에서 표시)
    return `<span class="${cls}">${s.label}</span>`;
  }).join('<span class="step-arrow">→</span>');

  // 단계별 한국어 상태 텍스트
  const status = document.getElementById('bmStatus');
  if (status) {
    if (stage === 'failed') {
      status.textContent = '';
      status.classList.add('benchmark-hidden');
    } else {
      status.textContent = BM_STAGE_STATUS[stage] || '';
      status.classList.toggle('benchmark-hidden', !status.textContent);
    }
  }
}

// === 진행 중 축적 렌더 (릴스/전사 도착 시 점진 표시) ===
function renderAccumulated(data) {
  const result = document.getElementById('bmResult');
  if (!result) return;

  const reels = Array.isArray(data.reels) ? data.reels : [];
  const transcripts = Array.isArray(data.transcripts) ? data.transcripts : [];

  let html = '';
  if (reels.length > 0) html += renderReelsSection(reels);
  if (transcripts.length > 0) html += renderTranscriptsSection(transcripts);
  result.innerHTML = html;
}

// === done — 최종 결과 렌더 ((a)릴스 (b)전사 (c)구조 (d)새 대본) ===
function renderResult(data) {
  const result = document.getElementById('bmResult');
  if (!result) return;

  const reels = Array.isArray(data.reels) ? data.reels : [];
  const transcripts = Array.isArray(data.transcripts) ? data.transcripts : [];
  const analysis = data.result || {};

  result.innerHTML = [
    renderReelsSection(reels),
    renderTranscriptsSection(transcripts),
    renderStructureSection(analysis),
    renderScriptSection(analysis)
  ].join('');

  bindBenchmarkCopyButtons(result, {
    structure: analysis.structure,
    script: analysis.script,
    transcripts
  });
}

// (a) 바이럴 릴스 리스트 카드 — 조회수/좋아요/릴스 링크
function renderReelsSection(reels) {
  if (!Array.isArray(reels) || reels.length === 0) return '';

  return `
    <div class="benchmark-result-card">
      <div class="benchmark-card-header">
        <h4>바이럴 릴스 (${reels.length}개)</h4>
      </div>
      ${reels.map(reel => `
        <div class="benchmark-reel-card">
          <div class="benchmark-reel-meta">
            <span class="benchmark-reel-views">조회수 ${bmFormatCount(reel.videoViewCount)}</span>
            ${reel.likesCount != null ? `<span class="benchmark-reel-likes">좋아요 ${bmFormatCount(reel.likesCount)}</span>` : ''}
            <span class="benchmark-reel-duration">${bmFormatSeconds(reel.videoDuration)}</span>
            <a class="benchmark-reel-link" href="${bmEscapeHtml(reel.url)}" target="_blank" rel="noopener noreferrer">릴스 링크 보기 ↗</a>
          </div>
          ${reel.caption ? `<div class="benchmark-reel-caption">${bmEscapeHtml(reel.caption)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// (b) 전사 대본 섹션 — 릴스별 [음성 인식 불가]/[용량 초과로 전사 제외] + 세그먼트 타임스탬프
function renderTranscriptsSection(transcripts) {
  if (!Array.isArray(transcripts) || transcripts.length === 0) return '';

  return `
    <div class="benchmark-result-card">
      <div class="benchmark-card-header">
        <h4>전사 대본 (${transcripts.length}개)</h4>
      </div>
      ${transcripts.map((t, idx) => {
        const statusBadge = t.status === 'unrecognizable'
          ? '<span class="benchmark-transcript-status">[음성 인식 불가]</span>'
          : t.status === 'size-exceeded'
            ? '<span class="benchmark-transcript-status">[용량 초과로 전사 제외]</span>'
            : '';
        const segments = Array.isArray(t.segments) && t.segments.length > 0
          ? `<div class="benchmark-segments">${t.segments.map(s =>
              `<div class="benchmark-segment"><span class="benchmark-segment-time">[${bmFormatSeconds(s.start)}~${bmFormatSeconds(s.end)}]</span>${bmEscapeHtml(s.text)}</div>`
            ).join('')}</div>`
          : '';
        return `
          <div class="benchmark-transcript-card">
            <div class="benchmark-transcript-header">
              <span class="benchmark-transcript-title">릴스 ${idx + 1} 전사 대본</span>
              <button type="button" class="benchmark-copy-btn" data-copy="transcript" data-index="${idx}">복사</button>
            </div>
            ${statusBadge}
            <div class="benchmark-transcript-text">${bmEscapeHtml(t.text)}</div>
            ${segments}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// (c) 구조 해부 카드 — 훅/전개/클로징
function renderStructureSection(analysis) {
  const structure = analysis.structure;
  if (!structure) return '';

  const blocks = [
    { key: 'hook', label: '훅 (0~3초 오프닝)' },
    { key: 'development', label: '전개 (문제→해결 전환)' },
    { key: 'closing', label: '클로징 (마무리/CTA)' }
  ];

  return `
    <div class="benchmark-result-card">
      <div class="benchmark-card-header">
        <h4>공통 구조 해부</h4>
        <button type="button" class="benchmark-copy-btn" data-copy="structure">복사</button>
      </div>
      ${blocks.map(b => `
        <div class="benchmark-structure-label">${b.label}</div>
        <div class="benchmark-structure-text">${bmEscapeHtml(structure[b.key] || '')}</div>
      `).join('')}
    </div>
  `;
}

// (d) 새 대본 초안 — 타임라인 + 대사 + 카피 버튼
function renderScriptSection(analysis) {
  const script = analysis.script;
  if (!script) return '';

  const timeline = Array.isArray(script.timeline) ? script.timeline : [];

  return `
    <div class="benchmark-result-card">
      <div class="benchmark-card-header">
        <h4>새 대본 초안</h4>
        <button type="button" class="benchmark-copy-btn" data-copy="script">복사</button>
      </div>
      ${script.duration ? `<div class="benchmark-script-duration">권장 길이: ${bmEscapeHtml(script.duration)}</div>` : ''}
      ${timeline.length === 0
        ? '<div class="benchmark-empty-note">타임라인이 없습니다. (구조 분석 결과만 출력됨)</div>'
        : timeline.map(item => `
          <div class="benchmark-script-row">
            <span class="benchmark-script-time">[${bmEscapeHtml(item.time || '')}]</span>
            <span class="benchmark-script-type">${bmEscapeHtml(item.type || '')}</span>
            <span class="benchmark-script-dialogue">${bmEscapeHtml(item.dialogue || '')}</span>
            <span class="benchmark-script-direction">${bmEscapeHtml(item.direction || '')}</span>
          </div>
        `).join('')}
    </div>
  `;
}

// === 카피 버튼 바인딩 (navigator.clipboard, video-ui.js 패턴) ===
function bindBenchmarkCopyButtons(container, payload) {
  container.querySelectorAll('.benchmark-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = buildCopyText(btn, payload);
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '복사됨!';
        setTimeout(() => { btn.textContent = '복사'; }, 2000);
      } catch (err) {
        console.error('클립보드 복사 실패', err);
        btn.textContent = '복사 실패';
        setTimeout(() => { btn.textContent = '복사'; }, 2000);
      }
    });
  });
}

function buildCopyText(btn, payload) {
  const kind = btn.dataset.copy;

  if (kind === 'structure') {
    const s = payload.structure || {};
    return `[훅]\n${s.hook || ''}\n\n[전개]\n${s.development || ''}\n\n[클로징]\n${s.closing || ''}`;
  }

  if (kind === 'script') {
    const script = payload.script || {};
    const lines = (Array.isArray(script.timeline) ? script.timeline : [])
      .map(item => `[${item.time || ''}] ${item.type || ''}\n대사: ${item.dialogue || ''}\n연출: ${item.direction || ''}`)
      .join('\n\n');
    return (script.duration ? `권장 길이: ${script.duration}\n\n` : '') + lines;
  }

  if (kind === 'transcript') {
    const t = (payload.transcripts || [])[parseInt(btn.dataset.index, 10)];
    if (!t) return '';
    const segments = (Array.isArray(t.segments) && t.segments.length > 0)
      ? '\n\n' + t.segments.map(s => `[${bmFormatSeconds(s.start)}~${bmFormatSeconds(s.end)}] ${s.text}`).join('\n')
      : '';
    return t.text + segments;
  }

  return '';
}

// === 오류 렌더 (한국어 메시지 + 다시 시도) ===
function renderError(message) {
  const status = document.getElementById('bmStatus');
  if (status) {
    status.textContent = '';
    status.classList.add('benchmark-hidden');
  }

  const result = document.getElementById('bmResult');
  if (!result) return;

  result.innerHTML = `
    <div class="benchmark-error">
      <p>⚠️ ${bmEscapeHtml(message || '알 수 없는 오류가 발생했습니다.')}</p>
      <button type="button" class="benchmark-retry-btn">다시 시도</button>
    </div>
  `;

  // 다시 시도 = 현재 입력값으로 새 분석 시작 (resetBenchmarkOutput이 오류 영역부터 정리)
  result.querySelector('.benchmark-retry-btn').addEventListener('click', () => {
    startBenchmark();
  });
}

// === 상태/출력 정리 ===
function resetBenchmarkOutput() {
  const progress = document.getElementById('bmProgress');
  const status = document.getElementById('bmStatus');
  const result = document.getElementById('bmResult');
  if (progress) { progress.innerHTML = ''; progress.classList.add('benchmark-hidden'); }
  if (status) { status.textContent = ''; status.classList.add('benchmark-hidden'); }
  if (result) result.innerHTML = '';
}

function setStartButtonReady() {
  const startBtn = document.getElementById('bmStartBtn');
  if (!startBtn) return;
  startBtn.disabled = false;
  startBtn.textContent = '분석 시작';
}

// === 폴링 정리 (탭 이탈/세션 종료/완료/실패/타임아웃 시) ===
function clearBenchmarkPolling() {
  if (window.__bmTimer) {
    clearInterval(window.__bmTimer);
    window.__bmTimer = null;
  }
}
