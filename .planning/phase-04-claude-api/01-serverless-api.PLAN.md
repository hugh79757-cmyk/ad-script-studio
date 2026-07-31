# PLAN — Wave 1: 서버리스 함수 + 설정

> Phase: 4
> Wave: 1
> Requirements: R11, R12

---

## Goal

Vercel 서버리스 함수에서 Anthropic Claude API를 호출하는 백엔드 인프라 구축

---

## Tasks

### Task 1: api/generate.js 생성

**Description:** Vercel 서버리스 함수 생성 — Anthropic Claude API 호출

**Implementation:**
```javascript
// api/generate.js
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inputs, mode } = req.body;

  // API 키 검증
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // 시스템 프롬프트 구성 (26원칙 포함)
  const systemPrompt = buildSystemPrompt(inputs);

  // Claude API 호출
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: generateUserPrompt(inputs)
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const result = parseApiResponse(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Functions to implement:**
1. `buildSystemPrompt(inputs)` — 26원칙 + 입력값 컨텍스트를 시스템 프롬프트에 주입
2. `generateUserPrompt(inputs)` — 사용자 프롬프트 생성 (당위성 근거 생성 요청)
3. `parseApiResponse(data)` — API 응답 파싱 (전략 개요, 대본, 당위성 근거)

**Acceptance Criteria:**
- [ ] POST /api/generate 호출 시 Claude API 응답 반환
- [ ] API 키가 프론트엔드에 노출되지 않음
- [ ] 에러 시 적절한 에러 메시지 반환

---

### Task 2: vercel.json 설정

**Description:** Vercel 배포 설정

**Implementation:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "*.html",
      "use": "@vercel/static"
    },
    {
      "src": "*.js",
      "use": "@vercel/static"
    },
    {
      "src": "*.css",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] `vercel.json` 파일 생성
- [ ] API 라우팅 설정 완료

---

## Dependencies

None (first wave)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `api/generate.js` | CREATE |
| `vercel.json` | CREATE |

---

## Verification

- `curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"inputs": {...}, "mode": "auto"}'` → Claude API 응답 확인
