import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 쿼터 초과 시 순서대로 폴백
const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

function isQuotaError(msg: string) {
  return msg.includes('Quota exceeded') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('limit: 0')
}
function isNotFoundError(msg: string) {
  return msg.includes('not found') || msg.includes('INVALID_ARGUMENT')
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<Response> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
  const combinedUser = systemPrompt
    ? `[시스템 지시]\n${systemPrompt}\n\n[요청]\n${userPrompt}`
    : userPrompt

  // systemInstruction 포함 시도
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
    }),
  })

  if (res.ok) return res

  const errBody = await res.json().catch(() => ({}))
  const errMsg: string = errBody?.error?.message || `HTTP ${res.status}`

  // systemInstruction 미지원 → 합쳐서 재시도
  if (errMsg.includes('systemInstruction') || errMsg.includes('Cannot find field')) {
    const retry = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: combinedUser }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
    })
    if (retry.ok) return retry
    const retryErr = await retry.json().catch(() => ({}))
    throw new Error(retryErr?.error?.message || `HTTP ${retry.status}`)
  }

  throw Object.assign(new Error(errMsg), { quota: isQuotaError(errMsg), notFound: isNotFoundError(errMsg) })
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, systemPrompt, userPrompt, model } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key가 설정되지 않았습니다. 설정 페이지에서 Gemini API Key를 입력해주세요.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 요청 모델 + 폴백 목록 구성 (중복 제거)
    const requested = model || 'gemini-1.5-flash'
    const candidates = [requested, ...FALLBACK_MODELS.filter(m => m !== requested)]

    let lastError = ''
    let quotaExhausted = false
    for (const candidate of candidates) {
      try {
        const geminiRes = await callGemini(apiKey, candidate, systemPrompt, userPrompt)
        return streamResponse(geminiRes)
      } catch (e: unknown) {
        const err = e as Error & { quota?: boolean; notFound?: boolean }
        lastError = err.message || String(e)
        if (err.quota) { quotaExhausted = true; continue }
        if (err.notFound) continue
        break
      }
    }

    const userMsg = quotaExhausted
      ? '모든 Gemini 모델의 무료 할당량이 소진되었습니다.\n\n해결 방법:\n1. 잠시 후(1분) 다시 시도\n2. 내일 재시도 (무료 할당량은 매일 자정 리셋)\n3. Google AI Studio에서 유료 플랜 업그레이드'
      : (lastError || '모든 모델에서 오류가 발생했습니다.')

    return new Response(
      JSON.stringify({ error: userMsg }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '생성 중 오류가 발생했습니다.'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function streamResponse(geminiRes: Response): Response {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const readable = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr || jsonStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(jsonStr)
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) controller.enqueue(encoder.encode(text))
          } catch { /* ignore */ }
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
