import { NextRequest } from 'next/server'

export const runtime = 'edge'

// Claude API (Anthropic) 호출
async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Claude API 오류 ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// Gemini API 호출
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = 'gemini-2.0-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API 오류 ${res.status}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function extractJson(raw: string): string {
  // 마크다운 코드블록 제거
  const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // JSON 배열 추출
  const match = stripped.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('JSON 배열을 찾을 수 없습니다.')
  // 파싱 검증
  JSON.parse(match[0])
  return match[0]
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, claudeApiKey, geminiApiKey } = await req.json()

    if (!prompt) {
      return Response.json({ error: '프롬프트가 없습니다.' }, { status: 400 })
    }
    if (!claudeApiKey && !geminiApiKey) {
      return Response.json({ error: 'API 키가 없습니다. 설정에서 Claude 또는 Gemini API 키를 입력해주세요.' }, { status: 400 })
    }

    let raw = ''
    // Claude 우선, 없으면 Gemini 폴백
    if (claudeApiKey) {
      raw = await callClaude(claudeApiKey, prompt)
    } else {
      raw = await callGemini(geminiApiKey, prompt)
    }

    const json = extractJson(raw)
    return Response.json({ json })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '생성 실패'
    return Response.json({ error: msg }, { status: 500 })
  }
}
