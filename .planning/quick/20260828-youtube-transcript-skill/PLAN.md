---
slug: youtube-transcript-skill
date: 2026-08-28
status: complete
---

# Quick task: YouTube 자막추출 로직을 스킬로 저장

## Description
이전 세션에서 검증한 YouTube 자막 추출 로직(youtube-transcript-api v1.2.4)을
재사용 가능한 스킬로 만들어 다음에도 쓸 수 있게 함. 특히 v1.x API breaking
change(`list_transcripts`→`list`, `get_transcript`→`fetch`) gotcha 보관.

## Steps
1. 전체 트랜스크립트 MD 저장 검증 (transcripts/MzFUWsvKjm4.md, 4523세그먼트)
2. 글로벌 스킬 생성: ~/.config/opencode/skills/youtube-transcript-extraction/SKILL.md
   - v1.x API gotcha 테이블, 설치, 추출/MD저장 코드, Node 대안, pitfalls, output contract
3. STATE.md "Quick Tasks Completed" 테이블 추가
4. 커밋

## Result
- 스킬 생성 완료 (글로벌, 다음 세션 auto-load)
- 트랜스크립트 MD 산출물은 repo에 있으나 git add 안 함 (spike 산출물)
