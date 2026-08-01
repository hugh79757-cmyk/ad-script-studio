# SUMMARY — Phase 7: 벤치마킹 대본 분석기

- **플랜 수립:** 3개 Wave / 3개 Plan — Wave 1 Backend(`api/benchmark.js` KV 스테이지 머신), Wave 2 Frontend(벤치마킹 탭 + `benchmark-analyzer.js` 폴링 UI), Wave 3 Config/문서(`vercel.json` maxDuration 300 + env, `ENVIRONMENT-GUIDE.md`). 파일 범위·완료 기준·의존성은 PLAN.md에 명시 (기존 파일은 index.html 탭 버튼/컨테이너 + state-manager 탭 슬롯 + vercel.json + ENVIRONMENT-GUIDE.md만 최소 수정, **그 외 전부 신규**)
- **아키텍처 (RESEARCH.md Option B):** `POST /api/benchmark`(job 생성 + Apify run 즉시 시작) + `GET /api/benchmark?id=`(클라이언트 폴링, crawling→transcribing→analyzing→done 스테이지 머신) + 서버 강제 비용 상한(`MAX_ANALYZE_REELS=5`, `VIRAL_VIEWS_THRESHOLD=50000`, `maxTotalChargeUsd=1`, KV TTL 24h). `review.js`의 22자 ID+KV 패턴, `generate.js`의 `withRetry`/파싱 패턴 재사용, 프론트 폴링은 신규 모듈로 응집
- **신규 요구사항 정의 (R28~R35):** R28 새 탭 / R29 Apify 크롤링 / R30 바이럴 필터+개수 상한 / R31 Whisper 전사(`whisper-1`, `language=ko`, verbose_json segment) / R32 구조 분석+새 대본 재조립 / R33 job-status 폴링+비용 통제 / R34 env 가이드 / R35 결과 렌더링+카피. (지시사항에 따라 ROADMAP.md·REQUIREMENTS.md는 수정하지 않음 — 정의는 PLAN.md에 수록)
- **Phase 3 연동 포인트:** 벤치마킹 분석 결과(구조 해부 JSON + 전사 대본)를 KV `benchmark:{jobId}`에 저장하고 데이터 형식/저장 위치를 열어둠 — Phase 3 당위성 엔진의 원자료로 사용 가능한 구조만 설계, 이번 Phase에서 양방향 연동은 하지 않음
- **분석 단계 프로바이더 변경 (사용자 승인):** 기존 "Claude 1회 호출" → 실제 구현 **"무료 우선 5단계 폴백(NVIDIA NIM → OpenCode Zen 3종 → 유료 DeepSeek)"**로 변경 — 비용 절감 목적, 사용자 직접 승인
- **환경변수 체크포인트 필요:** `APIFY_API_TOKEN`(Apify 무료 가입, $5/월 크레딧), `OPENAI_API_KEY` — 실 API E2E 검증 전 사용자 키 설정 필수 (PLAN.md에 체크포인트 명시)
