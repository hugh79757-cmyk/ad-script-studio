# PLAN — Wave 2: Frontend — 벤치마킹 탭 (UI + 폴링 + 렌더링)

> Phase: 7
> Wave: 2
> Plan: `02-frontend-tab.PLAN.md`
> Requirements: R28, R35
> Dependencies: Wave 1 (`api/benchmark.js`) 완료 후

---

## Goal

"벤치마킹 분석기" 탭을 기존 2개 탭(proposal/video)과 함께 추가하고, IG 계정 입력 → job 생성 → 진행 스테이지 폴링 → (a)~(d) 4종 결과 렌더링 + 카피 버튼이 동작하도록 한다.
기존 탭 파일은 **최소 수정**(탭 버튼 1개 + 컨테이너 + script 1줄 + state-manager 슬롯)만 하고, 모든 신규 로직은 `benchmark-analyzer.js` 한 파일에 응집한다 (RESEARCH §4-3: 기존 프론트엔드에 폴링 코드 없음 — 신규 모듈 추가).

---

## 실행 모델 (프론트 관점)

- POST `/api/benchmark` → `jobId` 수신 (즉시 응답, 파이프라인은 서버에서 실행 안 됨)
- **클라이언트가 setInterval(5~8초)로 GET `/api/benchmark?id=`를 반복 호출해야 파이프라인이 진행됨** — 폴링 중단 시 파이프라인 일시 정지
- stage가 `done`이 될 때까지 폴링, 15분 초과 시 클라이언트도 중단
- 서버는 GET 1회당 최대 2개 릴스 전사 등 단위 작업만 수행 — 프론트는 단순 폴링+렌더링

---

## Tasks

### Task 1: `index.html` + `state-manager.js` — 탭 구조 최소 확장

**Description:** 기존 2개 탭 버튼/컨테이너는 무수정. 벤치마킹 탭 버튼 1개 + 컨테이너 + script 태그 1줄 + state-manager 슬롯만 추가.

**Implementation:**
```html
<!-- index.html — 기존 .tool-tabs 안에 버튼 1개 추가 (기존 2개 버튼 무수정) -->
<div class="tool-tabs">
  <button class="tool-tab active" data-tab="proposal">전략 제안서 생성기</button>
  <button class="tool-tab" data-tab="video">영상 소스 생성기</button>
  <button class="tool-tab" data-tab="benchmark">벤치마킹 분석기</button>  <!-- 신규 -->
</div>

<!-- .tool-contents 안에 컨테이너 1개 추가 -->
<div id="benchmark-tool" class="tool-content">
  <div id="benchmarkAnalyzerUI"></div>
</div>

<!-- script 태그 1줄 (app.js 앞에 로드, 기존 로드 순서 유지) -->
<script src="benchmark-analyzer.js"></script>
```

```javascript
// state-manager.js — 순수 추가 (기존 함수 무수정)
const tabState = {
  activeTab: 'proposal',
  proposalResults: null,
  videoResults: null,
  benchmarkResults: null            // 신규: 벤치마킹 결과 슬롯 (연동 포인트 개방)
};

// 신규: 벤치마킹 결과 저장 (saveProposalResults 패턴 미러링)
function saveBenchmarkResults(results) {
  tabState.benchmarkResults = results;
  sessionStorage.setItem('benchmarkResults', JSON.stringify(results));
}
```

**Acceptance Criteria:**
- [ ] 탭 바에 3개 버튼 표시, `data-tab="benchmark"` 클릭 시 `#benchmark-tool` 표시
- [ ] 기존 proposal/video 탭 전환 무손상 (회귀 확인)
- [ ] `saveBenchmarkResults()` 존재 — 향후 Phase 3 연동 포인트용 슬롯

---

### Task 2: `benchmark-analyzer.js` — UI + 폴링 + 렌더링 (신규, 한 파일 응집)

**Description:** 탭 lazy 초기화 → 입력 폼 → job 생성 → 진행 스테이퍼 → 폴링 → 4종 결과 렌더링 + 카피 버튼. 기존 `app.js`의 `initToolTabs`/`switchTab`는 수정 금지 → 이벤트 위임(delegation)으로 벤치마킹 탭 최초 클릭 시 UI 렌더.

**Implementation:**
```javascript
// benchmark-analyzer.js — (계획 스케치)

// 탭 클릭 위임 감지 (app.js 수정 없이 lazy 초기화)
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-tab="benchmark"]') && !window.__benchmarkInit) {
    window.__benchmarkInit = true;
    renderBenchmarkUI();
  }
});

function renderBenchmarkUI() {
  const root = document.getElementById('benchmarkAnalyzerUI');
  root.innerHTML = `
    <div class="benchmark-input-section">
      <h3>벤치마킹 분석기</h3>
      <label>IG 계정 URL 또는 아이디 <span class="required">*</span></label>
      <input id="bmInstagramId" placeholder="예: @brand.account 또는 instagram.com/brand.account">
      <label>브랜드명 (선택)</label>
      <input id="bmBrandName" placeholder="새 대본에 적용할 브랜드명">
      <label>새 키워드 (선택)</label>
      <input id="bmKeyword" placeholder="새 대본에 반영할 키워드/컨셉">
      <label>분석할 릴스 수 (기본 5, 서버가 다시 클램프)</label>
      <select id="bmMaxReels">
        <option value="3">3개</option>
        <option value="5" selected>5개</option>
      </select>
      <button id="bmStartBtn">분석 시작</button>
    </div>
    <div id="bmProgress" class="benchmark-progress hidden">
      <!-- 스테이퍼: 크롤링 → 전사 → 분석 → 완료 -->
    </div>
    <div id="bmResult" class="benchmark-result"></div>`;
  document.getElementById('bmStartBtn').addEventListener('click', startBenchmark);
}

async function startBenchmark() {
  const instagramId = document.getElementById('bmInstagramId').value.trim();
  if (!instagramId) { alert('IG 계정을 입력하세요.'); return; }
  const resp = await fetch('/api/benchmark', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instagramId,
      brandName: document.getElementById('bmBrandName').value.trim(),
      keyword: document.getElementById('bmKeyword').value.trim(),
      maxReels: parseInt(document.getElementById('bmMaxReels').value)
    })
  });
  const data = await resp.json();
  if (!resp.ok) { renderError(data.error); return; }
  startPolling(data.jobId); // setInterval 5~8초 GET 폴링
}

function startPolling(jobId) {
  const POLL_INTERVAL = 6000, MAX_MS = 15 * 60 * 1000;
  const started = Date.now();
  window.__bmTimer = setInterval(async () => {
    if (Date.now() - started > MAX_MS) { clearInterval(window.__bmTimer); renderError('처리 시간이 15분을 초과했습니다.'); return; }
    const resp = await fetch(`/api/benchmark?id=${jobId}`);
    const data = await resp.json();
    if (data.stage) renderStepper(data.stage);   // 진행 스테이지 표시
    if (data.stage === 'done')  { clearInterval(window.__bmTimer); renderResult(data); saveBenchmarkResults(data); }
    if (data.stage === 'failed'){ clearInterval(window.__bmTimer); renderError(data.error || '분석에 실패했습니다.'); }
  }, POLL_INTERVAL);
}
```

렌더링 함수들은 결과 데이터(`reels[]`, `transcripts[]`, `result.structure`, `result.script`)를 카드로 표시:
- (a) 바이럴 릴스 리스트 카드 — 조회수/좋아요/릴스 링크
- (b) 전사 대본 섹션 — 릴스별 `[음성 인식 불가]`/`[용량 초과로 전사 제외]` 포함
- (c) 구조 해부 카드 — `hook` / `development` / `closing`
- (d) 새 대본 초안 — 타임라인 + 대사, 카피 버튼 (`navigator.clipboard`, video-ui.js 패턴)

**Acceptance Criteria:**
- [ ] 벤치마킹 탭 최초 클릭 시 UI 렌더 (기존 탭 로직과 충돌 없음, 콘솔 에러 없음)
- [ ] IG 미입력 시 경고, 입력 → 분석 시작 → POST → 진행 스테이퍼 표시
- [ ] done 시 (a)~(d) 4종 결과 렌더링, 각 섹션 카피 버튼 동작
- [ ] 폴링 중 탭 전환 → `clearInterval` (중복 폴링/콘솔 에러 없음)
- [ ] failed/15분 초과 → 한국어 오류 + "다시 시도" 버튼

---

### Task 3: `style.css` — 벤치마킹 탭 스타일 (추가만)

**Description:** `.benchmark-*` 클래스 신규 추가. 기존 CSS 규칙 무수정, 기존 다크테마 변수(`--text-primary` 등) 재사용.

**Implementation:**
```css
/* style.css 끝에 추가 (기존 규칙 수정 금지) */
.benchmark-input-section { display: flex; flex-direction: column; gap: 12px; }
.benchmark-progress { display: flex; gap: 8px; margin: 16px 0; }
.benchmark-progress .step { padding: 4px 12px; border-radius: 12px; opacity: .4; }
.benchmark-progress .step.active { opacity: 1; color: var(--text-primary); }
.benchmark-progress .step.complete { opacity: 1; color: var(--accent, #4caf50); }
.benchmark-result .result-card { border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 12px 0; }
.benchmark-result .copy-btn { margin-left: 8px; }
```

**Acceptance Criteria:**
- [ ] `.benchmark-*` 스타일 적용 (입력 섹션/스테이퍼/결과 카드/카피 버튼)
- [ ] 기존 proposal/video 탭 스타일 무변경 (회귀 확인)

---

## Dependencies

Wave 1 (`api/benchmark.js`) 완료 후. 실 브라우저 E2E는 사용자 키 체크포인트 후.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `benchmark-analyzer.js` | CREATE (신규 — UI+폴링+렌더링 응집) |
| `index.html` | MODIFY (최소 — 탭 버튼 1개 + 컨테이너 + script 1줄) |
| `state-manager.js` | MODIFY (최소 — benchmarkResults 슬롯 + saveBenchmarkResults 추가) |
| `style.css` | MODIFY (추가만 — .benchmark-* 클래스) |

---

## Verification

- 브라우저: 3개 탭 표시/전환, 기존 proposal/video 탭 회귀 확인
- 입력 → 분석 시작 → 스테이퍼 진행 → done 시 4종 결과((a)~(d)) 렌더링
- 카피 버튼 클립보드 복사, 폴링 중 탭 전환 시 clearInterval/콘솔 에러 없음
- 실패 시나리오(비공개/0건/15분 초과) → 한국어 오류 메시지
- gsd-ui-checker: 탭 전환, 진행 스테이퍼, 결과 카드 레이아웃, 카피 버튼 동작
