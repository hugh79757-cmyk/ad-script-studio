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
- 재배포 후 재시도

### 빌드 실패
- `vercel.json` 설정 확인
- 파일 경로 확인
- 로컬에서 `vercel dev`로 테스트
