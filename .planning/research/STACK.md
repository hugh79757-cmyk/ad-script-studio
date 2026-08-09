# Project Research: Stack — v2 원소스 멀티유즈 콘텐츠 시스템

> 상태: 조사 완료
> 대상: AD SCRIPT STUDIO v2
> 작성일: 2026-08-09

---

## 요약 (Executive Summary)

AD SCRIPT STUDIO v2는 **Python + Node.js 혼합 아키텍처**로, 콘텐츠 코어 생성(공통 스키마)은 Node.js/Vercel 서버리스에서, 영상/음성 렌더링 파이프라인은 별도 호스팅 또는 로컬 실행이 현실적이다. 핵심 제약: **Vercel 서버리스는 moviepy 렌더링에 부적합** — ffmpeg 바이너리 의존성, 대용량 패키지, 긴 실행시간으로 인해 서버리스 환경에 맞지 않는다. **권장 방향**: Vercel(Node.js 서버리스 + 정적 호스팅)에 콘텐츠 스키마/API 레이어를 두고, Python 파이프라인(fetch_photos, generate_tts, render_video, Whisper)은 Render/Fly.io 백그라운드 워커 또는 로컬 실행 + R2/Cloud Storage 업로드 패턴으로 분리한다. edge-tts는 완전 무료지만 오프라인이 아니며, Whisper는 small 모델(244M, ~2GB VRAM)로도 한국어 전사 충분, CPU-only도 가능하지만 수초~수십 초 소요된다.

---

## 1. Python + Node.js 혼합 배포 옵션

### 옵션 A: Vercel Python 서버리스

**가능 여부**: Vercel은 Python 서버리스 함수를 공식 지원한다. `.py` 파일 감지 시 Python 런타임으로 자동 매핑되며, `requirements.txt` 기반 의존성 설치를 지원한다 (Context7: Vercel docs, 혼합 런타임 감지 로직).

**제약사항**:
| 항목 | 제한 | 비고 |
|------|------|------|
| Lambda 패키지 크기 | 300MB 압축 / 255MB 압축 해제 | Python은 AI 워크로드에 한해 면제 (Context7: Vercel schemas.ts) |
| /tmp 스토리지 | 512MB writable | 서버리스에서 유일한 쓰기 가능 디렉토리 |
| 기본 타임아웃 | 10초 | vercel.json에서 `maxDuration`으로 최대 300초까지 확장 가능 |
| 메모리 | 128MB~10,240MB | 기본 1,024MB, 설정 가능 |
| 환경변수 | 최대 64KB | Python >= 3.8 기본 지원 (Context7: DEVELOPING_A_RUNTIME.md) |

**moviepy 실행 가능성 — 부적합**:
- moviepy는 ffmpeg 시스템 바이너리 필요 (Context7: moviepy docs, "Install FFmpeg (Optional Dependency)")
- Vercel Python 런타임에 ffmpeg이 사전 설치되어 있지 않음 — 빌드 타임에 설치 불가능
- numpy + Pillow + imageio + imageio-ffmpeg + moviepy 조합은 패키지 용량이 큼
- render_video.py는 12fps 동영상 렌더링으로 실행시간이 길어 서버리스 타임아웃(300초) 초과 가능성 높음
- **결론: moviepy + ffmpeg 기반 영상 렌더링은 Vercel 서버리스에서 실행 불가**

**적합한 작업**: 가벼운 Python 작업 (텍스트 처리, 간단한 API 호출, 데이터 변환) — fetch_photos.py는 Pexels API 호출만 하므로 가능, generate_tts.py는 edge-tts가 네트워크 요청 중심이라 가능 (단, ffmpeg 의존 없으면)

### 옵션 B: 별도 호스팅 (Render / Fly.io / Railway)

**패턴**: Vercel은 API 게이트웨이 + 정적 호스팅, Python 파이프라인은 별도 서비스에서 실행. Vercel 서버리스 → Python 서비스 HTTP 호출 → 결과 URL 반환.

#### Render (무료 티어)
- 무료 웹 서비스: 512MB RAM, 0.1 CPU
- 15분 비활성 시 스핀다운 → 재요청 시 약 1분 콜드 스타트 (Context7: Render docs)
- 파일시스템 ephemeral — 스핀다운 시 변경사항 소실
- 백그라운드 워커 서비스 타입 별도 존재
- **적합한 작업**: 지속적 실행이 필요 없는 일괄 처리 파이프라인, 지연 허용 가능한 작업

#### Fly.io
- Machine 기반 배포, 초 단위 과금
- GPU Machine은 2024년 8월 이후 deprecated (Context7: Fly.io docs)
- On-Demand GPU: A10 $0.75/hr, A100 80G $1.50/hr
- 무료 할당 없음 — 실행 시간만큼 비용 발생
- **적합한 작업**: GPU 필요 시 단기 렌털, CPU-only 작업은 저가 VM으로 가능

#### Railway
- 사용량 기반 과금, 영구 무료 티어 없음
- 배포 간편, 데이터베이스 통합 우수
- **적합한 작업**: 프로토타입, 소량 사용

**권장 호스팅**: Render 무료 티어 (비용 0, 충분한 CPU for TTS/Whisper-small) 또는 Fly.io 저가 CPU 머신 (지속 실행 필요 시)

### 옵션 C: 로컬 실행 + 결과물 업로드

**패턴**: 개발자/사용자 로컬 머신에서 Python 파이프라인 실행 → 결과물(이미지/MP3/MP4)을 R2, Cloud Storage, 또는 Vercel 정적 에셋으로 업로드 → Vercel이 URL 서빙.

**장점**:
- Vercel 제약 완전 회피
- moviepy + ffmpeg 풀 파워 사용 가능
- GPU 로컬 보유 시 Whisper 고속 처리
- 비용 0 (외부 호스팅 불필요)

**단점**:
- 자동화 어려움 (수동 실행 필요)
- 로컬 환경 의존성 (Python, ffmpeg, 폰트 등 설치 필요)
- macOS/Linux 크로스 플랫폼 이슈 (폰트 경로 등)

**적합한 시나리오**: 초기 개발/테스트, 저용량 생산, 로컬 GPU 활용 시

### 옵션 D: 클라우드 배치/워커

**패턴**: GitHub Actions, AWS Batch, Cloud Run Jobs 등에서scheduled/triggered 실행.

**장점**: 서버 관리 불필요, 이벤트 기반 실행
**단점**: 설정 복잡도, 과금 모델 다양

---

## 2. 외부 API 현황

| API | 무료 한도 | 주요 제약 | 비고 |
|-----|----------|-----------|------|
| **Pexels API** | 200 req/hr, 20,000 req/월 | API 키 필수 (Authorization 헤더), 핵심 기능 복제 금지 | X-Ratelimit-* 헤더로 사용량 모니터링 가능. 동영상 API도 동일 한도. (Context7: Pexels API docs) |
| **edge-tts** | 완전 무료 (Microsoft Edge 서비스 이용) | 오프라인 불가 — Microsoft 서버 연결 필요. 공식 속도 제한 문서 없음. 음질은 Neural 음성 기준 양호. 한국어(ko-KR) 지원. | asyncio 기반, VoicesManager로 음성 필터링 가능. rate/volume/pitch 조절 가능. (Context7: edge-tts docs) |
| **Whisper (openai-whisper)** | 무료 (오픈소스) | 모델 다운로드 필요 (최초 1회). small=244M 파라미터, 디스크 ~461MB. CPU-only 실행 가능 but 느림. ffmpeg 시스템 의존. | 모델별 VRAM: tiny~1GB, base~1GB, small~2GB, medium~5GB, large~10GB, turbo~6GB. 한국어 인식은 small 이상 권장. (Context7: Whisper README) |
| **Pollinations.ai** | 무료 (익명): 15초당 1회 제한 추정 | 익명 사용 시 rate limit 엄격. API 키 발급 시Higher limits. Flux, nanobanana(Gemini Image) 모델 지원. | `image.pollinations.ai/prompt/{prompt}?model=flux` 또는 `/v1/images/generations` OpenAI 호환 엔드포인트. (Context7: Pollinations docs) |
| **YouTube Data API** | 일일 10,000 quota units (무료) | videos.insert: 1 unit/call → 하루 최대 ~100회 업로드. OAuth 2.0 필요 (사용자 동의). uploads 컬렉션 별도 할당. | quota 리셋: 태평양시간 자정. 검색/목록은 1 unit/call. (Context7: YouTube Data API docs) |
| **나노바나나 (Gemini Image)** | 웹 UI 무료 (Google AI Studio) / API 유료 (Gemini API) | API 키 방식: Google AI Studio에서 발급. 이미지 생성 API 엔드포인트 통해 호출. | Pollinations.ai에서 `model=nanobanana` 파라미터로 간접 사용 가능 (무료 티어 내). |

### API 키 발급 링크
- Pexels: https://www.pexels.com/api/ — 계정 생성 후 즉시 발급
- edge-tts: API 키 불필요 (Microsoft Edge 공용 서비스)
- Whisper: API 키 불필요 (로컬 모델)
- Pollinations.ai: https://pollinations.ai/ — API 키 발급 또는 익명 사용
- YouTube Data API: Google Cloud Console에서 프로젝트 생성 → YouTube Data API v3 활성화 → OAuth 2.0 클라이언트 ID 발급
- 나노바나나: Google AI Studio (https://aistudio.google.com/) 에서 API 키 발급

---

## 3. Vercel 서버리스 제약

### 타임아웃
- **기본**: 10초 (Node.js/Python 공통)
- **최대**: 300초 (5분) — `vercel.json` 또는 `vercel.framework.json`에서 `maxDuration` 설정
- 현재 프로젝트의 `vercel.json`은 `api/benchmark.js`에 `maxDuration: 300` 설정 적용 중

### 파일 시스템
- **읽기 전용**: 대부분의 배포 디렉토리
- **쓰기 가능**: `/tmp` 디렉토리만 — 512MB 제한
- 서버리스 함수 실행 간 파일 공유 불가 — 각 실행은 격리된 환경
- 대용량 파일은 외부 스토리지(S3, R2, Cloudflare Images 등)에 저장하고 URL로 접근

### 환경변수
- Vercel 대시보드 또는 `vercel env add`로 설정
- Python 런타임: 최대 64KB 환경변수 지원 (Lambda 런타임 래퍼)
- Node.js: 기본 4KB, 래퍼로 확장 가능
- `.env` / `.env.local` 파일은 로컬 개발용, 프로덕션은 Vercel 환경변수 사용

### 대용량 파일 처리 패턴
1. **외부 스토리지 + URL 참조**: 이미지/동영상 파일은 R2/S3에 업로드하고, 메타데이터만 서버리스에 저장
2. **스트리밍 응답**: 큰 파일 다운로드 시 streaming response 사용
3. **/sign URL 패턴**: Cloudflare R2 Presigned URL 등으로 임시 접근 URL 생성
4. **청크 업로드**: 큰 파일은 청크 단위로 분할 업로드/병합

### 현재 프로젝트 설정 (참고)
```json
// vercel.json (현재)
{
  "functions": {
    "api/benchmark.js": {
      "maxDuration": 300
    }
  }
}
```

---

## 4. Python 의존성

### requirements.txt 권장 목록

```txt
# 영상 렌더링
moviepy>=2.0.0
Pillow>=10.0.0
numpy>=1.24.0

# 음성 합성
edge-tts>=6.0.0

# 자막/전사
openai-whisper>=2024.0.0
srt>=3.0.0

# HTTP 클라이언트
requests>=2.28.0

# 환경변수 관리
python-dotenv>=1.0.0

# 이미지 처리 (추가)
imageio>=2.28.0
imageio-ffmpeg>=0.5.0
```

### 크로스 플랫폼 주의사항

| 항목 | macOS | Linux (서버) | 대응 |
|------|-------|-------------|------|
| **ffmpeg** | `brew install ffmpeg` | `apt-get install ffmpeg` / `yum install ffmpeg` | 시스템 설치 필수, Python 패키지 아님 |
| **폰트 경로** | `/System/Library/Fonts/`, `/Library/Fonts/` | `/usr/share/fonts/`, `/usr/local/share/fonts/` | render_video.py에서 폰트 경로 탐지 로직 필요 또는 환경변수로 지정 |
| **OpenCV** | 비교적 쉬움 | 일부 패키지 수동 컴파일 필요 가능 | `opencv-python-headless` 사용 권장 (GUI 불필요 시) |
| **Whisper 모델** | 동일 다운로드 | 동일 다운로드 | 최초 1회 `whisper.load_model()` 시 `~/.cache/whisper/`에 캐시 |
| **edge-tts** | 동일 동작 | 동일 동작 | Microsoft Edge 서버 접속만 가능하면 플랫폼 무관 |

### pyproject.toml vs requirements.txt
- Vercel Python 빌더는 `requirements.txt` 감지 후 내부적으로 `pyproject.toml` 변환 → `uv sync`로 설치 (Context7: Vercel python-analysis)
- 단순 의존성 목록에는 `requirements.txt`가 간결하고 Vercel 호환성 명확
- 고급 빌드 커스텀 필요하면 `pyproject.toml` + `uv` 직접 사용 가능

---

## 권장 방향

### 아키텍처 원칙

```
┌─────────────────────────────────────────────────────────────┐
│                     AD SCRIPT STUDIO v2                      │
├─────────────────────────────────────────────────────────────┤
│  콘텐츠 코어 계층 (공통 데이터 스키마)                        │
│  ├── 전략/대본 JSON 스키마                                    │
│  ├── 씬(Scene) 목록                                          │
│  └── 메타데이터 (브랜드, 타겟, 톤앤매너, 리뷰 등)             │
├─────────────────────────────────────────────────────────────┤
│  포맷 렌더러 레이어                                           │
│  ├── 쇼츠 (Shortform) — 영상 파일                             │
│  ├── 카드뉴스 (Card News) — 이미지 슬라이드                     │
│  ├── 인포그래픽 (Infographic) — 단일 이미지                     │
│  └── 롱폼 (Longform) — PDF/문서                               │
├─────────────────────────────────────────────────────────────┤
│  실행 환경 분리                                               │
│  ├── Vercel (Node.js 서버리스 + 정적 호스팅)                  │
│  │   └── API 라우팅, 콘텐츠 스키마 관리, PDF 렌더링             │
│  ├── Render/Fly.io (Python 워커) 또는 로컬 실행               │
│  │   └── fetch_photos → generate_tts → render_video → Whisper │
│  └── Cloud Storage (R2/S3)                                   │
│       └── 생성된 미디어 파일 저장 + URL 서빙                   │
└─────────────────────────────────────────────────────────────┘
```

### 구체적 권장

1. **Vercel은 Node.js 레이어만 사용**
   - 기존 `api/generate.js` 패턴 유지
   - 새 Python 스크립트 직접 실행하지 않음
   - Python 파이프라인 상태/결과 조회를 위한 API 엔드포인트 제공

2. **Python 파이프라인은 Render 무료 웹 서비스 또는 로컬 실행**
   - `render_video.py`, `fetch_photos.py`, `generate_tts.py`, Whisper 전사는 Render 워커 또는 로컬에서 실행
   - Render 무료 티어: 15분 스핀다운 → 대량 배치 작업에는 콜드 스타트 1분 감수
   - 대안: Fly.io 저가 CPU 머신 (월 $2~5 수준, 상시 가동 가능)

3. **미디어 저장소는 Cloudflare R2 권장**
   - Vercel과 동일 생태계, egress 비용 0
   - Presigned URL로 업로드/다운로드
   - 렌더링 완료 후 결과 URL만 Vercel DB/KV에 저장

4. **API 키 관리**
   - Pexels API 키: Render/Fly.io 환경변수 또는 로컬 `.env`
   - edge-tts: 키 불필요
   - Whisper: 키 불필요, 모델 캐시는 공유 스토리지 또는 각 인스턴스 로컬
   - Pollinations.ai: 무료 익명 사용 또는 API 키 (환경변수)

5. **워밍업 전략 (Render 사용 시)**
   - 15분 비활성 시 스핀다운 → 첫 요청 1분 지연
   - Uptime 모니터링 서비스 (UptimeRobot 등)로 주기적 ping → 스핀다운 방지
   - 또는 중요 작업 전 예약된 워밍업 호출

### 신뢰도 평가

| 항목 | 신뢰도 | 근거 |
|------|--------|------|
| Vercel Python 서버리스 존재 | HIGH | Context7 Vercel docs, .py 감지 로직 확인 |
| Vercel에서 moviepy 실행 불가 | HIGH | ffmpeg 시스템 의존 + 패키지 크기 + 타임아웃 제약 (추론) |
| Pexels API 무료 한도 | HIGH | Context7 Pexels API docs 공식 문서 |
| edge-tts 무료/온라인 | HIGH | Context7 edge-tts docs, Microsoft Edge 서비스 의존 명시 |
| Whisper 모델 크기/VRAM | HIGH | Context7 Whisper README 공식 표 |
| Pollinations.ai 익명 제한 | MEDIUM | Context7 docs에 15초 제한 명시, 정확한 정책은 변동 가능 |
| YouTube API quota | HIGH | Context7 YouTube Data API docs 공식 문서 |
| Render 무료 티어 스핀다운 | HIGH | Context7 Render docs 공식 문서 |

### 확인 필요 항목

- [ ] Render 무료 티어에서 moviepy + ffmpeg 설치/실행 테스트 필요 (실제 배포 검증)
- [ ] edge-tts의 비공식 속도 제한이 실제 프로덕션에서 문제 되는지 확인 (다수 동시 요청 시)
- [ ] Pollinations.ai 익명 사용 시 정확한 rate limit 정책 재확인 (문서화 미흡)
- [ ] Cloudflare R2 연동 시 Vercel 서버리스에서 Presigned URL 생성 방법 확인
- [ ] Whisper small 모델의 한국어 전사 정확도 벤치마크 (실제 오디오 샘플로 테스트)
