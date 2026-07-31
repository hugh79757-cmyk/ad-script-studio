# PLAN — Wave 2: 통합 E2E 테스트 + 배포

> Phase: 6
> Wave: 2
> Requirements: R21, R22
> Dependencies: Wave 1 완료 후

---

## Goal

전체 플로우 통합 테스트 및 Vercel 배포

---

## Tasks

### Task 1: 통합 E2E 테스트 시나리오

**Description:** 전체 플로우 테스트 스크립트

**Implementation:**
```javascript
// test-e2e.js — 브라우저 콘솔에서 실행하는 테스트

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
```

**Acceptance Criteria:**
- [ ] `test-e2e.js` 파일 존재
- [ ] 수동 모드 테스트 시나리오 존재
- [ ] 자동 모드 테스트 시나리오 존재
- [ ] 탭 전환 테스트 존재

---

### Task 2: Vercel 배포 스크립트

**Description:** 배포 자동화 스크립트

**Implementation:**
```json
// package.json에 추가
{
  "scripts": {
    "dev": "vercel dev",
    "build": "echo 'Static site - no build needed'",
    "deploy": "vercel --prod",
    "deploy:preview": "vercel",
    "test:e2e": "open index.html && echo 'Run E2E_TEST.runAll() in browser console'"
  },
  "devDependencies": {
    "vercel": "^latest"
  }
}
```

**Implementation:**
```bash
#!/bin/bash
# deploy.sh — Vercel 배포 스크립트

echo "=== Vercel 배포 시작 ==="

# 1. 로컬 빌드 테스트
echo "1. 로컬 환경 확인..."
if [ ! -f "index.html" ]; then
  echo "✗ index.html 파일 없음"
  exit 1
fi

if [ ! -f "vercel.json" ]; then
  echo "✗ vercel.json 파일 없음"
  exit 1
fi

# 2. API 키 확인
echo "2. 환경변수 확인..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠ ANTHROPIC_API_KEY가 설정되지 않았습니다."
  echo "  Vercel 대시보드에서 설정해주세요."
fi

# 3. 배포 실행
echo "3. Vercel 배포 실행..."
vercel --prod

echo "=== 배포 완료 ==="
echo "배포 URL을 확인해주세요."
```

**Acceptance Criteria:**
- [ ] `package.json`에 배포 스크립트 존재
- [ ] `deploy.sh` 스크립트 존재
- [ ] 환경변수 확인 로직 존재

---

### Task 3: 환경변수 설정 가이드

**Description:** Vercel 환경변수 설정 문서

**Implementation:**
```markdown
# 환경변수 설정 가이드

## 필수 환경변수

| 변수명 | 설명 | 설정 위치 |
|--------|------|-----------|
| ANTHROPIC_API_KEY | Claude API 키 | Vercel 대시보드 → Settings → Environment Variables |

## 설정 방법

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. "ANTHROPIC_API_KEY" 추가
5. 값에 Claude API 키 입력
6. Production, Preview, Development 모두 선택
7. Save

## 확인 방법

```bash
# 로컬 개발 시
vercel env pull .env.local

# 배포 후 확인
curl https://your-app.vercel.app/api/generate -X POST -H "Content-Type: application/json" -d '{}'
```

## 문제 해결

### API 키 오류
- 환경변수가 제대로 설정되었는지 확인
- Vercel 대시보드에서 Environment Variables 탭 확인
-重新 배포 후 재시도

### 빌드 실패
- `vercel.json` 설정 확인
- 파일 경로 확인
- 로컬에서 `vercel dev`로 테스트
```

**Acceptance Criteria:**
- [ ] 환경변수 설정 가이드 문서 존재
- [ ] 설정 방법 명시
- [ ] 문제 해결 가이드 포함

---

## Dependencies

Wave 1 완료 후

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `test-e2e.js` | CREATE |
| `package.json` | CREATE/MODIFY |
| `deploy.sh` | CREATE |
| `ENVIRONMENT-GUIDE.md` | CREATE |

---

## Verification

- 브라우저 콘솔에서 `E2E_TEST.runAll()` 실행 → 모든 테스트 통과 확인
- `vercel dev`로 로컬 실행 → API 호출 동작 확인
- `vercel --prod` 배포 → 프로덕션 URL 접근 확인
