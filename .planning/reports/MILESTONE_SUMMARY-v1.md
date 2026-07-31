# MILESTONE SUMMARY — AD SCRIPT STUDIO v1

> Generated: 2026-07-31
> Updated: 2026-07-31 (리팩터링: 전략 제안서 중심으로 재정의)
> Status: Planning Complete, Implementation Pending
> Milestone: v1 (Phase 1~6)

---

## 1. Overview

**What:** AD SCRIPT STUDIO is a web-based tool that generates **"감이 아니라 논리로 만든" 전략 제안서** for e-commerce marketers/MDs. The core value is not just ad script generation, but creating **product-specific rationale** and a **persuasion-structured proposal document** that proves every creative decision has a logical basis.

**Why:** E-commerce marketers currently write ad scripts based on intuition ("감"). This tool replaces intuition with evidence-based reasoning by:
1. Collecting raw data (reviews, competitor info, price barriers) as input
2. Applying 26 professional copywriting principles with product-specific rationale
3. Outputting a proposal PDF structured as a persuasion argument (Problem → Strategy → Creative → Expected Impact → Principles Appendix)

**Who it's for:** E-commerce marketers and MDs who create short-form video ads (15~60 seconds) for platforms like Instagram Reels, TikTok, YouTube Shorts.

**Two core tools in one app:**
1. **Strategic Proposal Generator (전략 제안서 생성기)** — Generates a complete proposal: problem diagnosis + strategy rationale + ad script + storyboard + expected impact + principles appendix
2. **Video Source Generator (영상 소스 생성기)** — Internal-use only. Parses scripts into scenes and generates EN prompts for image/video AI tools. Not for client presentation.

**Key differentiator:** The **Rationale Engine (당위성 엔진)** — not just listing which principles were applied, but generating "why this principle is needed for THIS product" based on actual input data (target audience, reviews, competitor differences, price barriers).

---

## 2. Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Vanilla HTML/CSS/JS | No framework overhead, instant load, single-file simplicity |
| Styling | CSS Variables + Flexbox/Grid | Dark theme, responsive 2-panel layout |
| PDF Generation | jsPDF (client-side) | No server needed for PDF downloads |
| API Backend | Vercel Serverless Functions | Server-side Claude API calls, API key security |
| AI | Anthropic Claude API | Rationale generation + ad script generation via system prompts |
| Deployment | Vercel (static + serverless) | Single platform for frontend + API |
| Skills Source | `skills/custom/shortform-copywriting.md` | 26 curated copywriting principles |

### Project Structure (Planned)

```
ad-script-studio/
├── index.html              # Single-page app entry
├── style.css               # Dark theme, responsive layout
├── app.js                  # Main app logic, mode toggle, state
├── template-plan.js        # Script template + truncation rules
├── rationale-engine.js     # ⭐ 당위성 근거 생성 로직 (입력값 + 원칙 매칭)
├── template-video.js       # Scene parsing + EN prompt generation
├── pdf.js                  # jsPDF wrapper for standard PDF
├── proposal-pdf.js         # ⭐ 설득형 제안서 PDF 템플릿
├── skill-loader.js         # Fetch + parse shortform-copywriting.md
├── state-manager.js        # Global state + cross-tool data passing
├── video-ui.js             # Video Source Generator UI (minimal)
├── api/
│   └── generate.js         # Vercel serverless: Claude API proxy
├── vercel.json             # Deployment config
├── skills/
│   ├── custom/
│   │   └── shortform-copywriting.md   # 26 principles (READY)
│   └── marketing/                     # Full marketing skills library (reference)
└── .planning/              # GSD planning artifacts
```

### Data Flow

```
[User Input — 10 fields including reviews, competitors, price]
    ↓
[Strategic Proposal Generator]
    ↓
┌─────────┴─────────┐
[Manual Mode]      [Auto Mode]
Template-based     /api/generate → Claude API
rationale          → AI-generated rationale (진가 발휘)
    ↓                    ↓
[Result Area]           ↓
┌─────┬─────┬─────┐  [Result Area]
전략개요 대본 스토리보드    ↓
    ↓              ["Send to #2" Button]
[Proposal PDF]           ↓
(문제진단→전략→       [Video Source Generator ←── Auto-delivered]
크리에이티브→          ↓
기대효과→원칙부록)  [Scene Parsing] → [EN Prompts] → [Copy]
```

---

## 3. Phases

### Phase 1: 전략 제안서 생성기 UI 골격 + 입력 필드 확장 ⭐
**Goal:** 2-panel layout with dark theme, **10 expanded input fields** for raw data collection
**Requirements:** R1, R2, R3, R4, R23, R24
**Key deliverables:**
- **10 input fields** (expanded from 5):
  - Original: brand name, product name, concept, target audience, tone & manner
  - New: competitor products/differences, price barriers, key review excerpts (min 3), brand trust factors, excluded keywords
- 3-tab result area: strategy overview / script / storyboard
- Dark theme, responsive layout
- Required field validation (brand, product, target are required)
- **Why expand:** Phase 3's rationale engine needs raw data to generate genuine rationale. Without reviews/competitors/price info, the rationale becomes hollow.

### Phase 2: 기획안 생성 로직 + 결과 렌더링 + PDF (제안서의 구성요소)
**Goal:** Template-based script generation as **one component of the proposal**, not the main output
**Requirements:** R5, R6, R7
**Key deliverables:**
- Template-based script with timeline + dialogue + direction
- Script generation is **deliberately reduced in scope** — it's a component within the proposal, not the end product
- jsPDF standard PDF download
- Copy-to-clipboard, "New" button

### Phase 3: 당위성 엔진 + 설득형 제안서 문서화 ⭐⭐ 핵심 Phase
**Goal:** Generate product-specific rationale and output a persuasion-structured proposal PDF
**Requirements:** R8, R9, R10, R25, R26, R27
**Key deliverables:**

#### 3-1. Rationale Engine (당위성 엔진)
- 26 principles injected into system prompt
- **NOT simple principle listing** — generates "why THIS product needs THIS principle" based on input data
- Manual mode: template-based rationale (limited)
- Auto mode: Claude API connects inputs + principles → logical rationale (**this is where the engine shines**)

#### 3-2. Persuasion-Structured Proposal PDF
| Order | Section | Content | Purpose |
|-------|---------|---------|---------|
| 1 | Cover | Brand + date + "광고 기획안" | Professional first impression |
| 2 | **Problem Diagnosis** | Target's problems backed by reviews/data | Prove "this problem exists" |
| 3 | **Strategy & Rationale** | Creative strategy + psychological principles | Prove "why we chose this approach" |
| 4 | **Implemented Creative** | Script + storyboard | Show actual implementation |
| 5 | **Expected Impact** | General evidence-based expectations (NO guaranteed numbers) | Set expectations + build trust |
| 6 | **Appendix: All 26 Principles** | Full list + why each was applied to this product | Transparency + expertise |

- Document structure proves: **"우리는 감이 아니라 논리로 만든다"**

### Phase 4: Claude API 자동화
**Goal:** Vercel serverless + Claude API, manual ↔ auto mode toggle
**Requirements:** R11, R12, R13
**Key deliverables:**
- `/api/generate` serverless function
- API key server-side only
- Auto mode where the **rationale engine produces genuine logical reasoning** (vs. manual mode's template text)

### Phase 5: 영상 소스 생성기 (내부용 재료 도구)
**Goal:** Internal-use scene parser + EN prompt generator
**Requirements:** R14, R15, R16, R17, R18
**Key deliverables:**
- Tab switch to Video Source Generator
- Script → scene parsing (3-10 scenes)
- EN image/motion prompts + style suffix
- Detail control, copy buttons
- **Minimal UI** — this is for internal use only, not client-facing. No need for polished design.

### Phase 6: 두 도구 연결 + 통합 테스트 + Vercel 배포
**Goal:** Tools connected, full E2E, Vercel deployment
**Requirements:** R19, R20, R21, R22
**Key deliverables:**
- "Send to #2" auto-delivery
- Tab state preservation
- Vercel deployment
- E2E flows (manual + auto)
- PDF download (standard + proposal)
- **Optional:** Client sharing link concept (evaluate at deployment)

---

## 4. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tool 1 identity | **Strategic Proposal Generator** (not script generator) | Script is one component; the value is in rationale + persuasion structure |
| Phase 3 is core | **Yes — longest, most complex phase** | This is where genuine value is created; everything else supports it |
| Rationale engine | Template (manual) + AI (auto) | Manual mode is a stepping stone; auto mode delivers real value |
| Proposal PDF structure | Problem → Strategy → Creative → Impact → Principles | Persuasion logic, not arbitrary section ordering |
| Video Source Generator | Internal tool, minimal UI | User-only screen; no need for client-quality design |
| Input expansion | 10 fields (5 original + 5 new) | Raw data is fuel for rationale engine; without it, output is hollow |
| Framework | None (Vanilla JS) | Requirement constraint; single HTML simplicity |
| PDF library | jsPDF | Client-side generation; no server dependency |
| API security | Vercel serverless proxy | API key stays server-side |
| Deployment | Vercel | Unified platform for static + serverless |

---

## 5. Requirements Coverage

| ID | Category | Description | Phase | Status |
|----|----------|-------------|-------|--------|
| R1 | UI | 2-panel responsive layout | P1 | [부분검증] Planned |
| R2 | UI | Dark theme | P1 | [부분검증] Planned |
| R3 | UI | **10 input fields** (expanded) | P1 | [부분검증] Planned — **expanded from 5** |
| R4 | UI | Result area (strategy/script/storyboard tabs) | P1 | [부분검증] Planned — **added strategy tab** |
| R5 | Logic | Template-based 60s script generation | P2 | [부분검증] Planned |
| R6 | PDF | jsPDF download | P2 | [부분검증] Planned |
| R7 | UI | Copy / New buttons | P2 | [부분검증] Planned |
| R8 | Skill | 26 principles injection | P3 | [부분검증] Skill file ready; injection logic planned |
| R9 | Logic | **Product-specific rationale generation** ⭐ | P3 | [부분검증] Planned — **full redesign** |
| R10 | PDF | **Persuasion-structured proposal PDF** ⭐ | P3 | [부분검증] Planned — **full redesign** |
| R11 | API | Vercel serverless + Claude API | P4 | [부분검증] Planned |
| R12 | Security | API key server-side only | P4 | [부분검증] Planned |
| R13 | UX | Manual ↔ Auto mode toggle | P4 | [부분검증] Planned |
| R14 | UI | Video Source Generator tab | P5 | [부분검증] Planned — **internal tool** |
| R15 | Logic | Scene parsing | P5 | [부분검증] Planned |
| R16 | Logic | EN prompt generation | P5 | [부분검증] Planned |
| R17 | UX | Detail level control | P5 | [부분검증] Planned |
| R18 | UI | Per-prompt copy buttons | P5 | [부분검증] Planned |
| R19 | UX | Tab switching | P6 | [부분검증] Planned |
| R20 | Logic | "Send to #2" auto-delivery | P6 | [부분검증] Planned |
| R21 | Deploy | Vercel deployment | P6 | [부분검증] Planned |
| R22 | QA | Integration E2E test | P6 | [부분검증] Planned |
| R23 | UI | **Competitor products/differences input** | P1 | [부분검증] Planned — **NEW** |
| R24 | UI | **Price, reviews, trust factors, excluded keywords inputs** | P1 | [부분검증] Planned — **NEW** |
| R25 | PDF | **Problem diagnosis section in proposal** | P3 | [부분검증] Planned — **NEW** |
| R26 | PDF | **Expected impact section (general, not guaranteed)** | P3 | [부분검증] Planned — **NEW** |
| R27 | Logic | **Dual-mode rationale (template manual + AI auto)** | P3 | [부분검증] Planned — **NEW** |

**Note:** All 27 requirements are planned but have zero implementation. The project is in a **planning-complete, implementation-pending** state.

---

## 6. Technical Debt & Risks

### Current Debt
- **Zero implementation debt** — No code exists yet. Clean start.
- **No test infrastructure** — No testing framework, no CI/CD, no linting.

### Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `shortform-copywriting.md` runtime fetch may fail on Vercel (CWD issues) | High | Bundle file or embed as env variable; test in Vercel preview |
| Rationale engine in manual mode produces hollow template text | Medium | Clear UX signal that auto mode delivers better results; template is a stepping stone |
| Korean font rendering in jsPDF (Noto Sans KR CDN dependency) | Medium | Pre-download font subset; fallback to system font |
| Claude API rate limits in auto mode | Medium | Retry logic; clear error messages; manual mode as fallback |
| "Expected Impact" section may be misread as guaranteed results | Medium | Use conditional language ("일반적으로", "통상적으로"); include disclaimer |
| No authentication — anyone can use API endpoint | Low | Vercel URL is obscure; add rate limiting if needed |
| Vercel serverless cold start latency | Medium | Loading spinner; consider edge functions |

### Future Considerations
- Add authentication (if tool needs to be shared beyond team)
- Database persistence (currently all client-side)
- Multi-language support (currently KR + EN only)
- Client sharing link (URL-based proposal sharing)
- Video editing tool integration (out of scope for v1)

---

## 7. Getting Started

### For New Team Members

1. **Read this summary** (you're here)
2. **Read `.planning/PROJECT.md`** for vision — note the strategic shift to "전략 제안서 생성기"
3. **Read `.planning/ROADMAP.md`** for the restructured 6-phase plan
4. **Read `.planning/REQUIREMENTS.md`** for all 27 requirements with acceptance criteria
5. **Read `skills/custom/shortform-copywriting.md`** — the 26 principles are the core domain knowledge
6. **Key concept:** The project's core is Phase 3 (당위성 엔진 + 설득형 제안서). Everything else supports it.

### For Developers Starting Implementation

1. Start with **Phase 1** (UI Skeleton + Expanded Inputs) — create `index.html`, `style.css`, `app.js`
2. Implement **10 input fields** (5 original + 5 new for raw data)
3. The dark theme and 2-panel layout come first
4. Phase 3 is where the real complexity lives — plan for `rationale-engine.js` and `proposal-pdf.js`
5. Phase 5 (Video Source Generator) is internal-only — minimal UI effort

### Project Constraints to Remember

- **No frameworks** — Vanilla HTML/CSS/JS only
- **No API key on frontend** — All API calls go through `/api/generate`
- **Korean for scripts/proposals, English for video prompts** — Dual-language output
- **Manual mode is the default** — Auto mode is where the rationale engine truly shines
- **Single-page app** — Tab-based tool switching
- **Video Source Generator is internal** — Don't over-invest in its UI

### Available Resources

| Resource | Location | Purpose |
|----------|----------|---------|
| Copywriting principles | `skills/custom/shortform-copywriting.md` | 26 principles for script quality |
| Marketing skills library | `skills/marketing/` | Reference for future enhancements |
| GSD Planning | `.planning/` | ROADMAP, REQUIREMENTS, PROJECT docs |
| GSD Config | `.planning/config.json` | Workflow settings |

---

## Appendix: Copywriting Principles Summary (26 Total)

### 1. Hook Writing Principles (9 principles)
- 1-1: First 3 seconds = Visual action + Spoken line + Caption (no-duplication)
- 1-2: Curiosity gap — hide key nouns (Zeigarnik effect)
- 1-3: Bold claims — specific, falsifiable statements
- 1-4: First-person confession — lived-in details required
- 1-5: Contrast / before-after — two states in first beat
- 1-6: POV — ultra-specific situation mirroring
- 1-7: Proof-first — receipts/screenshots up front
- 1-8: Hook diversity — segment × motivation matrix
- 1-9: 15-30s structure: Hook → Problem → Solution → CTA

### 2. CTA Formulas (7 principles)
- 2-1: Strong CTA = Action Verb + What They Get
- 2-2: Single CTA, single action (Hick's Law)
- 2-3: Urgency/scarcity only when genuine
- 2-4: Conversational CTA (avoid hard-sell)
- 2-5: Social proof → CTA sequence
- 2-6: Risk reversal to reduce friction
- 2-7: End on a single CTA line

### 3. Psychological Triggers (10 principles)
- 3-1: Articulate the problem better than the customer can
- 3-2: Channel existing desires, don't create new ones
- 3-3: Loss framing (losses feel 2x stronger than gains)
- 3-4: Quantify pain with specific numbers
- 3-5: Ask the exact question buyers type into search
- 3-6: "Stop [pain]. Start [pleasure]." structure
- 3-7: Social proof for problem universality
- 3-8: Make inaction the problem
- 3-9: Pull verbatim phrases from reviews
- 3-10: Identity desire — show "who they become"

---

*This document enables new team members to understand AD SCRIPT STUDIO by reading one file. The project has been restructured (2026-07-31) to focus on the Rationale Engine and persuasion-structured proposal PDF as core value. For deeper details, read the source artifacts listed above.*
