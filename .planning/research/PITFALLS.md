# Project Research: Pitfalls — v2 원소스 멀티유즈 콘텐츠 시스템

> 상태: 조사 완료
> 대상: AD SCRIPT STUDIO v2
> 작성일: 2026-08-09
> 조사자: GSD 프로젝트 연구원 (Phase 6)

---

## 요약

v2 원소스 멀티유즈 콘텐츠 시스템에서 가장 치명적인 함정 4가지:

1. **Vercel에서 moviepy/Whisper 실행 시도** — Vercel 서버리스에는 ffmpeg 바이너리가 없고, moviepy+npu+Pillow 조합은 번들 크기가 수십~수백 MB에 달하며, Python 서버리스의 300초 제한으로도 12fps 영상 렌더링이 타임아웃된다. **렌더링 파이프라인은 Vercel 밖으로 빼야 한다.**

2. **쇼츠 전체 파이프라인을 단일 서버리스 호출로 처리** — 리서치(이미지 검색)→TTS→자막→렌더링 전체 과정은 수 분~수십 분 소요. Vercel `maxDuration: 300`으로는 중간에 끊긴다. **Job-status 폴링 패턴(v1 benchmark.js 방식)을 렌더 작업에도 적용해야 한다.**

3. **제휴 고지문을 캠페인 설정 시점에는 삽입하고 렌더 결과물 검증은 누락** — 법적 고지는 콘텐츠 코어에 한 번 설정하면 모든 렌더러가 자동으로 삽입하지만, 영상 자막의 경우 고시 시간이 3초 미만이면 효력 미비로 간주될 수 있다. **렌더 후 고지 표시 시간 검증 단계가 필요하다.**

4. **v1의 template-video.js, video-ui.js, state-manager.js, app.js를 건드리면 기존 3탭 전략 제안서/영상 소스/벤치마킹 플로우가 깨짐** — v2 쇼츠 렌더러가 이 파일들의 기능을 흡수하더라도 **즉시 삭제하지 않고 공존 기간을 두어야 한다.**

---

## 1. Python + Vercel 통합

### PITFALL: Vercel 서버리스에서 moviepy/Whisper 실행 시도

- **증상**: `api/render.js` 또는 `api/video.js`에서 `import moviepy` 또는 `from moviepy import VideoFileClip` 시도 → 빌드 실패 또는 런타임 에러
- **원인**:
  1. **ffmpeg 바이너리 부재**: moviepy는 내부적으로 ffmpeg 시스템 바이너리를 호출한다 (moviepy docs: "Install FFmpeg (Optional Dependency)"). Vercel Python 런타임 이미지에는 ffmpeg이 사전 설치되어 있지 않으며, 빌드 타임에 `apt-get install ffmpeg`을 시도해도 serverless 런타임 이미지에 포함되지 않는다.
  2. **패키지 크기 초과**: moviepy 2.2.1 소스 배포판만 58.4MB. numpy, Pillow, imageio, imageio-ffmpeg를 포함한 전체 의존성 트리는 수십~수백 MB에 달한다. Vercel Python 서버리스 기본 제한은 500MB uncompressed bundle이며, AI 워크로드 면제가 있더라도 moviepy의 numpy 의존은 순수 Python wheel이 아니라 C 확장 포함 wheel이라 번들링 복잡도가 높다.
  3. **Whisper 모델 크기**: openai-whisper small 모델(약 244M 파라미터, ~461MB 다운로드). 서버리스에 다운로드/저장하려면 `/tmp`(512MB writable)에 두어야 하는데, 모델 로드 후 영상 렌더링과 병행하면 스토리지 부족 발생.
  4. **실행 시간**: render_video.py가 12fps 쇼츠(예: 60초 영상)를 렌더링하려면 프레임 단위 처리가 필요해 CPU 기준 수 분~수십 분. Vercel `maxDuration` 300초(Pro 플랜 기준)로는 부족.
  5. **Python 런타임 감지 조건**: Vercel은 `requirements.txt`, `pyproject.toml`, `Pipfile` 중 하나가 있고 Python entrypoint(`app.py`, `index.py`, `server.py`, `main.py`, `wsgi.py`, `asgi.py` 또는 `api/` 내 `handler`/`app` 정의)이 있어야 Python 함수로 인식한다. 기존 v1의 `api/generate.js`(Node.js)와 동일한 `api/` 디렉토리에 `.py` 파일을 놓으면 런타임 충돌이 발생할 수 있다.
- **예방**:
  - render_video.py, whisper 처리는 **Vercel 외부에서 실행**한다. Render 백그라운드 워커, Fly.io VM, 또는 로컬 실행 + R2/Cloud Storage 업로드 패턴을 사용.
  - Vercel에는 **콘텐츠 코어 CRUD + 경량 작업**(Pexels API 호출, edge-tts API 호출, Pollinations.ai 호출, 자막 텍스트 생성)만 맡긴다.
  - `api/` 디렉토리에는 Node.js 함수만 두고, Python 스크립트는 `scripts/` 디렉토리에 분리한다.

### PITFALL: child_process로 Python 호출 (Node.js 서버리스에서)

- **증상**: `api/render.js`(Node.js)에서 `child_process.spawn('python3', ['scripts/render_video.py', ...])` 호출 → `ENOENT: no such file or directory` 또는 `python3: not found`
- **원인**:
  1. **Vercel Node.js 서버리스 런타임에 Python 미설치**: Vercel의 Node.js 런타임 이미지는 Python을 포함하지 않는다. `python3` 명령어가 존재하지 않는다.
  2. **node:child_process는 서버리스에서 제한적**: Vercel 서버리스의 파일 시스템은 읽기 전용(writable은 `/tmp`만). Python 스크립트를 동적으로 다운로드/설치하는 것도 제한적.
  3. **패키지 부재**: 설령 Python이 있더라도 `pip install moviepy`가 서버리스 실행 중에 동작하지 않는다(네트워크 제한, `/tmp` 용량, 실행 시간).
- **예방**:
  - Node.js 서버리스에서 Python을 child_process로 호출하는 패턴은 **포기한다**.
  - Python 스크립트 실행이 필요하면 별도 호스팅 서비스(Render/Fly.io)에서 HTTP API로 노출하고, Vercel Node.js 서버리스는 해당 API를 HTTP 호출하는 클라이언트 역할만 한다.

### PITFALL: FFmpeg 의존성 간과

- **증상**: render_video.py 실행 시 `MoviePy: ffmpeg not found` 또는 `AudioFileClip: ffmpeg not found` 에러
- **원인**:
  - moviepy의 `VideoFileClip`, `AudioFileClip`, `ImageClip`은 모두 ffmpeg에 의존한다.
  - edge-tts로 생성한 오디오(mp3/wav)를 영상 합성에 사용하려면 ffmpeg가 오디오 디코딩/인코딩을 담당.
  - Whisper도 오디오 전처리를 위해 ffmpeg에 의존 (OpenAI Whisper docs: "ffmpeg is required").
  - 서버리스 환경(Vercel, Cloudflare Workers)에는 ffmpeg 바이너리가 없다.
  - **CF Workers + WASM ffmpeg** 같은 대안도 존재하지만, moviepy 수준의 복잡한 영상 합성에는 부적합.
- **예방**:
  - FFmpeg가 필요한 모든 작업(영상 렌더링, 오디오 병합, 자막 임베딩)은 **ffmpeg가 사전 설치된 환경**에서 실행한다.
  - Render: Dockerfile에 `RUN apt-get update && apt-get install -y ffmpeg` 포함.
  - Fly.io: Docker 이미지 기반이므로 동일하게 ffmpeg 포함 가능.
  - 로컬 실행: 사용자 머신에 ffmpeg 설치 필요 — README에 명시.

### PITFALL: Python 서버리스 번들 크기 초과

- **증상**: Vercel 배포 시 `Python Function bundle size of X.XX MB exceeds the 500 MB limit` 에러
- **원인**:
  - Vercel Python 런타임 문서의 "Controlling what gets bundled" 섹션: "표준 Python 번들 크기 제한은 500MB uncompressed" (Context7: Vercel Python runtime docs, 2026-07-22).
  - moviepy + numpy + Pillow + imageio + scipy 등의 의존성 트리는 500MB를 쉽게 초과한다.
  - Vercel은 Python에 대해 자동 tree-shaking을 하지 않는다: "기본적으로 Python Vercel Functions에는 빌드 타임에 도달 가능한 모든 파일이 포함된다."
- **예방**:
  - `vercel.json`의 `functions`에 `excludeFiles` 패턴으로 테스트/정적 파일 제외 (예: `{tests/**,__tests__/**,**/*.test.py,fixtures/**}`).
  - Python 서버리스에는 **경량 API 호출 스크립트만** 포함시키고, 무거운 처리는 외부로 분리.

---

## 2. 외부 API

### PITFALL: Pexels API 무료 한도 초과

- **증상**: API 호출 시 HTTP 403 또는 `Rate limit exceeded` 응답. 영상 생성 시 필요한 이미지 여러 장(판매량 기준 씬당 1~3장, 쇼츠 7씬 = 최대 21장)을 한 번에 요청하다 한도 초과.
- **원인**:
  - **무료 티어 한도**: Pexels API 무료 티어는 분당 요청 수 제한과 일일/월간 호출 제한이 있다. 정확한 수치는 Pexels API 대시보드에서 확인해야 하나, 무료 계정의 경우 월간 제한이 존재하며 대량 요청 시 차단된다.
  - **질의 품질 편차**: Pexels 검색 결과는 키워드 매칭 기반으로, "건성 피부 크림" 검색 시 광고용으로 적합한 고퀄리티 이미지가 항상 상단에 오지 않는다. 검색 결과의 품질 편차가 크고, 상업적 사용이 허용된 이미지라도 모델 릴리스가 필요한 인물 이미지가 포함될 수 있다.
  - **라이선스 조건**: Pexels 라이선스는 상업적 사용 가능 + attribution 불요(필수 아님)이나, 이미지 내 식별 가능한 인물/상표에 대한 추가 권리는 부여하지 않는다. 제품 광고에서 인물이 포함된 이미지를 사용할 때 주의 필요.
  - **실제 테스트 결과 (2026-08-09)**: Pexels API에 API 키 없이 `https://api.pexels.com/v1/curated?per_page=1` 호출 시 HTTP 200 + 유효한 JSON 응답 반환됨. 이는 Pexels가 테스트/개발 목적으로 키 없이도 일부 접근을 허용하거나, 해당 엔드포인트가 공개되어 있음을 시사. 그러나 **프로덕션에서는 반드시 API 키를 헤더(`Authorization: Bearer <KEY>`)에 포함**해야 하며, 키 없이 호출하면 향후 차단될 수 있다.
- **예방**:
  - Pexels API 키는 Vercel 환경변수(`PEXELS_API_KEY`)에만 저장, 프론트엔드 노출 금지.
  - 이미지 요청은 **캐시 계층** 도입: 동일한 캠페인/소제목에 대해 반복 검색하지 않도록 content/campaigns/{id}/photos/에 다운로드된 이미지 메타데이터 저장.
  - 무료 티어 한도 모니터링: API 응답 헤더의 rate limit 정보 확인, 초과 임박 시 로컬 폴백(Pollinations.ai)으로 전환.
  - 인물 이미지 사용 시 Pexels 라이선스만으로 충분한지 법률 검토 필요 — 특히 특정 인물 식별 가능 사진.

### PITFALL: edge-tts 동시 접속/속도 제한

- **증상**: 긴 대본(한국어, 60초 쇼츠 기준 약 150~180자)을 edge-tts로 변환 시 수 초~수십 초 소요. 여러 캠페인 동시 렌더링 시 음성 생성 지연.
- **원인**:
  - edge-tts는 Microsoft Edge의 온라인 TTS 서비스를 비공식적으로 이용하는 Python 라이브러리(rany2/edge-tts, GitHub 11,692 stars). **완전 무료지만 Microsoft의 공식 서비스가 아니므로 SLA 없음.**
  - 비동기 방식(`asyncio`)으로만 동작 — 동기 코드에서 호출 시 이벤트 루프 문제 발생 가능.
  - Microsoft Edge TTS 서비스의 비공식 제한: 과도한 동시 요청 시 속도 제한 또는 일시적 차단 가능. 정확한 제한 수치는 공개되지 않음.
  - **한국어 목소리 품질**: Edge TTS의 한국어 목소리(`ko-KR-SunHiNeural`, `ko-KR-InJoonNeural` 등)는 신경망 기반이지만, 광고용 내레이션으로서의 자연스러움은 유료 서비스(ElevenLabs 등)보다 떨어질 수 있다.
  - **긴 텍스트 처리**: edge-tts는 한 번에 큰 텍스트를 처리할 수 있으나, 매우 긴 텍스트(수천 자)는 타임아웃 또는 품질 저하 가능. 쇼츠 대본(150~200자)은 문제 없음.
- **예방**:
  - edge-tts는 **보조 TTS**로 취급. 고품질이 필요한 캠페인(실제 광고 집행용)은 ElevenLabs/Azure TTS 등 유료 서비스 옵션을 Later phase로 열어둔다.
  - 동시 실행 수 제한: 한 번에 N개 이하의 TTS 작업만 병렬 실행하도록 세마포어 적용.
  - TTS 실패 시 폴백: edge-tts 실패 → 기본 제공되는 무료 TTS 대안 또는 "음성 생성 실패, 수동 업로드 필요" 상태 표시.

### PITFALL: Whisperローカル 실행 시 리소스 문제

- **증상**: `python -m whisper audio.mp3 --model small` 실행 시 메모리 부족(OOM) 크래시, 또는 CPU에서 수십 분 소요
- **원인**:
  - OpenAI Whisper 모델 크기 (Context7: OpenAI Whisper docs + GitHub):
    - `tiny`: 39M 파라미터, ~72MB
    - `base`: 74M, ~142MB
    - `small`: 244M, ~461MB
    - `medium`: 769M, ~1.5GB
    - `large`: 1,550M, ~2.9GB
  - small 모델은 GPU 없이 CPU만으로도 실행 가능하나, 한국어 음성(특히 광고는 배경음/잡음 포함)의 전사 정확도는 모델 크기와 비례.
  - 첫 실행 시 모델 다운로드 필요 (HF Hub에서). 서버리스 환경에서는 `/tmp`에 캐시해야 하며, 콜드 스타트 때마다 재다운로드할 수 있다.
  - 최신 정보: OpenAI는 2024년 이후 Whisper API를 `gpt-transcribe` 등 신규 모델로 전환 중. 로컬 Whisper 실행은 유지보수 모드일 수 있음.
- **예방**:
  - **로컬 Whisper는 small 모델 이상 권장** (한국어 광고 음성 전사 목적).
  - GPU 환경(Render GPU 인스턴스, 로컬 CUDA 머신)에서 실행 권장.
  - Vercel 서버리스에서는 Whisper 실행하지 않는다 — API 서버리스 용량/시간으로 불가능.
  - 대안으로 **OpenAI Whisper API**(유료, 파일당 과금) 사용 가능. v1 benchmark.js가 이미 OpenAI Whisper API를 사용 중이므로, 동일한 패턴 채용 가능.
  - 전사 정확도 검증: 광고 음성 특유의 마케팅 용어/브랜드명/홍보 문구는 Whisper가 오인식하기 쉬우므로, 사람이 확인할 수 있는 UI 제공.

### PITFALL: Pollinations.ai 익명 제한 및 품질 불일치

- **증상**: 이미지 생성 요청 시 15초 내 재요청하면 빈 응답/에러, 또는 생성된 이미지가 기대와 다름
- **원인**:
  - Pollinations.ai는 **익명(미등록) 사용 시 15초당 1회** 제한이 있다 (자체 문서 기준).
  - API 키 방식과의 차이: API 키 등록 시 더 높은 한도 가능 — 정확한 수치는 Pollinations.ai 대시보드 확인 필요.
  - **이미지 품질/일관성**: 동일한 프롬프트로도 매번 다른 이미지가 생성됨(seed 제어 가능 여부 확인 필요). 캠페인 내 여러 이미지가 분위기와 일관되지 않을 수 있다.
  - **생성 실패 처리**: 네트워크 오류, 모델 로드 지연 등으로 생성이 실패할 수 있으며, 이에 대한 재시도 로직 필요.
  - Pollinations.ai는 텍스트/이미지/오디오/비디오 생성을 모두 제공하지만, **광고용으로 필요한 고해상도이미지(최소 1080x1920 쇼츠 커버) 생성 능력은 별도 확인 필요**.
- **예방**:
  - Pollinations.ai는 **Pexels 검색 결과가 없을 때의 폴백**으로 사용. 주 이미지 소스로 의존하지 않는다.
  - 동일한 프롬프트 재요청 시 최소 15초 지연 또는 seed 파라미터 활용(일관성 필요 시).
  - 이미지 생성 실패 시 graceful degradation: "이미지 생성 실패 — 수동 선택 필요" 상태 표시 후 렌더 계속 진행.

### PITFALL: YouTube Data API OAuth/할당량 복잡도

- **증상**: `uploads` 엔드포인트 호출 시 403 `quotaExceeded`, 또는 OAuth 토큰 만료로 업로드 실패
- **원인**:
  - YouTube Data API v3는 OAuth 2.0 인증이 필요 (서버 사이드 웹 애플리케이션 흐름).
  - **할당량(quota) 시스템**: API 호출마다 quota 소모. 영상 업로드(`videos.insert`)는 1회당 1,600 units 소모. 일일 기본 할당량은 10,000 units — 즉 **하루 최대 약 6회 업로드**만 가능.
  - 썸네일 업로드(`thumbnails.set`)는 별도 호출. 영상 메타데이터 업데이트도 별도 호출.
  - OAuth 토큰은 만료되며 갱신 필요 — 서버리스에서 OAuth 토큰 관리 복잡.
  - YouTube 업로드된 영상의 처리는 수 분~수십 분 소요, 비동기 상태 확인 필요.
- **예방**:
  - YouTube 업로드는 **v2 Phase 1에서는 제외**하고, 수동 업로드 안내만 제공.
  - Phase 2 이상에서 구현 시: 서비스 계정(OAuth보다 간단) 또는 사용자 OAuth 플로우 중 선택.
  - quota 관리 UI 필수: 잔여 quota 표시, quota 임계치 알림.
  - 썸네일 업로드(별도로 videos.update + thumbnails.set)는 영상 업로드 후 별도 단계로 분리.
  - **확실한 대안**: YouTube 스튜디오 수동 업로드 + 자동 생성된 설명/태그/자막 텍스트 제공 방식으로 시작.

### PITFALL: 나노바나나/Gemini 이미지 API 인증 및 비용 미확인

- **증상**: "나노바나나" 언급만으로 구현 시도 → API 키 방식인지 웹 UI 방식인지 불분명, 비용 미확인
- **원인**:
  - 구글의 "나노바나나"(Nanobanana)는 Gemini 기반 이미지 생성/편집 기능으로 추정되나, 2026-08-09 기준 공식 API 문서에서 명확한 명칭으로 확인되지 않음. Gemini API(image generation) 공식 문서 조회가 필요함.
  - Gemini API 키 방식: Google AI Studio에서 API 키 발급, 무료 티어 존재(확인 필요).
  - 웹 UI 방식: Gemini 웹 인터페이스에서 수동으로 이미지 생성 → 자동화에 부적합.
  - 비용: Gemini API 유료 티어 비용 구조 확인 필요. 대량 이미지 생성 시 비용 누적 가능.
- **예방**:
  - 나노바나나/Gemini 이미지 생성은 **별도 조사 후 결정**. STACK.md/ARCHITECTURE.md 작성 시 "조사 필요"로 표시하고 Phase 2 이후로 연기.
  - Google AI Studio에서 API 키 발급 가능성, 무료 한도, 이미지 생성 엔드포인트 존재 여부 확인.
  - v2 Phase 1에서는 Pexels + Pollinations.ai만으로 이미지 공급 체계를 구성.

---

## 3. 콘텐츠 코어 + 렌더러 아키텍처

### PITFALL: 콘텐츠 코어 스키마 과잉 설계

- **증상**: core.yaml에 50개 이상의 필드가 정의되고, 각 렌더러가 "이 필드를 왜 쓰는지" 불분명해짐. 새 렌더러 추가 시 스키마 수정 필요 → 기존 렌더러 회귀.
- **원인**:
  - 처음부터 4개 포맷(쇼츠/카드뉴스/인포그래픽/롱폼) 모두를 고려하다 보니 "모든 포맷이 필요로 할 것 같은" 필드를 미리 정의.
  - v1의 10개 입력 필드에서 너무 급격히 확장하여, 실제 초기 렌더러 구현 시 사용하지 않는 필드가 다수 포함.
  - YAML 스키마 변경 시 모든 렌더러가 파서 오류를 일으킬 수 있음.
- **예방**:
  - **최소 스키마(Minimal Viable Schema)** 로 시작: v1의 10개 필드 + 렌더러가 실제로 소비하는 필드만 Phase 1에 포함.
  - 필드 추가는 렌더러 구현 시점에 "이 렌더러가 필요로 하는 필드"로 제한.
  - 스키마 버전을 필드(`schemaVersion: 1`)로 관리. 렌더러는 자신이 지원하는 schemaVersion을 명시.
  - NICHE_SCHEMA.md(아이템 유형/니치 분류)는 별도 스키마 객체로 분리하고, 콘텐츠 코어는 `niche: { id: "health-food", ... }` 형태로 참조만 함.

### PITFALL: 콘텐츠 코어 ↔ 렌더러 간 결합도 과다

- **증상**: 쇼츠 렌더러 구현 중 "이 필드명을 바꾸면 인포그래픽 렌더러도 수정 필요" 상황 발생. 새 포맷 추가 시 기존 모든 렌더러를 검토해야 함.
- **원인**:
  - 렌더러가 콘텐츠 코어의 내부 필드명을 직접 참조하고, 필드 구조 변경 시 모든 렌더러가 영향받음.
  - 렌더러별 "어떤 필드를 어떻게 소비하는지" 매핑이 문서화되지 않음.
- **예방**:
  - 각 렌더러가 **자신이 소비하는 필드 목록과 소비 방식**을 렌더러 문서 상단에 명시.
  - 콘텐츠 코어는 **공개 계약( 퍼블릭 필드)** 과 **내부 확장 필드**를 구분. 렌더러는 퍼블릭 필드만 소비.
  - 렌더러 간 공통 유틸리티(법적 고지 삽입 함수, 과장 필터 함수, 프롬프트 템플릿 함수)는 `renderers/common/` 모듈로 분리.
  - 새 렌더러 추가 시 기존 렌더러를 수정할 필요가 없도록 인터페이스를 충분히 추상화.

### PITFALL: 파일 기반 저장(content/campaigns/) 동시성 문제

- **증상**: 두 브라우저 탭에서 같은 캠페인의 content/core.yaml을 동시에 수정 → 한쪽 수정이 다른 쪽 수정을 덮어씀 (lost update).
- **원인**:
  - 파일 기반 저장소는 기본적으로 동시 편집 제어(lock, optimistic concurrency)를 제공하지 않음.
  - Vercel 서버리스 + 로컬 스크립트 혼합 환경에서는 "서버가 파일을 쓰고, 로컬 스크립트가 읽는" 패턴에서 갱신 타이밍 충돌 가능.
- **예방**:
  - 콘텐츠 코어 YAML 파일은 **생성자가 단독 소유**하는 것을 기본 가정. 여러 사람이 동시에 같은 파일을 편집하는 워크플로는 v2 범위에서 제외.
  - 동시 편집이 필요한 경우: 콘텐츠 코어를 Vercel KV 또는 D1(SQLite)으로 이전하는 후속 phase로 연기.
  - 파일 수정 시 timestamp 기반 last-write-wins 경고만 표시 (완전한 해결은 아님).

### PITFALL: YAML/JSON 파서 오류 처리 부재

- **증상**: 사용자가 content/core.yaml을 직접 편집하다가 들여쓰기 오류, 따옴표 누락, 목록 구문 오류 발생 → 렌더러가 파서 예외로 중단. 오류 메시지가 기술적이고 사용자 비친화적.
- **원인**:
  - YAML/JSON 파서(pyYAML, js-yaml 등)는 구문 오류 시 예외가 발생하며, 줄 번호와 오류 종류만 제공.
  - 캠페인 작성자(비개발자)가 YAML을 직접 편집할 가능성 있음.
- **예방**:
  - YAML 파싱 실패 시 **사용자에게 친절한 오류 메시지**로 변환: "캠페인 'OOO'의 core.yaml 15번 줄: 들여쓰기가 올바르지 않습니다. 탭 대신 공백을 사용해주세요."
  - 렌더 시작 전 YAML 유효성 검증을 별도 단계로 실행. 실패 시 렌더 중단 + 오류 위치 표시.
  - 가능하면 YAML 편집 UI를 제공하고, 직접 편집은 고급 사용자 옵션으로 제한.

### PITFALL: 렌더 결과물 정리/삭제 정책 부재

- **증상**: campaign별로 렌더링된 영상 파일(쇼츠 MP4, 카드뉴스 PNG 시퀀스 등)이 content/campaigns/{id}/outputs/에 누적. 스토리지가 무한 증가.
- **원인**:
  - "언제 이전 렌더 결과를 삭제할지"에 대한 정책이 없음.
  - 재렌더링 시 이전 파일을 덮어쓰지 않고 새 버전으로 계속 쌓이는 패턴.
- **예방**:
  - 렌더 결과물 naming 규칙: `outputs/shorts_v1.mp4`, `outputs/shorts_v2.mp4` — 버전 번호 붙이기.
  - **기본 정책**: 최신 버전 2개 유지, 나머지는 수동 삭제 또는 자동 정리 옵션.
  - 파일 크기 모니터링: 캠페인 디렉토리가 특정 크기(예: 500MB)를 초과하면 경고.
  - v2 Phase 1에서는 "정리 정책 없음"으로 시작하되, README에 정책 필요 항목으로 기록.

---

## 4. 쇼츠 파이프라인 장시간 실행

### PITFALL: 단일 Vercel 서버리스 호출로 전체 파이프라인 처리 시도

- **증상**: "쇼츠 생성" 버튼 클릭 → `POST /api/render-shorts` 호출 → 수 분 후 Vercel 타임아웃(300초)으로 중간 응답 없이 실패. 사용자는 진행 상황도 모르고 리로드해야 함.
- **원인**:
  - 쇼츠 파이프라인 전체 소요 시간: 리서치(Pexels API 조회 + 이미지 다운로드) 10~30초 → TTS(edge-tts) 5~30초(대본 길이에 비례) → 자막 생성 5~10초 → 렌더링(moviepy) 2~10분(CPU 기준). **총 3~15분.**
  - Vercel 서버리스 maxDuration은 Hobby 60초, Pro 300초. 어떤 플랜으로도 전체 파이프라인 처리 불가.
  - Vercel 서버리스는 스트리밍 응답이 가능하지만, 이 경우에도 300초 후에는 강제 종료.
  - **v1 benchmark.js는 이미 이 문제를 Job-status 폴링 패턴으로 해결함**: POST로 job 생성(즉시 201 응답) → GET으로 상태 폴링 → done 수신. 동일한 패턴을 렌더 작업에도 적용해야 한다.
- **예방**:
  - **렌더 작업도 benchmark.js와 동일한 Job-status 패턴으로 구현**:
    ```
    POST /api/render-shorts → 201 { jobId }
        │
        ▼
    KV 스테이지 머신 (fetching_photos → tts → captioning → rendering → done/failed)
        │
        ▼
    Client: setInterval(GET /api/render-shorts?id=jobId, 5000ms) → done 수신 시 결과물 표시
    ```
  - 실제 렌더링 작업(Python 스크립트 실행)은 **Vercel 외부에서 실행**: Render 백그라운드 워커, Fly.io VM, 또는 로컬 실행.
  - Vercel 서버리스는 job 상태 관리 + 경량 단계(이미지 URL 목록 조회, TTS API 호출 결과 수집, 자막 텍스트 생성)까지만 담당.
  - Vercel KV(Phase 7에서 이미 사용 중) 재사용 가능. TTL은 렌더 완료 후 정리(예: 48시간).

### PITFALL: 렌더 진행 상태 추적/표시 부재

- **증상**: 사용자가 "쇼츠 생성" 클릭 후 30초 동안 아무 변화 없음 → "이게 동작하는 건가?" → 새로고침 → 생성된 결과가기적에 생성 중이었는지 모름.
- **원인**:
  - Job-status 패턴의 GET 응답에 진행률(progress percentage, 현재 단계 이름)이 포함되지 않음.
  - 폴링 간격(예: 5초)이 길어서 단계 전환 시 체감 지연 발생.
  - "현재 단계" 텍스트가 추상적(예: "처리 중") → 구체적 단계명(fetching_photos, generating_tts, rendering video 등) 필요.
- **예방**:
  - GET 응답에 `{ stage: "fetching_photos", progress: 0.15, message: "Pexels에서 이미지 검색 중..." }` 포함.
  - 폴링 간격 초기 3초 → 단계 진행 중 8초로 점진적 증가 (과도한 폴링 방지).
  - UI에 진행 단계 표시기(steps indicator): [리서치] → [TTS] → [자막] → [렌더링] → [완료].
  - 단계 실패 시 실패 단계에 하이라이트 + 재시도 버튼 + 실패 원인 표시.

### PITFALL: 중간 단계 실패 시 롤백/재시도 정책 부재

- **증상**: TTS 단계 실패 시 "렌더 실패" 표시만 되고, 이미지는 이미 다운로드된 상태. 사용자가 다시 시도하면 이미지부터 다시 다운로드 (시간 낭비).
- **원인**:
  - 각 단계가 독립적인 작업으로 관리되지 않고, 전체 파이프라인을 단일 transaction으로 취급.
  - 부분 결과물(다운로드된 이미지, 생성된 자막 텍스트)이 어디에도 저장되지 않음.
- **예방**:
  - 각 단계의 출력을 **캠페인 디렉토리의 중간 파일로 저장**:
    ```
    content/campaigns/{id}/
    ├── core.yaml
    ├── photos/           # Pexels에서 다운로드한 이미지
    ├── tts/              # 생성된 오디오 파일
    ├── captions/         # 생성된 자막(SRT/VTT)
    └── outputs/          # 최종 렌더 결과물
    ```
  - 단계 실패 시: 이미 완료된 단계의 결과를 재사용하여 **해당 단계부터 재개(resume)** 옵션 제공.
  - 재개(resume) 가능 여부: 콘텐츠 코어(core.yaml)가 동일하면 이미지/TTS 재실행 불필요.

### PITFALL: Partial 결과물 처리 부재

- **증상**: 이미지는 성공적으로 다운로드됐으나 TTS 실패 → "렌더 실패"만 표시되고, 이미지들은 아무 데도 저장되지 않음. 사용자가 다시 시도.
- **원인**:
  - 실패 시 정리(cleanup) 로직이 없거나, 반대로 중간 결과물을 전부 삭제.
  - 부분 성공을 "실패"로 간주하는 정책.
- **예방**:
  - **부분 성공(partial success)을 정상 상태로 처리**: TTS 실패 → "이미지 준비 완료, 음성 생성 실패" 상태 저장. 사용자가 TTS 설정을 조정하고 "TTS만 다시 실행" 가능.
  - 각 단계 결과를 별도 디렉토리에 저장하여 독립적으로 접근 가능하게.
  - 최종 렌더(출력 영상)는 **모든 선행 단계 성공 시에만 생성**. 선행 단계 중 하나라도 실패하면 최종 렌더는 생성하지 않고, 부분 결과물만 제공.

---

## 5. 제휴 고지 + 과장 필터

### PITFALL: 제휴 프로그램별 고지 요건 미확인 상태로 고지문 생성

- **증상**: 콘텐츠 코어에 `affiliate: { type: "coupang", link: "..." }` 설정 시 자동으로 "이 포스팅은 쿠팡 파트너스 활동의 일환으로..." 문구를 삽입. 하지만 쿠팡 파트너스 약관이 갱신되어 고지문 형식이 변경되었을 경우, 오래된 고지문 삽입 → 법적 효력 미비.
- **원인**:
  - 제휴 프로그램(쿠팡 파트너스, 브랜드커넥스, 네이버 쇼핑 제휴 등)별로 고지 의무 문구가 다름.
  - 각 프로그램의 약관은 수시로 갱신됨. **정적 고지문 문자열을 코드에 하드코딩하면 갱신 시점에 부정확해짐.**
  - 특히 한국은 표시·광고의 공정화에 관한 법률(표시광고법) + 각 제휴 프로그램 이용약관이 적용됨.
- **예방**:
  - 제휴 고지문은 **코드에서 하드코딩하지 않고, 콘텐츠 코어의 `legal.notice` 필드에 사용자가 직접 입력**하도록 한다. 기본값 제공은 가능하지만, 최종 확인은 사용자 책임으로 명시.
  - 제휴 유형별 고지문 템플릿은 별도 문서(`docs/affiliate-notice-templates.md`)로 관리. 시점은 **콘텐츠 생성 시점이 아니라 영상 게시 시점**에 최신 약관을 다시 확인하도록 안내.
  - "본 고지문은 2026-08-09 기준이며, 게시 전 최신 약관을 확인하세요."라는 면책 문구를 고지 영역 상단에 표시.

### PITFALL: 영상 내 고지 자막 표시 시간 부족

- **증상**: 쇼츠 영상 마지막 1초에 "이 포스팅은 제휴 활동의 일환입니다" 자막 표시 → 실효성 없음 (읽을 시간 부족).
- **원인**:
  - 한국 표시광고법 및 공정위 가이드라인은 명시적 표시 시간 규정을 두고 있지 않으나, **표시가 인식 가능한 시간과 크기**여야 한다는 일반 원칙.
  - 1초짜리 자막은 사실상 인식 불가.
- **예방**:
  - 영상 내 제휴 고지는 **최소 3초 이상** 표시되도록 렌더러에서 강제. (렌더러별 설정: 쇼츠는 최소 3초, 롱폼은 화면 하단 고정 표시)
  - 자막 크기: 영상 높이의 5% 이상(가독성 확보).
  - 고지 자막 색상: 배경과 대비되는 색상 (흰 배경+검은 텍스트 또는 반대).
  - 렌더 후 검증 단계에서 고지 표시 시간이 3초 미만이면 경고 표시.

### PITFALL: 과장 필터 False Positive — 정상 마케팅 표현 차단

- **증상**: "국내 최초", "단 하나의", "완벽한" 같은 표현을 과장 필터가 모두 차단 → 실제 마케팅에서 흔히 쓰는 강조 표현이 사용 불가.
- **원인**:
  - 키워드로만 과장을 판단하면, 맥락을 고려하지 않고 정상 표현까지 차단.
  - "국내 최초"는 사실에 기반하면 적법한 표현이나, 필터는 사실 확인 없이 차단.
- **예방**:
  - 과장 필터는 **boolean 차단이 아니라 위반 항목 목록 + 심각도(critical/warning/info) + 제안 수정안**을 반환.
  - critical: 명백한 허위/기만 표현 (사실과 다른 "최초", "1위" 등 증거가 없는 경우).
  - warning: 과장 가능성 있음 — 사용자 확인 필요.
  - info: 주의 권장 표현 — 사용 가능하나 주의.
  - 필터 결과는 렌더 전 검토 화면에 표시. "이 표현을 유지하겠습니다" / "다른 표현으로 변경" 선택 가능.

### PITFALL: 과장 필터 False Negative — 규제 영역 표현 누락

- **증상**: 건강기능식품 캠페인에서 "체지방 감소에 도움" 같은 식약처 인정 표현을 사용했는데, 필터가 이를 걸러내지 못함. 실제로는 식약처 인정 번호 확인이 필요한 표현.
- **원인**:
  - 일반화된 필터는 니치별 특수 규제를 알지 못함.
  - 건강기능식품, 화장품, 의약품, 금융 상품 등은 각각 별도의 광고 규제 존재.
- **예방**:
  - 콘텐츠 코어의 `niche` 필드(니치 카테고리)를 기반으로 **니치별 금지/제한 표현 리스트를 적용**.
  - NICHE_SCHEMA.md에 니치별 규제 정보 포함 (Phase 1 시작 시에는 빈 리스트로 시작, 조금씩 확장).
  - 신규 니치 추가 시 해당 니치의 광고 규제를 조사하는 절차를 문서의 "니치 추가 checklist"로 기록.

### PITFALL: 일반화된 필터로 니치별 금기어 대응 불가

- **증상**: 여행지 캠페인에서는 문제없는 "핫플레이스", "인생샷" 같은 표현이 특정 니치에서는 과장/오인으로 간주될 수 있음.
- **예방**:
  - 필터는 **니치 컨텍스트를 입력받아 적용**. 동일 표현이라도 니치에 따라 severity가 달라짐.
  - 니치별 표현 리스트는 콘텐츠 코어 스키마의 일부(`niche.rules.expressions[]`)로 관리.
  - 초기 v2에는 몇 개 주요 니치(뷰티, 건강기능식품, 여행, IT기기)의 기본 리스트만 포함. 나머지는 사용자가 커스텀 규칙 추가 가능하도록 열기.

---

## 6. v1 호환성

### PITFALL: v1의 전략 제안서 생성기(메인 기능)를 v2 작업 중 실수로 수정

- **증상**: v2 콘텐츠 코어 스키마 작업을 하다가 `app.js`나 `template-plan.js`를 수정하고, v1의 수동/자동 모드 대본 생성이 깨짐. 기존 E2E 테스트 실패.
- **원인**:
  - v2 작업이 v1 파일과 동일한 파일에서 이루어짐.
  - v1 파일은 상태 관리자(state-manager.js), 앱 로직(app.js), 대본 템플릿(template-plan.js), PDF 생성(proposal-pdf.js, proposal-layout.js, pdf.js), 영상 소스 생성기(template-video.js, video-ui.js)로 구성됨.
- **예방**:
  - v2에서 v1 파일을 수정하는 경우, **반드시 기존 v1 기능이 무손상임을 확인하는 테스트를 먼저 실행**하고 수정 후 재실행.
  - v1 테스트 스위트가 없는 상태에서 v2 작업을 시작하면 안 됨. 우선 v1 E2E 테스트(`test-e2e.js`, `test-pdf-production.mjs`)를 실행 가능한 상태로 유지.
  - v2 콘텐츠 코어 작업은 **새 파일**(`content-core.js`, `schema.js` 등)로 시작. v1 파일을 직접 수정하지 않는다.
  - v1 ↔ v2 통합은 **별도 "마이그레이션" phase**로 분리하고, 그 phase에서만 v1 파일을 수정.

### PITFALL: template-video.js, video-ui.js 즉시 삭제

- **증상**: v2 쇼츠 렌더러가 EN 프롬프트 생성을 담당하게 되어, template-video.js와 video-ui.js가 "불필요"하다고 판단 → 삭제. 이후 기존 "영상 소스 생성기" 탭이 깨짐.
- **원인**:
  - v2 쇼츠 렌더러가 영상 소스 생성기의 기능을 "흡수"한다고 해서 기존 파일이 즉시 obsolete 되는 것은 아님.
  - 기존 탭(proposal/video/benchmark)은 v1 사용자들에게 여전히 필요.
- **예방**:
  - template-video.js와 video-ui.js는 **v2 Phase 1에서 삭제하지 않는다**. 대신 "deprecated" 표시하고 v2 쇼츠 렌더러가 동일한 기능을 제공하는지 확인.
  - v2 쇼츠 렌더러가 정상 동작하고, 기존 영상 소스 생성기 탭을 v2로 대체하기로 결정한 다음에야 삭제.
  - 삭제 전: v1 탭 전환 테스트로 무손상 확인 → 삭제 커밋 → 재검증.

### PITFALL: state-manager.js 수정 시 탭 전환/전달 회귀

- **증상**: v2 콘텐츠 코어 상태를 저장하기 위해 `tabState` 구조를 확장하다가, 기존 `transferToVideoGenerator()` 함수의 `proposalResults` 참조가 깨져서 "2번으로 보내기"가 동작하지 않음.
- **원인**:
  - `tabState`의 기존 필드(`proposalResults`, `videoResults`, `benchmarkResults`)와 v2에서 추가할 필드(`contentCore`, `campaigns[]` 등)의 통합 과정에서 키 충돌 또는 참조 손실.
  - `sessionStorage` 직렬화/역직렬화 시 새 필드 타입이 기존 파싱 로직과 호환되지 않음.
- **예방**:
  - state-manager.js 수정 시 **기존 3개 필드의 동작을 먼저 확인하는 테스트** 실행.
  - v2 상태 필드는 기존 필드명과 충돌하지 않는 접두사 사용 (예: `v2_campaigns`, `v2_contentCore`).
  - `sessionStorage`에 저장/복원 시 필드 존재 여부 체크 후 파싱 (없는 필드는 무시).

### PITFALL: proposal-pdf.js 경로가 v2 콘텐츠 코어와 혼동

- **증상**: v2에서 "콘텐츠 코어 기반 PDF 렌더링"을 구현하려다, v1의 proposal-pdf.js가 이미 전략 제안서 PDF를 생성한다는 사실을 잊고 중복 구현 → 혼란.
- **원인**:
  - v1의 proposal-pdf.js는 "전략 제안서 PDF"(클라이언트 공유용)를 생성.
  - v2의 콘텐츠 코어는 "영상/카드뉴스 등 미디어 콘텐츠의 소스 데이터"를 표현.
  - 두 PDF의 목적과 대상이 다름에도 불구하고, "콘텐츠에서 PDF 생성"이라는 유사성 때문에 혼동.
- **예방**:
  - v1 proposal-pdf.js는 **그대로 유지** (전략 제안서 생성기 탭에서 사용).
  - v2에서는 콘텐츠 코어 → 영상/미디어 렌더러를 주된 출력으로 하고, PDF 출력은 필요시 별도 모듈(`renderers/pdf.js` 등)로 분리.
  - 파일명을 명시적으로 구분: v1은 `proposal-pdf.js`(제안서 PDF), v2는 `renderers/pdf/render-content-pdf.js`(콘텐츠 코어 PDF) 등.

---

## 7. 디자인 원칙 계승

### PITFALL: 네온 시안/골드 팔레트를 전 포맷에 강제 적용

- **증상**: 쇼츠, 카드뉴스, 인포그래픽, 롱폼 모두에 네온 시안(#00F0FF), 골드(#FFD700), 마젠타, 다크 배경을 강제 적용. 카드뉴스나 인포그래픽은 밝은 배경이 더 가독성이 좋은데, 억지로 다크 테마를 적용해서 가독성 저하.
- **원인**:
  - v1의 vox-content 디자인 원칙(네온 시안, 골드, 마젠타, 다크)이 전략 제안서 생성기 UI를 위해 설계됨.
  - 모든 콘텐츠 포맷에 동일한 디자인 언어를 적용해야 한다는 가정의 오류.
- **예방**:
  - **포맷별 디자인 시스템 분리**: 쇼츠는 v1 스타일(네온/다크) 유지 가능. 카드뉴스/인포그래픽은 밝은 배경 + 보기 쉬운 색상에 최적화. 롱폼은 중간 톤.
  - 콘텐츠 코어의 `style` 필드에 포맷별 스타일 프리셋을 지정 가능하게: `stylePreset: "neon-dark" | "clean-light" | "minimal"`.
  - 디자인 원칙은 **공통 토큰**(색상 팔레트, 폰트 스택, 간격 스케일)으로 정의하고, 포맷별로 토큰 값을 다르게 매핑.

### PITFALL: 자막 2줄 순차 표시 규칙을 모든 포맷에 오적용

- **증상**: 인포그래픽에서도 자막을 2줄 순차 표시로 구현하려 함 → 인포그래픽은 정적 이미지이므로 순차 표시 개념이 맞지 않음.
- **원인**:
  - v1 쇼츠의 "자막 2줄 순차 표시"가 영상 포맷에 특화된 규칙임을 망각하고, "모든 콘텐츠의 자막 규칙"으로 일반화.
- **예방**:
  - **자막 규칙은 포맷별 렌더러의 책임**: 쇼츠 렌더러는 2줄 순차 표시를 적용. 카드뉴스는 이미지 내 텍스트 배치 규칙으로 대체. 인포그래픽은 요소별 텍스트 레이아웃 규칙 적용.
  - 콘텐츠 코어의 `captions` 필드는 쇼츠 전용. 카드뉴스/인포그래픽은 별도의 `textElements` 필드로 표현.

### PITFALL: 이모지 금지 규칙을 모든 포맷에 적용

- **증상**: 카드뉴스에서 시각적 강조를 위해 적절히 사용할 수 있는 이모지(예: 여행 카드의 ✈️, 뷰티 카드의 ✨)까지 금지 → 카드뉴스의 시각적 매력 저하.
- **원인**:
  - v1에서 쇼츠 대본에 이모지를 금지한 이유가 "TTS가 이모지를 음성으로 읽어버리는 문제"인데, 이 이유가 모든 포맷에 적용된다고 가정.
- **예방**:
  - **이모지 금지 규칙을 포맷별로 분리**:
    - 쇼츠(자막): TTS 읽힘 문제 + 자막 가독성 → 금지 또는 제한적 허용(시각적 이모지만, TTS가 무시할 수 있는 형식).
    - 카드뉴스: 시각적 이모지 허용 (이미지 내 텍스트로 삽입되므로 TTS 문제 없음).
    - 인포그래픽: 필요에 따라 허용.
    - 롱폼(뉴스레터형): 제한적 허용.
  - 콘텐츠 코어의 필드별로 이모지 허용 여부를 렌더러가 결정.

---

## 8. mc 블로그 체인 주제 브릿지

### PITFALL: mc 블로그 체인 저장 형식 모르고 파싱 시도

- **증상**: mc 블로그 체인의 주제 목록을 가져오려고 `/content/` 또는 특정 디렉토리를 파싱 시도 → 실제 저장 형식(마크다운 frontmatter? 데이터베이스? 별도 인덱스 파일?)과 맞지 않아 실패.
- **원인**:
  - mc 블로그 체인이 어떤 형식으로 주제를 저장하는지 확인되지 않음. (Hugo 블로그의 경우 보통 콘텐츠 파일 + frontmatter, 또는 별도의 카테고리/태그 시스템.)
  - 체인 발행 파이프라인(mc-chain-publish 스킬)이 주제를 어떤 형태로 출력하는지 명확히 알려지지 않음.
- **예방**:
  - **브릿지 구현 전 mc 저장소 구조 조사 선행**: mc 블로그가 사용하는 Hugo 사이트의 `content/` 디렉토리 구조를 확인.
  - 조사 결과에 따라 옵션 선택:
    - 옵션 A(정적 YAML 카탈로그): mc 블로그 주제 목록을 수동으로 YAML 파일로 관리 (가장 단순, 초기 phase에 적합).
    - 옵션 B(mc 저장소 직접 읽기): mc 블로그 저장소의 콘텐츠 파일 목록을 읽기 (저장소 접근 권한 필요, 구조 파악 필요).
    - 옵션 C(사용자 수동 입력): 사용자가 주제 URL 또는 목록을 직접 입력.
  - **v2 Phase 1에서는 옵션 C로 시작**하고, 이후 옵션 A로 전환.

### PITFALL: mc 발행 주제 수/빈도 모름 → 브릿지 아키텍처 과잉/과소 설계

- **증상**: mc 체인이 월 10개 주제를 발행한다고 가정하고 브릿지 아키텍처를 설계했는데, 실제로는 월 50개 발행하거나 0개 발행 → 아키텍처 낭비 또는 커버 못 함.
- **원인**:
  - mc 블로그 체인의 발행 빈도, 주제 수, 주제 간 관계가 조사되지 않음.
- **예방**:
  - 브릿지 설계 전에 mc 체인 발행 이력을 확인: 최근 30일간 발행된 주제 목록, 주제 간 연결 구조.
  - 발행 빈도가 낮으면(수 주 1~2개), 수동 카탈로그 방식(A)으로 충분.
  - 발행 빈도가 높으면, 자동화 옵션(B) 검토 시점.
  - **초기 가설**: v2 Phase 1에서는 주제 브릿지 없이도 쇼츠 렌더러가 작동하도록 설계. 브릿지는 선택적 기능(phase 2+).

### PITFALL: 시드 키워드만으로 깊이 단계별 소제목 AI 추정 → 부정확

- **증상**: "건성 피부 크림"이라는 시드 키워드로 AI가 깊이 단계별 소제목을 생성 → "1단계: 건성 피부란?", "2단계: 크림 선택법", "3단계: 바르는 순서" 같은 일반적이고 밋밋한 소제목 생성. mc 블로그 체인이 실제 깊이 있게 다루는 소주제와 불일치.
- **원인**:
  - AI는 시드 키워드만으로는 실제 체인이 다루는 깊이 있는 내용을 알 수 없음.
  - 체인의 기존 발행 주제를 참조하지 않은 상태에서 AI 추정만 하면 품질 저하.
- **예방**:
  - **실제 mc 체인 발행물의 소제목 구조를 참조하여** v2의 깊이 단계 모델 설계.
  - AI가 소제목을 생성할 때는 **참조할 기존 주제 데이터(mc 체인에서 가져온 주제 목록)를 컨텍스트로 제공**.
  - 초기 v2에서는 소제목 생성 없이, 사용자가 직접 깊이 단계별 소제목을 입력하는 방식으로 시작.

---

## 가장 중요한 5가지 함정 (우선순위)

| 순위 | 함정 | 심각도 | 예방 |
|------|------|--------|------|
| 1 | **Vercel 서버에서 moviepy/Whisper 실행 시도** — 빌드 실패, 런타임 에러, 타임아웃으로 전체 렌더 파이프라인이 동작하지 않음 | 🔴 치명적 | 렌더링 파이프라인을 Vercel 외부로 분리 (Render/Fly.io/로컬). Vercel에는 콘텐츠 코어 API + 경량 작업만. |
| 2 | **쇼츠 전체 파이프라인을 단일 300초 서버리스 호출로 처리** — 수 분짜리 작업이 중간에 끊기고 사용자는 진행 상황도 모름 | 🔴 치명적 | benchmark.js의 Job-status 폴링 패턴을 렌더 작업에 동일하게 적용. Vercel KV로 job 상태 관리. |
| 3 | **제휴 고지문을 코드에 하드코딩** — 약관에 맞게 갱신 안 된 고지문이 영상에 삽입되어 법적 효력 미비 | 🟠 높음 | 고지문은 콘텐츠 코어에서 사용자가 직접 입력. 제휴 유형별 템플릿은 별도 문서로 관리. 게시 전 최신 약관 확인 안내. |
| 4 | **v1의 template-video.js/video-ui.js를 쇼츠 렌더러 구현 중에 삭제** — 기존 영상 소스 생성기 탭이 깨지고 롤백 필요 | 🟠 높음 | v2 Phase 1에서 v1 파일 삭제 금지. 쇼츠 렌더러가 동일 기능을 대체함을 확인한 후 별도 phase에서 정리. |
| 5 | **콘텐츠 코어 스키마를 처음부터 과잉 설계** — 사용하지 않는 필드가 많고, 새 렌더러 추가 시마다 스키마 수정 필요 → 유지보수 부담 | 🟡 중간 | Minimal Viable Schema로 시작. 렌더러가 실제 사용하는 필드만 포함. 스키마 버전 관리. |

---

## 출처

- **Vercel Python Runtime docs** (2026-07-22): https://vercel.com/docs/functions/runtimes/python — Python 서버리스 제약(번들 크기 500MB, entrypoint 규칙, excludeFiles 설정)
- **Vercel Runtimes docs** (2026-07-29): https://vercel.com/docs/functions/runtimes — Vercel Functions 공통 제약(500MB /tmp, microVM 격리, 아카이빙 정책)
- **moviepy 2.2.1 PyPI** (2026-08-09): https://pypi.org/project/moviepy/ — moviepy 소스 배포판 58.4MB, ffmpeg 필요 명시, MIT 라이선스
- **OpenAI Whisper/Transcriptions API docs** (2026-08-09): https://platform.openai.com/docs/guides/speech-to-text — Whisper 모델 크기 정보, 파일 크기 제한 25MB, 한국어 지원, gpt-transcribe 권장 모델 (Whisper는 timestamps용 유지)
- **edge-tts GitHub** (2026-08-09): https://github.com/rany2/edge-tts — 11,692 stars, Microsoft Edge TTS 비공식 라이브러리, asyncio 방식 무료 사용
- **Pexels API** (2026-08-09): https://api.pexels.com/v1/curated — API 키 없이도 테스트 응답 확인 (프로덕션에서는 키 필요). Pexels 라이선스: 상업적 사용 가능, attribution 불요, 단 인물/상표 권리 불포함.
- **Pollinations.ai** (2026-08-09): https://pollinations.ai/ — 15초당 1회 익명 제한. API 키 방식도 존재 (정확한 한도는 대시보드 확인 필요).
- **YouTube Data API quota** (2026-08-09): https://developers.google.com/youtube/v3/getting-started#quota — videos.insert 1,600 units, 일일 기본 10,000 units = 하루 약 6회 업로드 한계.
- **AD SCRIPT STUDIO v1 소스** (2026-08-09): `template-video.js`, `video-ui.js`, `state-manager.js`, `app.js`, `api/generate.js`, `vercel.json`, `index.html` — v1 구조 분석 기반 호환성 함정 도출.
- **ARCHITECTURE.md / STACK.md** (2026-08-09): `.planning/research/` — 기존 연구에서 도출된 하이브리드 배포 패턴(패턴 3), 콘텐츠 코어 스키마 설계, 렌더러 아키텍처 기반.
