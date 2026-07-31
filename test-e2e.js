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
    
    try {
      await this.testManualMode();
      await this.testAutoMode();
      console.log('=== E2E 테스트 완료 ===');
    } catch (error) {
      console.error('테스트 실패:', error);
    }
  }
};

// 테스트 실행: E2E_TEST.runAll()
