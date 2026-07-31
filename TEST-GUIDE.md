# 수동 테스트 가이드

## Vercel KV 전환 테스트

### 사전 준비

```bash
cd /Users/twinssn/projects2/ad-script-studio
vercel env pull .env.local
```

`.env.local`에 다음이 포함되어 있는지 확인:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

---

### 테스트 1: KV 기반 리뷰 CRUD

```bash
# 1. 리뷰 생성 (POST)
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"brandName": "삼성전자", "productName": "갤럭시워치6"}'

# 응답에서 id 확인 (예: "aBcDeFgHiJkLmNoPqRsTuV")
# id 길이가 22자인지 확인

# 2. 리뷰 조회 (GET)
curl "http://localhost:3000/api/review?id=aBcDeFgHiJkLmNoPqRsTuV"

# 응답에서 brandName/productName/status가 정상인지 확인

# 3. 상태 업데이트 (PATCH)
curl -X PATCH http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{"id": "aBcDeFgHiJkLmNoPqRsTuV", "status": "approved"}'

# 4. 재조회하여 status가 "approved"로 변경되었는지 확인
curl "http://localhost:3000/api/review?id=aBcDeFgHiJkLmNoPqRsTuV"
```

**체크포인트**:
- [ ] 생성 시 22자 ID 반환
- [ ] 조회 시 저장된 데이터 정상 반환
- [ ] 상태 업데이트 정상 동작
- [ ] 존재하지 않는 ID로 조회 시 404 반환

---

### 테스트 2: 클라이언트 검토 페이지

```bash
# 1. 리뷰 생성 후 브라우저에서 접속
# http://localhost:3000/review/aBcDeFgHiJkLmNoPqRsTuV
```

**체크포인트**:
- [ ] 다크 테마 페이지 정상 렌더링
- [ ] 타임라인 3단계 표시 (검토중 → 승인 → 확정)
- [ ] 하단 버튼 3개 (수정요청 / 승인 / 확정)
- [ ] "승인" 클릭 → 상태 변경 + 타임라인 업데이트
- [ ] "확정" 클릭 → PDF 다운로드 동작

---

### 테스트 3: 시크릿 모드 독립 세션 테스트

이 테스트는 `/tmp` 파일 저장 시의 핵심 검증 항목이었습니다.
Vercel KV 전환 후에도 정상 동작하는지 확인합니다.

```bash
# 브라우저 시크릿/프라이빗 모드에서:
# 1. 관리 페이지 접속 → 기획안 생성
# 2. 생성된 기획안에서 "고객에게 검토 링크 전달" 클릭
# 3. 링크 복사

# 다른 시크릿 세션에서:
# 4. 복사한 링크 접속 → 기획안 내용 확인
# 5. "승인" 클릭

# 원래 시크릿 세션에서:
# 6. 새로고침 → 승인 상태 반영 확인
```

**체크포인트**:
- [ ] 시크릿 모드에서 기획안 정상 생성
- [ ] 검토 링크가 다른 세션에서 정상 열림
- [ ] 승인 상태가 KV에 저장되고 모든 세션에서 확인 가능

---

### 테스트 4: 자동 조사 API 신뢰도 검증

```bash
# 1. 실제 제품 검색 (아이폰)
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"brandName": "Apple", "productName": "아이폰15 프로맥스"}'

# 응답에서:
# - relevance 배열의 relevant가 모두 true인지 확인
# - data.competitors/prices/reviews/trustFactors에 내용 존재

# 2. 가상 제품 검색 (제트스톰크림9000)
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"brandName": "제트스톰", "productName": "제트스톰크림9000"}'

# 응답에서:
# - relevance 배열의 relevant가 모두 false인지 확인
# - data의 모든 필드가 빈 값/빈 배열인지 확인
# - hallucination 없이 정직한 빈 값 반환 확인
```

**체크포인트**:
- [ ] 실제 제품: 관련성 true + 데이터 존재
- [ ] 가상 제품: 관련성 false + 빈 값 반환
- [ ] "제트스톰크림9000"에 대한 허위 정보 생성 없음

---

## 문제 해결

### KV 연결 오류
```
Error: @vercel/kv: Missing KV_REST_API_URL
```
- `vercel env pull .env.local` 실행
- `.env.local` 파일에 KV 변수 존재 확인
- `vercel dev` 재시작

### 리뷰 ID 형식 오류
- 이전 형식: `prd_YYYYMMDD_HHmmss` (17~19자)
- 신규 형식: `crypto.randomBytes(16).toString('base64url')` (22자)
- 클라이언트 검토 페이지 URL이 `/review/{22자 ID}` 형식인지 확인

### CORS 오류
- `api/review.js`의 `Access-Control-Allow-Origin: *` 확인
- 브라우저 개발자 도구 Network 탭에서 응답 헤더 확인
