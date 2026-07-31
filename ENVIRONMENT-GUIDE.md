# 환경변수 설정 가이드

## 필수 환경변수

| 변수명 | 설명 | 설정 위치 | 필수 여부 |
|--------|------|-----------|-----------|
| ANTHROPIC_API_KEY | Claude API 키 (자동 모드) | Vercel 대시보드 → Settings → Environment Variables | 자동 모드 사용 시 필수 |
| TAVILY_API_KEY | Tavily Search API 키 (자동 조사) | Vercel 대시보드 → Settings → Environment Variables | 자동 조사 기능 사용 시 필수 |

## 설정 방법

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 변수 추가:
   - `ANTHROPIC_API_KEY`: Claude API 키
   - `TAVILY_API_KEY`: Tavily Search API 키
5. Production, Preview, Development 모두 선택
6. Save

## TAVILY_API_KEY 발급 방법

1. https://tavily.com 접속
2. 회원가입 후 로그인
3. Dashboard → API Keys 메뉴
4. "Create API Key" 클릭
5. 발급받은 키 복사

### Tavily 무료 플랜
- 월 1,000회 검색 무료
- 초당 1회 제한
- 자동 조사 1회 = 4번의 검색 사용

## 확인 방법

```bash
# 로컬 개발 시
vercel env pull .env.local

# 자동 조사 API 테스트
curl https://your-app.vercel.app/api/research \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"brandName": "삼성", "productName": "갤럭시버즈"}'

# 기획안 검토 페이지 테스트
# 1. 먼저 기획안 생성
# 2. /api/review로 POST하여 리뷰 ID 생성
# 3. /review/{ID}로 접속하여 검토 페이지 확인
```

## API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/generate` | POST | Claude API 자동 생성 |
| `/api/research` | POST | Tavily 기반 자동 조사 |
| `/api/review` | POST | 기획안 검토 생성 |
| `/api/review?id=xxx` | GET | 기획안 검토 조회 |
| `/api/review` | PATCH | 승인/수정요청 상태 업데이트 |
| `/review/{id}` | GET | 고객 검토 페이지 (client-review.html) |

## 문제 해결

### ANTHROPIC_API_KEY 오류
- 환경변수가 제대로 설정되었는지 확인
- Vercel 대시보드에서 Environment Variables 탭 확인
- 재배포 후 재시도

### TAVILY_API_KEY 오류
- Tavily 대시보드에서 API 키 유효성 확인
- 월 검색 한도(무료 1,000회) 초과 시 유료 플랜 업그레이드 필요
- 자동 조사 실패 시 빈 값으로 처리되며 관련 원칙은 자동 스킵됨

### 자동 조사 결과가 비어있음
- 검색 대상 제품/브랜드명이 너무 구체적이거나 신제품일 수 있음
- Tavily API 일시적 장애 가능 → 재시도
- 빈 결과는 정상 — 그라운딩 규칙에 따라 관련 원칙이 자동 스킵됨

### 빌드 실패
- `vercel.json` 설정 확인
- 파일 경로 확인
- 로컬에서 `vercel dev`로 테스트
