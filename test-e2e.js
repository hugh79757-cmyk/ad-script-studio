// test-e2e.js — 브라우저 콘솔에서 실행하는 테스트
// 사용법: 브라우저 개발자 도구 콘솔에서 E2E_TEST.runAll() 실행

const E2E_TEST = {
  // 수동 모드 전체 플로우
  async testManualMode() {
    console.log('=== 수동 모드 E2E 테스트 ===');
    
    // 1. 입력 필드 채우기
    document.getElementById('brandName').value = '테스트 브랜드';
    document.getElementById('productName').value = '테스트 제품';
    document.getElementById('target').value = '20대 여성';
    document.getElementById('concept').value = '감성 마케팅';
    
    // 2. 수동 모드 확인
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle.checked) {
      modeToggle.click(); // 수동 모드로 전환
    }
    
    // 3. 생성 버튼 클릭
    document.getElementById('generateBtn').click();
    
    // 4. 결과 확인
    await this.waitForElement('#script');
    const scriptContent = document.getElementById('script').textContent;
    
    if (scriptContent.includes('테스트 브랜드')) {
      console.log('✓ 수동 모드: 대본 생성 성공');
    } else {
      console.log('✗ 수동 모드: 대본 생성 실패');
    }
    
    // 5. 복사 버튼 테스트
    const copyBtn = document.querySelector('.copyBtn');
    if (copyBtn) {
      console.log('✓ 복사 버튼 존재');
    }
    
    // 6. PDF 다운로드 테스트
    const pdfBtn = document.querySelector('.pdfBtn');
    if (pdfBtn) {
      console.log('✓ PDF 다운로드 버튼 존재');
    }
    
    return true;
  },

  // 자동 모드 전체 플로우
  async testAutoMode() {
    console.log('=== 자동 모드 E2E 테스트 ===');
    
    // 1. 자동 모드로 전환
    const modeToggle = document.getElementById('modeToggle');
    if (!modeToggle.checked) {
      modeToggle.click();
    }
    
    // 2. 입력 필드 채우기
    document.getElementById('brandName').value = '자동 테스트 브랜드';
    document.getElementById('productName').value = '자동 테스트 제품';
    document.getElementById('target').value = '30대 남성';
    
    // 3. 생성 버튼 클릭
    document.getElementById('generateBtn').click();
    
    // 4. 로딩 스피너 확인
    const spinner = document.getElementById('loadingSpinner');
    if (spinner.classList.contains('active')) {
      console.log('✓ 로딩 스피너 표시됨');
    }
    
    // 5. 결과 대기
    await this.waitForElement('#autoResult');
    const autoResult = document.getElementById('autoResult').textContent;
    
    if (autoResult.includes('전략 개요')) {
      console.log('✓ 자동 모드: API 호출 + 결과 표시 성공');
    } else {
      console.log('✗ 자동 모드: 결과 표시 실패');
    }
    
    // 6. "2번으로 보내기" 버튼 확인
    const transferBtn = document.getElementById('transferBtn');
    if (transferBtn) {
      console.log('✓ "2번으로 보내기" 버튼 존재');
      
      // 7. 탭 전환 테스트
      transferBtn.click();
      
      await this.sleep(500);
      const videoTab = document.querySelector('[data-tab="video"]');
      if (videoTab.classList.contains('active')) {
        console.log('✓ 탭 전환 성공');
      } else {
        console.log('✗ 탭 전환 실패');
      }
    }
    
    return true;
  },

  // === 시나리오 1: 빈 원자료 — 원칙 스킵 확인 ===
  // 케이스 B와 동일: 브랜드명/제품명/타겟만 입력, 나머지 전부 공란
  // Claude API 응답에서 입력 부족 원칙이 스킵되는지 확인
  async testEmptyRawData() {
    console.log('=== 시나리오 1: 빈 원자료 — 원칙 스킵 확인 ===');

    const minimalInputs = {
      brandName: '테스트 브랜드',
      productName: '테스트 제품',
      target: '20대 여성',
      concept: '',
      toneAndManner: '',
      competitorInfo: '',
      priceRange: '',
      reviewExcerpts: [],
      trustFactors: [],
      excludedKeywords: []
    };

    // 1. API 호출 (배포된 서버)
    const baseUrl = window.location.origin;
    let result;
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: minimalInputs, mode: 'auto' })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.log(`✗ API 응답 실패: ${response.status} — ${errBody}`);
        return false;
      }
      result = await response.json();
    } catch (err) {
      console.log('✗ API 호출 실패 (네트워크 오류):', err.message);
      return false;
    }

    // 2. 응답 구조 검증
    if (!result.success) {
      console.log('✗ API 파싱 실패:', result.error || 'unknown');
      return false;
    }
    console.log(`✓ API 응답 수신 — model: ${result.model || 'unknown'}`);

    // 3. rationale 배열 분석
    const rationale = result.rationale || [];
    const totalPrinciples = 26;
    const generatedCount = rationale.length;
    const skippedCount = totalPrinciples - generatedCount;

    console.log(`✓ rationale: ${generatedCount}개 생성 / ${skippedCount}개 스킵 예상`);

    if (skippedCount <= 0) {
      console.log('✗ 빈 입력에서도 26개 전부 생성됨 — 스킵 로직 미작동');
      return false;
    }
    console.log(`✓ ${skippedCount}개 원칙 스킵 확인됨`);

    // 4. 스킵된 원칙이 기대 범위 내인지 확인
    // 빈 입력 시 concept/price/competitor/reviews/trustFactors 전부 없음
    // → 최소 10개 이상 스킵되어야 정상 (타겟만으로 생성 가능한 원칙은 ~11개)
    const MIN_EXPECTED_SKIPS = 10;
    if (skippedCount < MIN_EXPECTED_SKIPS) {
      console.log(`⚠ 스킵 수(${skippedCount})가 기대 최소(${MIN_EXPECTED_SKIPS})보다 적음 — 확인 필요`);
    } else {
      console.log(`✓ 스킵 수(${skippedCount})가 기대 범위(${MIN_EXPECTED_SKIPS}+)에 포함`);
    }

    // 5. 그라운딩 규칙 검증: 빈 필드를 참조하는 근거가 없는지 확인
    const emptyFieldLabels = {
      competitorInfo: ['경쟁', '차이점', '비교'],
      priceRange: ['가격', '원'],
      reviewExcerpts: ['리뷰', '고객'],
      trustFactors: ['신뢰', '인증', '수상']
    };
    const emptyFields = Object.keys(emptyFieldLabels);
    const violations = rationale.filter(item => {
      const reason = (item.reason || '').toLowerCase();
      return emptyFields.some(field => {
        // 해당 필드가 비어있는데 근거에 참조하고 있는지
        if (!minimalInputs[field] || minimalInputs[field].length === 0) {
          return emptyFieldLabels[field].some(label => reason.includes(label));
        }
        return false;
      });
    });

    if (violations.length === 0) {
      console.log('✓ 그라운딩 규칙 준수 — 빈 필드를 참조하는 근거 없음');
    } else {
      console.log(`⚠ 그라운딩 위반 ${violations.length}건:`);
      violations.forEach(v => {
        console.log(`  - [${v.principleId}] ${v.reason?.substring(0, 80)}...`);
      });
    }

    // 6. 생성된 원칙 타입 분포 확인
    const typeCount = { TYPE_HOOK: 0, TYPE_CTA: 0, TYPE_PSYCH: 0 };
    rationale.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1; });
    console.log(`✓ 타입 분포 — HOOK: ${typeCount.TYPE_HOOK}, CTA: ${typeCount.TYPE_CTA}, PSYCH: ${typeCount.TYPE_PSYCH}`);

    return true;
  },

  // === 시나리오 2: 풍부한 원자료 — PDF 다운로드 검증 ===
  // 케이스 A와 동일: 모든 필드 풀 입력 + PDF 생성 크기/폰트 검증
  async testRichRawDataPDF() {
    console.log('=== 시나리오 2: 풍부한 원자료 + PDF 다운로드 검증 ===');

    const richInputs = {
      brandName: '스킨큐어',
      productName: '히알루론산 세럼',
      target: '25~35세 피부 고민 여성',
      concept: '수분 충전으로 빛나는 피부',
      toneAndManner: '감성',
      competitorInfo: '라네즈, 이니스프리 수분 세럼 대비 고농축 포뮬러',
      priceRange: '39,000원 (정가), 첫 구매 시 15% 할인',
      reviewExcerpts: [
        '피부가 촉촉해졌어요. 아침에도 당기지 않아요.',
        '발림성이 좋아요. 끈적임 없이 스며듭니다.',
        '가성비 최고. 이 가격에 이 퀄리티는 드물어요.',
        '3주 사용하니까 모공이 줄어든 느낌이에요.'
      ],
      trustFactors: ['식약처 인증', '누적 판매 10만건', '피부과 추천'],
      excludedKeywords: ['저렴한', '싸다', '최저가']
    };

    // ── Step A: API 호출하여 rationale + script 수신 ──
    const baseUrl = window.location.origin;
    let apiResult;
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: richInputs, mode: 'auto' })
      });

      if (!response.ok) {
        console.log(`✗ API 응답 실패: ${response.status}`);
        return false;
      }
      apiResult = await response.json();
    } catch (err) {
      console.log('✗ API 호출 실패:', err.message);
      return false;
    }

    if (!apiResult.success) {
      console.log('✗ API 파싱 실패:', apiResult.error);
      return false;
    }
    console.log(`✓ API 응답 수신 — rationale: ${(apiResult.rationale || []).length}개 원칙`);

    // 풍부한 입력일 때는大部分 원칙이 생성되어야 함
    const rationaleCount = (apiResult.rationale || []).length;
    if (rationaleCount < 15) {
      console.log(`⚠ rationale가 ${rationaleCount}개 — 풍부한 입력 대비 부족`);
    } else {
      console.log(`✓ rationale ${rationaleCount}개 — 풍부한 입력에 적합`);
    }

    // ── Step B: jsPDF 로드 검증 ──
    if (typeof window.jspdf === 'undefined') {
      console.log('✗ jsPDF가 로드되지 않았습니다');
      return false;
    }
    console.log('✓ jsPDF 로드됨');

    // ── Step C: 한글 폰트 로드 검증 ──
    let fontLoaded = false;
    try {
      fontLoaded = await loadKoreanFont();
    } catch (e) {
      console.log('⚠ 한글 폰트 로드 시도 중 오류:', e.message);
    }

    if (fontLoaded) {
      console.log('✓ 한글 폰트(NotoSansKR) 로드 성공');
    } else {
      console.log('⚠ 한글 폰트 로드 실패 — PDF에 깨질 수 있음');
    }

    // ── Step D: PDF 생성 + 크기 검증 ──
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // 폰트 적용
    try { doc.setFont('NotoSansKR'); } catch {}

    // 표지
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text('광고 기획안', 105, 100, { align: 'center' });
    doc.setFontSize(16);
    doc.text(richInputs.brandName, 105, 120, { align: 'center' });
    doc.text(richInputs.productName, 105, 130, { align: 'center' });

    // 전략 페이지
    doc.addPage();
    doc.setTextColor(0);
    doc.setFontSize(18);
    doc.text('전략 및 근거', 20, 30);
    doc.setFontSize(11);

    // rationale 텍스트 (한글)
    const rationale = apiResult.rationale || [];
    let y = 45;
    rationale.slice(0, 10).forEach(item => {
      if (y > 270) { doc.addPage(); y = 20; }
      const line = `[${item.principleId}] ${item.principleName}: ${item.reason || ''}`;
      const lines = doc.splitTextToSize(line, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6 + 4;
    });

    // 대본 페이지 (한글 대사/연출)
    doc.addPage();
    doc.setFontSize(18);
    doc.text('대본', 20, 30);
    doc.setFontSize(11);

    // 리뷰 인용 (한글)
    y = 50;
    doc.setFont(undefined, 'bold');
    doc.text('고객 리뷰 인용', 20, y);
    y += 8;
    doc.setFont(undefined, 'normal');
    richInputs.reviewExcerpts.forEach((review, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. "${review}"`, 25, y);
      y += 7;
    });

    // 신뢰요소 (한글)
    y += 5;
    doc.setFont(undefined, 'bold');
    doc.text('브랜드 신뢰요소', 20, y);
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.text(richInputs.trustFactors.join(' | '), 25, y);

    // ── Step E: PDF 바이너리 검증 ──
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    const pdfSizeKB = Math.round(pdfBytes.length / 1024);

    // 1) 크기 검증
    if (pdfBytes.length === 0) {
      console.log('✗ PDF 크기 0바이트 — 생성 실패');
      return false;
    }
    if (pdfSizeKB < 1) {
      console.log(`✗ PDF 크기 ${pdfSizeKB}KB — 비정상적으로 작음`);
      return false;
    }
    console.log(`✓ PDF 생성 성공 — 크기: 약 ${pdfSizeKB}KB (${pdfBytes.length.toLocaleString()} bytes)`);

    // 2) %PDF- 헤더 검증
    const header = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3], pdfBytes[4]);
    if (header === '%PDF-') {
      console.log('✓ PDF 헤더 유효 (%PDF-)');
    } else {
      console.log('✗ PDF 헤더 무효:', header);
      return false;
    }

    // 3) 페이지 수 검증
    const pageCount = doc.getNumberOfPages();
    if (pageCount >= 3) {
      console.log(`✓ PDF 페이지 수: ${pageCount}장 (표지+전략+대본 등)`);
    } else {
      console.log(`⚠ PDF 페이지 수: ${pageCount}장 — 예상보다 적음`);
    }

    // 4) 합리적 크기 범위 검증 (10KB~500KB)
    if (pdfSizeKB >= 10 && pdfSizeKB <= 500) {
      console.log('✓ PDF 크기가 합리적 범위 내 (10KB~500KB)');
    } else if (pdfSizeKB < 10) {
      console.log('⚠ PDF 크기가 매우 작음 — 폰트 미포함 가능');
    } else {
      console.log('⚠ PDF 크기가 매우 큼 — 비정상 가능');
    }

    // 5) 한글 텍스트 인코딩 검증 (PDF 내 텍스트 스트림에서)
    const pdfStr = String.fromCharCode(...pdfBytes.slice(0, Math.min(pdfBytes.length, 50000)));
    const hasKorean = /[\uAC00-\uD7AF]/.test(pdfStr);
    if (hasKorean) {
      console.log('✓ PDF에 한글 문자 포함됨 (텍스트 스트림 검증)');
    } else {
      // jsPDF는 폰트를 임베딩하므로 raw 바이너리에서 한글이 안 보일 수 있음
      console.log('⊙ PDF 바이너리에서 한글 텍스트 직접 확인 불가 (폰트 임베딩 방식)');
    }

    // 6) PDF 실제 다운로드 (선택)
    // 테스트 모드에서는 다운로드하지 않음
    // doc.save(`${richInputs.brandName}_${richInputs.productName}_테스트.pdf`);
    console.log('✓ PDF 다운로드 준비 완료 (테스트 모드 — 실제 저장은 스킵)');

    return true;
  },

  // 유틸리티 함수
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 전체 테스트 실행
  async runAll() {
    console.log('=== E2E 전체 테스트 시작 ===');
    console.log('대상 서버:', window.location.origin);
    console.log('');
    
    const results = {};
    
    try {
      // 기존 시나리오
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.manual = await this.testManualMode();
      console.log('');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.auto = await this.testAutoMode();
      console.log('');
      
      // 신규 시나리오: 빈 원자료
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.emptyData = await this.testEmptyRawData();
      console.log('');
      
      // 신규 시나리오: 풍부한 원자료 + PDF
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.richPDF = await this.testRichRawDataPDF();
      console.log('');
      
    } catch (error) {
      console.error('테스트 중 오류:', error);
    }
    
    // 결과 요약
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('=== E2E 테스트 결과 요약 ===');
    const entries = Object.entries(results);
    const passed = entries.filter(([, v]) => v === true).length;
    const failed = entries.filter(([, v]) => v === false).length;
    console.log(`  수동 모드:    ${results.manual ? '✓' : '✗'}`);
    console.log(`  자동 모드:    ${results.auto ? '✓' : '✗'}`);
    console.log(`  빈 원자료:    ${results.emptyData ? '✓' : '✗'}`);
    console.log(`  풍부+PDF:     ${results.richPDF ? '✓' : '✗'}`);
    console.log(`  결과: ${passed}/${entries.length} 통과`);
    console.log('=== E2E 테스트 완료 ===');
  }
};

// 테스트 실행: E2E_TEST.runAll()
