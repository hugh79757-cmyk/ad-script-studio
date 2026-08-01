# BACKLOG — AD SCRIPT STUDIO

> 마지막 업데이트: 2026-08-01
> v1.1 이후 후보 작업 목록. v1(Milestone)과 무관한 개선 요청 모음.

---

## v1.1 후보

### [v1.1] PDF 한글 폰트 bold 굵기 미표현

- **상태:** backlog (등록 2026-08-01)
- **분류:** 개선 (v1 버그 아님)
- **증상:**
  - `pdf.js`의 `loadKoreanFont()`에서 `fonts/NotoSansKR-subset.ttf`를
    `fontStyle: 'normal'` + `fontStyle: 'bold'`로 이중 등록함.
  - 그러나 서브셋 폰트는 Noto Sans KR 변수 폰트의 **wght=400 정적 인스턴스**
    (`pyftsubset` 시 `fvar/gvar/avar` 테이블 제거됨)라 굵기 정보가 없음.
  - 결과: 한글 bold 문장이 normal과 동일한 굵기로 출력됨 (깨짐 아님, 굵기 차이 없음).
- **영향:** 시각적 계층(hierarchy) 표현력 저하. 텍스트 무결성은 정상.
- **원인:** jsPDF 2.5.x는 TTF 단일 굵기만 등록. 변수 폰트 wght=400만 서브셋됨.
- **해결 후보 (택1):**
  1. Noto Sans KR Bold 정적 TTF(또는 wght=700 인스턴스)를 별도 서브셋 후
     `doc.setFont('NotoSansKR', 'bold')`에 등록. → PDF 크기 증가(약 2배) 예상,
     목표 크기(300KB~1MB)와 트레이드오프 검토 필요.
  2. 서브셋에 wght=400~700 범위의 gvar 유지 → jsPDF 호환성 이슈 있음 (비추천).
  3. 수용: 한글 bold 생략, 라틴 bold(Helvetica 등 내장 폰트)만 활용.
- **관련 파일:** `pdf.js`, `proposal-pdf.js`, `fonts/NotoSansKR-subset.ttf`

### [v1.1] 자동 모드 API 생성 지연 (90초)

- **상태:** backlog (등록 2026-08-01, 기존 잔존 위험 승격)
- **증상:** 프로덕션 E2E에서 자동 모드 제안서 생성에 약 90초 소요.
- **영향:** 사용자 UX 저하. 타임아웃 폴백(10초)은 폰트 로드에만 적용됨.
- **해결 후보:** API 프롬프트 경량화, 스트리밍 응답, 캐시.

